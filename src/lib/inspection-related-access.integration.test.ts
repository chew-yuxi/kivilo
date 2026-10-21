import { randomUUID } from 'node:crypto'
import { isValidElement } from 'react'
import { afterAll, describe, expect, it, vi } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/headers', () => ({ headers: async () => new Headers() }))
vi.mock('@/lib/auth', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/auth')>()
  return { ...actual, currentStakeholder: vi.fn(), requireAgent: vi.fn() }
})

import { db } from '@/lib/db'
import { currentStakeholder, requireAgent } from '@/lib/auth'
import { createFinding, updateFinding } from '@/lib/actions'
import { GET } from '@/app/api/v1/inspections/[id]/route'
import InspectionPage from '@/app/(app)/inspections/[id]/page'
import type { Stakeholder } from '@/generated/prisma'

const propertyIds: string[] = []
const stakeholderIds: string[] = []

function as(person: Stakeholder) {
  vi.mocked(currentStakeholder).mockResolvedValue(person)
  vi.mocked(requireAgent).mockResolvedValue(person)
}

async function fixture() {
  const tag = randomUUID()
  const [lead, landlord, tenant, checkInViewer, checkOutViewer] = await Promise.all(
    ['lead', 'landlord', 'tenant', 'check-in viewer', 'check-out viewer'].map(async (role) => {
      const person = await db.stakeholder.create({ data: { name: `${role} ${tag}` } })
      stakeholderIds.push(person.id)
      return person
    }),
  )
  const property = await db.property.create({ data: { line1: `Related access ${tag}`, postalCode: '995582', type: 'HDB' } })
  propertyIds.push(property.id)
  const tenancy = await db.tenancy.create({ data: {
    propertyId: property.id, agentId: lead.id, landlordId: landlord.id, tenantId: tenant.id,
    startDate: new Date('2026-01-01'), endDate: new Date('2099-01-01'), monthlyRent: '3000', deposit: '6000',
  } })
  const checkIn = await db.inspection.create({ data: {
    tenancyId: tenancy.id, kind: 'CHECK_IN', status: 'COMPLETED',
    accessGrants: { create: { stakeholderId: checkInViewer.id } },
    rooms: { create: {
      name: 'Kitchen', order: 0, status: 'REVIEWED',
      items: { create: { name: `Private original ${tag}`, category: 'APPLIANCE', condition: 'GOOD' } },
    } },
  }, include: { rooms: { include: { items: true } } } })
  const checkOut = await db.inspection.create({ data: {
    tenancyId: tenancy.id, kind: 'CHECK_OUT', status: 'COMPLETED', baselineId: checkIn.id,
    accessGrants: { create: { stakeholderId: checkOutViewer.id } },
    rooms: { create: {
      name: 'Kitchen', order: 0, status: 'REVIEWED',
      items: { create: {
        name: 'Current hob', category: 'APPLIANCE', condition: 'DAMAGED',
        baselineKey: `item:${checkIn.rooms[0].items[0].id}`,
      } },
    } },
  }, include: { rooms: { include: { items: true } } } })
  const repair = await db.maintenanceCase.create({ data: {
    tenancyId: tenancy.id, reportedById: lead.id, category: 'PLUMBING',
    title: `Private repair ${tag}`, description: 'A repair outside the historical inspection grant',
  } })
  const original = checkIn.rooms[0].items[0]
  await db.finding.create({ data: {
    inspectionId: checkOut.id, itemId: checkOut.rooms[0].items[0].id, baselineItemId: original.id,
    maintenanceCaseId: repair.id, changeType: 'DAMAGE', verdict: 'UNDECIDED',
    rationale: 'Cracked surface', editedByHuman: true,
  } })
  return { lead, tenancy, checkIn, checkOut, checkInViewer, checkOutViewer, repair, original }
}

async function api(id: string) {
  const response = await GET(new Request(`http://kivilo.test/api/v1/inspections/${id}`), { params: Promise.resolve({ id }) })
  expect(response.status).toBe(200)
  return response.json()
}

async function page(id: string) {
  const tree = await InspectionPage({ params: Promise.resolve({ id }), searchParams: Promise.resolve({}) })
  // Inspect the props sent to client components as well as rendered server text.
  return JSON.stringify(tree, (_key, value) => isValidElement(value) ? value.props : value)
}

afterAll(async () => {
  await db.property.deleteMany({ where: { id: { in: propertyIds } } })
  await db.stakeholder.deleteMany({ where: { id: { in: stakeholderIds } } })
  await db.$disconnect()
})

