import { afterAll, describe, expect, it, vi } from 'vitest'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/auth', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/auth')>()
  return { ...actual, requireAgent: vi.fn(), currentStakeholder: vi.fn(), authorizeInspection: vi.fn(actual.authorizeInspection) }
})

import { db } from '@/lib/db'
import {
  agentTenancies, authorizeAddendum, authorizeInspection, authorizeRoom, authorizeTenancy, currentStakeholder,
  inspectionScope, requireAgent,
} from '@/lib/auth'
import { authorizeMaintenanceCase } from '@/lib/maintenance'
import { tenancyAccess } from '@/lib/tenancy-access'
import { revokeReportLink, shareReport, startCheckOut } from '@/lib/actions'
import { addTenancyCollaborator, removeTenancyCollaborator } from '@/lib/tenancy-access-actions'
import { GET, POST } from '@/app/api/v1/tenancies/[id]/access/route'
import { DELETE } from '@/app/api/v1/tenancies/[id]/access/[stakeholderId]/route'
import type { Stakeholder } from '@/generated/prisma'

const tag = randomUUID()
const people: string[] = []
const properties: string[] = []

async function person(label: string) {
  const stakeholder = await db.stakeholder.create({
    data: { name: `${label} ${tag}`, email: `${label.toLowerCase()}-${randomUUID()}@example.test` },
  })
  people.push(stakeholder.id)
  return stakeholder
}

async function deal(owner?: Stakeholder) {
  const lead = owner ?? await person('Lead')
  const landlord = await person('Landlord')
  const tenant = await person('Tenant')
  const property = await db.property.create({
    data: { line1: `Private tenancy ${tag}`, postalCode: '995521', type: 'HDB' },
  })
  properties.push(property.id)
  const tenancy = await db.tenancy.create({
    data: {
      propertyId: property.id, agentId: lead.id, landlordId: landlord.id, tenantId: tenant.id,
      startDate: new Date('2026-01-01'), endDate: new Date('2099-01-01'), monthlyRent: '3000', deposit: '6000',
      inspections: { create: { kind: 'CHECK_IN', conductedById: lead.id } },
    },
    include: { inspections: true },
  })
  return { lead, landlord, tenant, tenancy, inspection: tenancy.inspections[0] }
}

function as(stakeholder: Stakeholder) {
  vi.mocked(requireAgent).mockResolvedValue(stakeholder)
  vi.mocked(currentStakeholder).mockResolvedValue(stakeholder)
}

function request(id: string, method = 'GET', email?: string) {
  return new Request(`http://kivilo.test/api/v1/tenancies/${id}/access`, {
    method, ...(email === undefined ? {} : { body: JSON.stringify({ email }) }),
  })
}

afterAll(async () => {
  await db.property.deleteMany({ where: { id: { in: properties } } })
  await db.stakeholder.deleteMany({ where: { id: { in: people } } })
  await db.$disconnect()
})

