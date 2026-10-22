import { randomUUID } from 'node:crypto'
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest'

const originals = vi.hoisted(() => ({ authorizeInspection: undefined as typeof import('@/lib/auth').authorizeInspection | undefined }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/auth', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/auth')>()
  originals.authorizeInspection = actual.authorizeInspection
  return { ...actual, requireAgent: vi.fn(), currentStakeholder: vi.fn(), authorizeInspection: vi.fn(actual.authorizeInspection) }
})

import { db } from '@/lib/db'
import { authorizeInspection, authorizeRoom, currentStakeholder, requireAgent } from '@/lib/auth'
import { propertyManagement, managedProperties } from '@/lib/property-management'
import { updatePropertyLifecycle } from '@/lib/property-actions'
import { purgeExpiredProperty } from '@/lib/property-trash'
import { inspectionWorkScope } from '@/lib/inspection-work'
import { completeReview } from '@/lib/actions'
import { createPropertyAsset, createMaintenanceCase } from '@/lib/maintenance'
import { workspacePlan } from '@/lib/plan'
import { GET, PATCH } from '@/app/api/v1/properties/[id]/route'
import { GET as inspectionList } from '@/app/api/v1/inspections/route'
import type { Stakeholder } from '@/generated/prisma'

const properties: string[] = []
const people: string[] = []
const agencies: string[] = []
const purgePaths: string[] = []

async function person() {
  const row = await db.stakeholder.create({ data: { name: 'Property lifecycle test', email: `property-${randomUUID()}@example.test` } })
  people.push(row.id)
  return row
}

async function fixture(lead?: Stakeholder) {
  lead ??= await person()
  const landlord = await person()
  const tenant = await person()
  const property = await db.property.create({ data: { line1: `Test property ${randomUUID()}`, postalCode: '998822', type: 'HDB' } })
  properties.push(property.id)
  const tenancy = await db.tenancy.create({ data: {
    propertyId: property.id, agentId: lead.id, landlordId: landlord.id, tenantId: tenant.id,
    startDate: new Date('2026-01-01'), endDate: new Date('2099-01-01'), monthlyRent: '1000', deposit: '1000',
    inspections: { create: { kind: 'CHECK_IN', conductedById: lead.id, rooms: { create: { name: 'Kitchen', order: 0, status: 'REVIEWED' } } } },
  }, include: { inspections: { include: { rooms: true } } } })
  const inspection = tenancy.inspections[0]
  const room = inspection.rooms[0]
  purgePaths.push(room.id)
  return { lead, landlord, tenant, property, tenancy, inspection, room }
}

function as(actor: Stakeholder) {
  vi.mocked(requireAgent).mockResolvedValue(actor)
  vi.mocked(currentStakeholder).mockResolvedValue(actor)
}

async function trash(row: Awaited<ReturnType<typeof fixture>>) {
  as(row.lead)
  const detail = await propertyManagement(row.property.id, row.lead.id)
  return updatePropertyLifecycle(row.property.id, { action: 'trash', confirmation: detail.confirmationLabel })
}

afterEach(() => { vi.mocked(authorizeInspection).mockImplementation(originals.authorizeInspection!) })
afterAll(async () => {
  await db.property.deleteMany({ where: { id: { in: properties } } })
  await db.agency.deleteMany({ where: { id: { in: agencies } } })
  await db.stakeholder.deleteMany({ where: { id: { in: people } } })
  await db.storagePurge.deleteMany({ where: { path: { in: purgePaths } } })
  await db.$disconnect()
})