describe('inspection-only related record access', () => {
  it('hides sibling reports, original inventory and repair history in the API and web page', async () => {
    const record = await fixture()
    as(record.checkInViewer)
    expect(await api(record.checkIn.id)).toMatchObject({ checkOutId: null, maintenanceHistory: [] })
    const checkInPage = await page(record.checkIn.id)
    expect(checkInPage).not.toContain(record.checkOut.id)
    expect(checkInPage).not.toContain('Start the check-out')
    expect(checkInPage).not.toContain('existingCheckOutId')

    as(record.checkOutViewer)
    const result = await api(record.checkOut.id)
    expect(result).toMatchObject({ baselineId: null, checkInItems: [], maintenanceHistory: [] })
    expect(result.findings[0]).toMatchObject({
      baselineItemId: null, baselineLabel: null, baselineCondition: null,
      maintenanceCaseId: null, maintenanceCaseTitle: null, currentCondition: 'DAMAGED',
    })
    const checkOutPage = await page(record.checkOut.id)
    for (const hidden of [record.checkIn.id, record.original.name, record.repair.id, record.repair.title]) {
      expect(checkOutPage).not.toContain(hidden)
    }
    expect(checkOutPage).toContain('Current hob')
  })

  it('allows independently granted siblings and full collaborators without widening exact grants', async () => {
    const record = await fixture()
    await db.inspectionAccessGrant.create({ data: { inspectionId: record.checkOut.id, stakeholderId: record.checkInViewer.id } })
    as(record.checkInViewer)
    expect(await api(record.checkIn.id)).toMatchObject({ checkOutId: record.checkOut.id, maintenanceHistory: [] })
    expect(await api(record.checkOut.id)).toMatchObject({ baselineId: record.checkIn.id, maintenanceHistory: [] })
    const historicalPage = await page(record.checkIn.id)
    expect(historicalPage).toContain('Open the check-out')
    expect(historicalPage).toContain(record.checkOut.id)
    expect(historicalPage).not.toContain('Start the check-out')

    await db.tenancyCollaborator.create({ data: { tenancyId: record.tenancy.id, stakeholderId: record.checkOutViewer.id } })
    as(record.checkOutViewer)
    const result = await api(record.checkOut.id)
    expect(result.baselineId).toBe(record.checkIn.id)
    expect(result.maintenanceHistory).toEqual([expect.objectContaining({ id: record.repair.id, title: record.repair.title })])
    expect(result.findings[0]).toMatchObject({ baselineItemId: record.original.id, maintenanceCaseId: record.repair.id })
    const fullPage = await page(record.checkOut.id)
    expect(fullPage).toContain(record.original.name)
    expect(fullPage).toContain(record.repair.title)
  })

  it('refuses hidden baseline items and repairs when writing a finding, including automatic matching', async () => {
    const record = await fixture()
    as(record.checkOutViewer)
    const input = {
      itemId: record.checkOut.rooms[0].items[0].id, baselineItemId: null,
      changeType: 'DAMAGE' as const, verdict: 'UNDECIDED' as const,
      rationale: 'Cracked surface', estimatedCost: null,
    }
    for (const baselineItemId of [record.original.id, 'missing-original']) {
      await expect(createFinding(record.checkOut.id, { ...input, baselineItemId })).rejects.toThrow('Item not found')
    }
    const findingId = await createFinding(record.checkOut.id, input)
    expect(await db.finding.findUniqueOrThrow({ where: { id: findingId } })).toMatchObject({ baselineItemId: null })
    for (const maintenanceCaseId of [record.repair.id, 'missing-repair']) {
      await expect(updateFinding(findingId, record.checkOut.id, { maintenanceCaseId })).rejects.toThrow('Maintenance case not found')
    }

    await db.inspectionAccessGrant.create({ data: { inspectionId: record.checkIn.id, stakeholderId: record.checkOutViewer.id } })
    const matchedId = await createFinding(record.checkOut.id, input)
    expect(await db.finding.findUniqueOrThrow({ where: { id: matchedId } })).toMatchObject({ baselineItemId: record.original.id })
    await expect(createFinding(record.checkOut.id, { ...input, baselineItemId: record.original.id })).resolves.toEqual(expect.any(String))
    await expect(updateFinding(findingId, record.checkOut.id, { maintenanceCaseId: record.repair.id })).rejects.toThrow('Maintenance case not found')

    await db.tenancyCollaborator.create({ data: { tenancyId: record.tenancy.id, stakeholderId: record.checkOutViewer.id } })
    await updateFinding(findingId, record.checkOut.id, { maintenanceCaseId: record.repair.id })
    expect(await db.finding.findUniqueOrThrow({ where: { id: findingId } })).toMatchObject({ maintenanceCaseId: record.repair.id })
  })
})