describe('selected tenancy collaboration', () => {
  it.each(['share', 'revoke'] as const)('refuses %s after access is removed between the initial read and report lock', async (action) => {
    const { lead, tenancy, inspection } = await deal()
    const collaborator = await person('Departing')
    as(lead)
    await addTenancyCollaborator(tenancy.id, collaborator.email!)
    const originalToken = action === 'revoke' ? randomUUID() : null
    await db.inspection.update({ where: { id: inspection.id }, data: { status: 'COMPLETED', shareToken: originalToken } })
    as(collaborator)
    const authorize = vi.mocked(authorizeInspection)
    const original = authorize.getMockImplementation()!
    const previouslyAuthorized = await original(inspection.id, collaborator.id)
    authorize.mockImplementationOnce(async () => {
      await db.tenancyCollaborator.delete({ where: { tenancyId_stakeholderId: { tenancyId: tenancy.id, stakeholderId: collaborator.id } } })
      return previouslyAuthorized
    })
    await expect((action === 'share' ? shareReport : revokeReportLink)(inspection.id)).rejects.toThrow('Inspection not found')
    expect((await db.inspection.findUniqueOrThrow({ where: { id: inspection.id } })).shareToken).toBe(originalToken)
  })

  it('grants one tenancy, reuses its existing person, and keeps other deals private', async () => {
    const shared = await deal()
    const privateDeal = await deal(shared.lead)
    const collaborator = await person('Collaborator')
    as(shared.lead)

    expect(await tenancyAccess(shared.tenancy.id, shared.lead.id)).toMatchObject({
      visibility: 'PRIVATE', canManageAccess: true, collaborators: [],
    })
    const view = await addTenancyCollaborator(shared.tenancy.id, `  ${collaborator.email!.toUpperCase()}  `)
    expect(view).toMatchObject({
      visibility: 'SHARED', canManageAccess: true,
      collaborators: [{ stakeholderId: collaborator.id, name: collaborator.name, email: collaborator.email }],
    })
    const duplicate = await addTenancyCollaborator(shared.tenancy.id, collaborator.email!)
    expect(duplicate).toEqual(view)
    expect(await tenancyAccess(shared.tenancy.id, collaborator.id)).toMatchObject({ canManageAccess: false })
    const visible = await db.inspection.findMany({ where: inspectionScope(collaborator.id), select: { id: true } })
    expect(visible).toEqual([{ id: shared.inspection.id }])
    await expect(authorizeInspection(privateDeal.inspection.id, collaborator.id)).rejects.toThrow('Inspection not found')
  })

  it('accepts a new mailbox without disclosing whether it already has an account', async () => {
    const { lead, tenancy } = await deal()
    const email = `new-collaborator-${randomUUID()}@example.test`
    as(lead)
    const result = await POST(request(tenancy.id, 'POST', email), { params: Promise.resolve({ id: tenancy.id }) })
    expect(result.status).toBe(200)
    const view = await result.json()
    const stakeholder = await db.stakeholder.findUniqueOrThrow({ where: { email } })
    people.push(stakeholder.id)
    expect(stakeholder.authUserId).toBeNull()
    expect(view.collaborators[0]).toEqual({
      stakeholderId: stakeholder.id, email, name: email.split('@')[0], addedAt: expect.any(String),
    })
    expect(view.collaborators[0]).not.toHaveProperty('authUserId')
    expect(await db.tenancyCollaborator.findUniqueOrThrow({
      where: { tenancyId_stakeholderId: { tenancyId: tenancy.id, stakeholderId: stakeholder.id } },
    })).toMatchObject({ grantedById: lead.id })
  })

  it('allows only the lead to manage access and gives outsiders the missing-id response', async () => {
    const { lead, landlord, tenant, tenancy } = await deal()
    const collaborator = await person('Allowed')
    const outsider = await person('Stranger')
    as(lead)
    await addTenancyCollaborator(tenancy.id, collaborator.email!)

    for (const viewer of [collaborator, outsider, landlord, tenant]) {
      as(viewer)
      await expect(addTenancyCollaborator(tenancy.id, outsider.email!)).rejects.toThrow('Tenancy not found')
      await expect(removeTenancyCollaborator(tenancy.id, collaborator.id)).rejects.toThrow('Tenancy not found')
      const denied = await POST(request(tenancy.id, 'POST', outsider.email!), { params: Promise.resolve({ id: tenancy.id }) })
      expect(denied.status).toBe(404)
      expect(await denied.json()).toEqual({ error: 'not_found' })
      const removed = await DELETE(request(tenancy.id, 'DELETE'), {
        params: Promise.resolve({ id: tenancy.id, stakeholderId: collaborator.id }),
      })
      expect(removed.status).toBe(404)
    }
    as(outsider)
    for (const id of [tenancy.id, 'missing-tenancy']) {
      const response = await GET(request(id), { params: Promise.resolve({ id }) })
      expect(response.status).toBe(404)
      expect(await response.json()).toEqual({ error: 'not_found' })
    }
    for (const party of [landlord, tenant]) {
      await expect(tenancyAccess(tenancy.id, party.id)).rejects.toThrow('Tenancy not found')
    }
  })

  it('rejects malformed emails, the lead and the tenancy parties without changing access', async () => {
    const { lead, landlord, tenant, tenancy } = await deal()
    as(lead)
    for (const email of ['broken', lead.email!, landlord.email!, tenant.email!]) {
      const response = await POST(request(tenancy.id, 'POST', email), { params: Promise.resolve({ id: tenancy.id }) })
      expect(response.status).toBe(400)
      expect(await response.json()).toEqual({ error: 'invalid_request' })
    }
    await expect(removeTenancyCollaborator(tenancy.id, lead.id)).rejects.toThrow('The lead agent cannot be removed')
    expect((await tenancyAccess(tenancy.id, lead.id)).visibility).toBe('PRIVATE')
  })

  it('revokes every working path even when the collaborator conducted the inspection', async () => {
    const { lead, tenancy, inspection } = await deal()
    const collaborator = await person('Conductor')
    const room = await db.room.create({ data: { inspectionId: inspection.id, name: 'Kitchen', order: 0 } })
    const addendum = await db.reportAddendum.create({
      data: { inspectionId: inspection.id, title: 'Updated appliance', effectiveDate: new Date(), createdById: lead.id },
    })
    const repair = await db.maintenanceCase.create({
      data: { tenancyId: tenancy.id, reportedById: lead.id, category: 'PLUMBING', title: 'Tap leak', description: 'Leaking tap' },
    })
    await db.inspection.update({ where: { id: inspection.id }, data: { conductedById: collaborator.id } })
    as(lead)
    await addTenancyCollaborator(tenancy.id, collaborator.email!)
    await expect(authorizeRoom(room.id, collaborator.id)).resolves.toBeTruthy()
    await expect(authorizeAddendum(addendum.id, collaborator.id)).resolves.toBeTruthy()
    await expect(authorizeMaintenanceCase(repair.id, collaborator.id)).resolves.toMatchObject({ role: 'AGENT' })

    expect(await removeTenancyCollaborator(tenancy.id, collaborator.id)).toMatchObject({ visibility: 'PRIVATE' })
    await expect(authorizeInspection(inspection.id, collaborator.id)).rejects.toThrow('Inspection not found')
    await expect(authorizeRoom(room.id, collaborator.id)).rejects.toThrow('Inspection not found')
    await expect(authorizeAddendum(addendum.id, collaborator.id)).rejects.toThrow('Addendum not found')
    await expect(authorizeMaintenanceCase(repair.id, collaborator.id)).rejects.toThrow('Maintenance case not found')
    expect((await db.inspection.findUniqueOrThrow({ where: { id: inspection.id } })).conductedById).toBe(collaborator.id)
  })

  it('lets the lead manage historical access without sharing another term of the property', async () => {
    const { lead, tenancy, inspection } = await deal()
    const collaborator = await person('Historian')
    await db.tenancy.update({ where: { id: tenancy.id }, data: { endDate: new Date('2020-01-01') } })
    const otherTerm = await db.tenancy.create({
      data: {
        propertyId: tenancy.propertyId, agentId: lead.id, landlordId: tenancy.landlordId, tenantId: tenancy.tenantId,
        startDate: new Date('2026-01-01'), endDate: new Date('2099-01-01'), monthlyRent: '3000', deposit: '6000',
        inspections: { create: { kind: 'CHECK_IN' } },
      },
      include: { inspections: true },
    })
    as(lead)
    await addTenancyCollaborator(tenancy.id, collaborator.email!)
    await expect(authorizeInspection(inspection.id, collaborator.id)).resolves.toBeTruthy()
    await expect(authorizeInspection(otherTerm.inspections[0].id, collaborator.id)).rejects.toThrow('Inspection not found')
    expect((await tenancyAccess(tenancy.id, collaborator.id)).visibility).toBe('SHARED')
    await removeTenancyCollaborator(tenancy.id, collaborator.id)
    await expect(tenancyAccess(tenancy.id, collaborator.id)).rejects.toThrow('Tenancy not found')
  })

  it('preserves exact historical inspection access without revealing siblings or other collaborators', async () => {
    const { lead, tenancy, inspection } = await deal()
    const conductor = await person('Legacy')
    const otherConductor = await person('OtherLegacy')
    const fullCollaborator = await person('FullAccess')
    const checkOut = await db.inspection.create({
      data: {
        tenancyId: tenancy.id, kind: 'CHECK_OUT', conductedById: conductor.id,
        accessGrants: { create: { stakeholderId: conductor.id } },
        rooms: { create: { name: 'Legacy room', order: 0 } },
      },
      include: { rooms: true },
    })
    await db.inspectionAccessGrant.create({ data: { inspectionId: inspection.id, stakeholderId: otherConductor.id } })
    await db.tenancyCollaborator.create({ data: { tenancyId: tenancy.id, stakeholderId: fullCollaborator.id, grantedById: lead.id } })
    await expect(authorizeInspection(checkOut.id, conductor.id)).resolves.toBeTruthy()
    await expect(authorizeRoom(checkOut.rooms[0].id, conductor.id)).resolves.toBeTruthy()
    await expect(authorizeInspection(inspection.id, conductor.id)).rejects.toThrow('Inspection not found')
    await expect(authorizeTenancy(tenancy.id, conductor.id)).rejects.toThrow('Tenancy not found')
    const view = await tenancyAccess(tenancy.id, conductor.id)
    expect(view).toMatchObject({ visibility: 'SHARED', scope: 'INSPECTION', canManageAccess: false, collaborators: [] })
    expect(view.inspectionOnly).toEqual([{
      stakeholderId: conductor.id, name: conductor.name, email: conductor.email, inspectionIds: [checkOut.id],
    }])
    expect(JSON.stringify(view)).not.toContain(inspection.id)
    expect(JSON.stringify(view)).not.toContain(otherConductor.email)
    expect(JSON.stringify(view)).not.toContain(fullCollaborator.email)
    expect((await tenancyAccess(tenancy.id, lead.id)).inspectionOnly).toHaveLength(2)

    as(conductor)
    await expect(removeTenancyCollaborator(tenancy.id, conductor.id)).rejects.toThrow('Tenancy not found')
    as(lead)
    await removeTenancyCollaborator(tenancy.id, conductor.id)
    await expect(authorizeInspection(checkOut.id, conductor.id)).rejects.toThrow('Inspection not found')
    await expect(tenancyAccess(tenancy.id, conductor.id)).rejects.toThrow('Tenancy not found')
    await expect(authorizeInspection(inspection.id, otherConductor.id)).resolves.toBeTruthy()
  })

  it('upgrades old inspection access explicitly and removes all grants together', async () => {
    const { lead, tenancy, inspection } = await deal()
    const conductor = await person('Upgrade')
    await db.inspectionAccessGrant.create({ data: { inspectionId: inspection.id, stakeholderId: conductor.id } })
    as(lead)
    const granted = await addTenancyCollaborator(tenancy.id, conductor.email!)
    expect(granted.collaborators.map(({ stakeholderId }) => stakeholderId)).toEqual([conductor.id])
    expect(granted.inspectionOnly).toEqual([])
    expect(await db.inspectionAccessGrant.count({ where: { stakeholderId: conductor.id } })).toBe(0)
    expect((await tenancyAccess(tenancy.id, conductor.id)).scope).toBe('TENANCY')
    await expect(authorizeTenancy(tenancy.id, conductor.id)).resolves.toMatchObject({ role: 'AGENT' })
    // A historical duplicate left by an earlier deployment cannot survive removal.
    await db.inspectionAccessGrant.create({ data: { inspectionId: inspection.id, stakeholderId: conductor.id } })
    await removeTenancyCollaborator(tenancy.id, conductor.id)
    expect(await db.inspectionAccessGrant.count({ where: { stakeholderId: conductor.id } })).toBe(0)
    await expect(authorizeInspection(inspection.id, conductor.id)).rejects.toThrow('Inspection not found')
  })

  it('keeps a historical inspection with no lead readable without allowing access management', async () => {
    const { tenancy, inspection } = await deal()
    const conductor = await person('OwnerlessLegacy')
    await db.tenancy.update({ where: { id: tenancy.id }, data: { agentId: null } })
    await db.inspectionAccessGrant.create({ data: { inspectionId: inspection.id, stakeholderId: conductor.id } })
    expect(await tenancyAccess(tenancy.id, conductor.id)).toMatchObject({
      scope: 'INSPECTION', leadAgent: null, canManageAccess: false,
    })
    as(conductor)
    await expect(addTenancyCollaborator(tenancy.id, conductor.email!)).rejects.toThrow('Tenancy not found')
  })

  it('requires full tenancy access to create a check-out, including after the tenancy ends', async () => {
    const { lead, tenancy, inspection } = await deal()
    const collaborator = await person('CheckOutCollaborator')
    await db.tenancy.update({ where: { id: tenancy.id }, data: { endDate: new Date('2020-01-01') } })
    await db.inspection.update({ where: { id: inspection.id }, data: { status: 'COMPLETED' } })
    await db.inspectionAccessGrant.create({ data: { inspectionId: inspection.id, stakeholderId: collaborator.id } })
    as(collaborator)
    await expect(startCheckOut(inspection.id)).rejects.toThrow('Inspection not found')
    expect(await db.inspection.count({ where: { tenancyId: tenancy.id } })).toBe(1)
    as(lead)
    await addTenancyCollaborator(tenancy.id, collaborator.email!)
    as(collaborator)
    const checkOutId = await startCheckOut(inspection.id)
    await expect(authorizeInspection(checkOutId, collaborator.id)).resolves.toMatchObject({ kind: 'CHECK_OUT' })
  })

  it('backfills teammates and exact conductor inspections once without broadening old permissions', async () => {
    const migration = readFileSync('prisma/migrations/20261021130000_tenancy_collaborators/migration.sql', 'utf8')
    const backfills = migration.match(/INSERT INTO "(?:TenancyCollaborator|InspectionAccessGrant)"[\s\S]+?;/g)!
    expect(backfills).toHaveLength(2)
    const rollback = new Error('Roll back migration fixture')
    await expect(db.$transaction(async (tx) => {
      const team = await tx.team.create({ data: { name: `Backfill ${tag}` } })
      const lead = await tx.stakeholder.create({ data: { name: 'Backfill lead', teamId: team.id } })
      const teammate = await tx.stakeholder.create({ data: { name: 'Backfill teammate', teamId: team.id } })
      const conductor = await tx.stakeholder.create({ data: { name: 'Backfill conductor' } })
      const landlord = await tx.stakeholder.create({ data: { name: 'Backfill landlord' } })
      const tenant = await tx.stakeholder.create({ data: { name: 'Backfill tenant' } })
      const property = await tx.property.create({ data: { line1: 'Backfill', postalCode: '995521', type: 'HDB' } })
      const common = {
        propertyId: property.id, landlordId: landlord.id, tenantId: tenant.id,
        startDate: new Date('2026-01-01'), endDate: new Date('2099-01-01'), monthlyRent: '1', deposit: '1',
      }
      const owned = await tx.tenancy.create({ data: {
        ...common, agentId: lead.id,
        inspections: { create: [
          { kind: 'CHECK_IN', conductedById: lead.id },
          { kind: 'CHECK_OUT', conductedById: conductor.id },
          { kind: 'CHECK_OUT', conductedById: teammate.id },
        ] },
      }, include: { inspections: true } })
      const ownerless = await tx.tenancy.create({ data: {
        ...common, inspections: { create: { kind: 'CHECK_IN', conductedById: conductor.id } },
      }, include: { inspections: true } })
      for (let run = 0; run < 2; run++) {
        for (const backfill of backfills) await tx.$executeRawUnsafe(backfill)
      }
      const rows = await tx.tenancyCollaborator.findMany({
        where: { tenancyId: { in: [owned.id, ownerless.id] } },
        select: { tenancyId: true, stakeholderId: true, grantedById: true },
      })
      expect(rows).toEqual([
        { tenancyId: owned.id, stakeholderId: teammate.id, grantedById: null },
      ])
      const exact = await tx.inspectionAccessGrant.findMany({
        where: { inspection: { tenancyId: { in: [owned.id, ownerless.id] } } },
        select: { inspectionId: true, stakeholderId: true },
      })
      expect(exact).toHaveLength(2)
      expect(exact).toEqual(expect.arrayContaining([
        { inspectionId: owned.inspections.find(({ conductedById }) => conductedById === conductor.id)!.id, stakeholderId: conductor.id },
        { inspectionId: ownerless.inspections[0].id, stakeholderId: conductor.id },
      ]))
      expect(await tx.inspection.findMany({ where: inspectionScope(conductor.id), select: { id: true } }))
        .toHaveLength(2)
      expect(await tx.tenancy.count({ where: agentTenancies(conductor.id) })).toBe(0)
      throw rollback
    })).rejects.toBe(rollback)
  })
})