describe('property lifecycle and recovery', () => {
  it('archives from active work without changing evidence or signed-report access, and unarchives', async () => {
    const row = await fixture()
    as(row.lead)
    await db.inspection.update({ where: { id: row.inspection.id }, data: { status: 'COMPLETED' } })
    expect((await propertyManagement(row.property.id, row.lead.id)).canDelete).toBe(false)
    expect(await updatePropertyLifecycle(row.property.id, { action: 'archive' })).toMatchObject({ state: 'ARCHIVED', canManage: true })
    expect(await db.inspection.count({ where: inspectionWorkScope(row.lead.id) })).toBe(0)
    expect(await db.inspection.count({ where: inspectionWorkScope(row.lead.id, { state: 'archived' }) })).toBe(1)
    await expect(authorizeInspection(row.inspection.id, row.lead.id)).resolves.toBeTruthy()
    expect((await managedProperties(row.lead.id, 'archived')).properties).toHaveLength(1)
    await updatePropertyLifecycle(row.property.id, { action: 'unarchive' })
    expect(await db.inspection.count({ where: inspectionWorkScope(row.lead.id) })).toBe(1)
  })

  it('keeps all draft rows and media during the 30-day recovery period, blocks working access, and restores', async () => {
    const row = await fixture()
    const capture = await db.capture.create({ data: { roomId: row.room.id, kind: 'PHOTO', storagePath: `${row.room.id}/photo.jpg`, mimeType: 'image/jpeg', sizeBytes: 4 } })
    const before = await workspacePlan(row.lead)
    const removed = await trash(row)
    expect(removed).toMatchObject({ state: 'TRASHED', counts: { photos: 1, tenancies: 1, inspections: 1 } })
    expect(Date.parse(removed.trashExpiresAt!) - Date.parse(removed.trashedAt!)).toBe(30 * 86400_000)
    expect(await db.capture.findUnique({ where: { id: capture.id } })).toBeTruthy()
    expect(await db.storagePurge.count({ where: { path: row.room.id } })).toBe(0)
    expect(await purgeExpiredProperty(row.property.id)).toBe('not_due')
    await expect(authorizeRoom(row.room.id, row.lead.id)).rejects.toThrow('Inspection not found')
    expect((await workspacePlan(row.lead)).active).toBe(before.active - 1)
    expect((await managedProperties(row.lead.id, 'trash')).properties).toHaveLength(1)
    await updatePropertyLifecycle(row.property.id, { action: 'restore' })
    await expect(authorizeRoom(row.room.id, row.lead.id)).resolves.toBeTruthy()
    expect(await db.capture.findUnique({ where: { id: capture.id } })).toBeTruthy()
  })

  it('requires exact confirmation and rejects collaborators, parties and missing ids identically', async () => {
    const row = await fixture()
    const collaborator = await person()
    await db.tenancyCollaborator.create({ data: { tenancyId: row.tenancy.id, stakeholderId: collaborator.id } })
    as(row.lead)
    const invalid = await PATCH(new Request('http://localhost/api/v1/properties/test', { method: 'PATCH', body: JSON.stringify({ action: 'trash', confirmation: 'wrong address' }) }), { params: Promise.resolve({ id: row.property.id }) })
    expect(invalid.status).toBe(400)
    for (const actor of [collaborator, row.landlord, row.tenant, await person()]) {
      as(actor)
      for (const id of [row.property.id, 'missing']) {
        const response = await PATCH(new Request('http://localhost/api/v1/properties/test', { method: 'PATCH', body: JSON.stringify({ action: 'archive' }) }), { params: Promise.resolve({ id }) })
        expect(response.status).toBe(404)
        expect(await response.json()).toEqual({ error: 'not_found' })
      }
    }
    as(collaborator)
    expect((await propertyManagement(row.property.id, collaborator.id)).canManage).toBe(false)
    await trash(row)
    as(collaborator)
    const hidden = await GET(new Request('http://localhost/api/v1/properties/test'), { params: Promise.resolve({ id: row.property.id }) })
    expect(hidden.status).toBe(404)
    await expect(propertyManagement(row.property.id, collaborator.id)).rejects.toThrow('Property not found')
  })

  it('does not let a landlord create new assets or repairs after a draft property is trashed', async () => {
    const row = await fixture()
    await trash(row)
    await expect(createPropertyAsset(row.property.id, row.landlord.id, { name: 'Unregistered fridge', category: 'APPLIANCE' }))
      .rejects.toThrow('Property not found')
    await expect(createMaintenanceCase(row.tenancy.id, row.landlord.id, { title: 'Leak', description: 'Leaking tap', category: 'PLUMBING' }))
      .rejects.toThrow('Tenancy not found')
    expect(await db.propertyAsset.count({ where: { propertyId: row.property.id } })).toBe(0)
    expect(await db.maintenanceCase.count({ where: { tenancyId: row.tenancy.id } })).toBe(0)
  })

  it('requires authority over every tenancy and does not disclose hidden terms', async () => {
    const row = await fixture()
    const other = await person()
    await db.tenancy.create({ data: {
      propertyId: row.property.id, landlordId: row.landlord.id, tenantId: row.tenant.id, agentId: other.id,
      startDate: new Date('2020-01-01'), endDate: new Date('2021-01-01'), monthlyRent: '1000', deposit: '1000',
      inspections: { create: { kind: 'CHECK_IN' } },
    } })
    const detail = await propertyManagement(row.property.id, row.lead.id)
    expect(detail).toMatchObject({ canManage: false, counts: { tenancies: 1, inspections: 1 } })
    as(row.lead)
    await expect(updatePropertyLifecycle(row.property.id, { action: 'archive' })).rejects.toThrow('Property not found')
  })

  it.each(['AWAITING_SIGNATURE', 'COMPLETED'] as const)('preserves %s reports', async (status) => {
    const row = await fixture()
    await db.inspection.update({ where: { id: row.inspection.id }, data: { status } })
    await expect(trash(row)).rejects.toThrow('records that must be preserved')
    expect((await db.property.findUniqueOrThrow({ where: { id: row.property.id } })).trashedAt).toBeNull()
  })

  it('preserves shared report history and repair records even when an inspection is draft', async () => {
    const shared = await fixture()
    await db.inspection.update({ where: { id: shared.inspection.id }, data: { shareToken: randomUUID(), sharedAt: new Date() } })
    await expect(trash(shared)).rejects.toThrow('records that must be preserved')
    const repaired = await fixture()
    await db.maintenanceCase.create({ data: { tenancyId: repaired.tenancy.id, reportedById: repaired.tenant.id, category: 'PLUMBING', title: 'Leak', description: 'Leaking tap' } })
    await expect(trash(repaired)).rejects.toThrow('records that must be preserved')
  })

  it('rechecks after the inspection lock when a previously authorized Send races with trash', async () => {
    const row = await fixture()
    as(row.lead)
    let signalAuthorized!: () => void
    let resume!: () => void
    const authorized = new Promise<void>((resolve) => { signalAuthorized = resolve })
    const paused = new Promise<void>((resolve) => { resume = resolve })
    vi.mocked(authorizeInspection).mockImplementationOnce(async (...args) => {
      const result = await originals.authorizeInspection!(...args)
      signalAuthorized()
      await paused
      return result
    })
    const send = completeReview(row.inspection.id)
    await authorized
    await trash(row)
    resume()
    await expect(send).rejects.toThrow('Inspection not found')
    expect((await db.inspection.findUniqueOrThrow({ where: { id: row.inspection.id } })).status).toBe('DRAFT')
    expect(await db.reportEmail.count({ where: { inspectionId: row.inspection.id } })).toBe(0)
  })

  it('purges only expired drafts and creates durable delayed media tombstones', async () => {
    const row = await fixture()
    await trash(row)
    const expires = new Date(Date.now() - 1000)
    await db.property.update({ where: { id: row.property.id }, data: { trashExpiresAt: expires } })
    await expect(updatePropertyLifecycle(row.property.id, { action: 'restore' })).rejects.toThrow('recovery period has ended')
    expect(await purgeExpiredProperty(row.property.id)).toBe('deleted')
    expect(await db.property.findUnique({ where: { id: row.property.id } })).toBeNull()
    expect(await db.inspection.findUnique({ where: { id: row.inspection.id } })).toBeNull()
    const tombstone = await db.storagePurge.findUniqueOrThrow({ where: { path: row.room.id } })
    expect(tombstone.isPrefix).toBe(true)
    expect(tombstone.readyAt.getTime()).toBeGreaterThan(Date.now() + 2 * 3600_000)
    expect(tombstone.completedAt).toBeNull()
    expect(await purgeExpiredProperty(row.property.id)).toBe('not_due')
    const protectedRow = await fixture()
    await trash(protectedRow)
    await db.property.update({ where: { id: protectedRow.property.id }, data: { trashExpiresAt: expires } })
    await db.inspection.update({ where: { id: protectedRow.inspection.id }, data: { status: 'COMPLETED' } })
    expect(await purgeExpiredProperty(protectedRow.property.id)).toBe('protected')
    expect(await db.property.findUnique({ where: { id: protectedRow.property.id } })).toBeTruthy()
  })

  it('separates My work from managed Team work and keeps agency filters scoped', async () => {
    const owner = await person()
    const member = await person()
    const row = await fixture(member)
    const personal = await fixture(member)
    const agency = await db.agency.create({ data: { name: 'Work filters', members: { create: [
      { stakeholderId: owner.id, role: 'OWNER', status: 'ACTIVE' },
      { stakeholderId: member.id, role: 'AGENT', status: 'ACTIVE' },
    ] } } })
    agencies.push(agency.id)
    await db.tenancy.update({ where: { id: row.tenancy.id }, data: { agencyId: agency.id } })
    as(owner)
    const response = await inspectionList(new Request(`http://localhost/api/v1/inspections?agencyId=${agency.id}`), { params: Promise.resolve({}) })
    expect((await response.json()).map((item: { id: string }) => item.id)).toEqual([row.inspection.id])
    expect(await db.inspection.count({ where: inspectionWorkScope(owner.id) })).toBe(0)
    expect(await db.inspection.count({ where: inspectionWorkScope(owner.id, { agencyId: agency.id, assigneeId: member.id }) })).toBe(1)
    expect(await db.inspection.count({ where: inspectionWorkScope((await person()).id, { agencyId: agency.id }) })).toBe(0)
    await expect(authorizeInspection(personal.inspection.id, owner.id)).rejects.toThrow('Inspection not found')
    as(owner)
    expect(await updatePropertyLifecycle(row.property.id, { action: 'archive' })).toMatchObject({ state: 'ARCHIVED' })
  })
})
