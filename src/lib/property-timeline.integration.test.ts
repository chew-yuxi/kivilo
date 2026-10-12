import { afterAll, describe, expect, it } from 'vitest'
import { db } from '@/lib/db'
import { propertyTimeline } from '@/lib/property-timeline'

afterAll(async () => {
  await db.property.deleteMany({ where: { postalCode: '997777' } })
  await db.stakeholder.deleteMany({ where: { name: { startsWith: 'Timeline ' } } })
  await db.$disconnect()
})

async function person(name: string) {
  return db.stakeholder.create({ data: { name: `Timeline ${name}` } })
}

async function signedInspection(tenancyId: string, kind: 'CHECK_IN' | 'CHECK_OUT', conductedById: string, landlordId: string, tenantId: string, day: string) {
  const inspection = await db.inspection.create({
    data: { tenancyId, kind, status: 'COMPLETED', conductedById },
  })
  await db.signature.createMany({
    data: [
      { inspectionId: inspection.id, stakeholderId: landlordId, imageData: 'data:,', signedAt: new Date(`${day}T09:00:00Z`) },
      { inspectionId: inspection.id, stakeholderId: tenantId, imageData: 'data:,', signedAt: new Date(`${day}T10:00:00Z`) },
    ],
  })
  return inspection
}

describe('property timeline', () => {
  it('shows each viewer exactly the tenancies they may see, as settled facts', async () => {
    const landlord = await person('landlord')
    const pastTenant = await person('past tenant')
    const currentTenant = await person('current tenant')
    const pastAgent = await person('past agent')
    const currentAgent = await person('current agent')
    const stranger = await person('stranger')
    const property = await db.property.create({
      data: { line1: '9 Timeline Road', postalCode: '997777', type: 'PRIVATE_NON_LANDED' },
    })
    const past = await db.tenancy.create({
      data: {
        propertyId: property.id, landlordId: landlord.id, tenantId: pastTenant.id, agentId: pastAgent.id,
        startDate: new Date('2024-01-01'), endDate: new Date('2025-01-01'), monthlyRent: '3000', deposit: '6000',
      },
    })
    const current = await db.tenancy.create({
      data: {
        propertyId: property.id, landlordId: landlord.id, tenantId: currentTenant.id, agentId: currentAgent.id,
        startDate: new Date('2025-02-01'), endDate: new Date('2099-01-01'), monthlyRent: '3200', deposit: '6400',
      },
    })

    const pastCheckIn = await signedInspection(past.id, 'CHECK_IN', pastAgent.id, landlord.id, pastTenant.id, '2024-01-02')
    const leak = await db.maintenanceCase.create({
      data: {
        tenancyId: past.id, reportedById: pastTenant.id, category: 'PLUMBING', title: 'Leaking tap',
        description: 'Drips', status: 'RESOLVED', createdAt: new Date('2024-03-01'),
      },
    })
    const visit = await db.maintenanceVisit.create({
      data: { caseId: leak.id, completedAt: new Date('2024-03-05'), cost: '95' },
    })
    await db.maintenanceVerification.create({
      data: { visitId: visit.id, verifiedById: pastTenant.id, outcome: 'FIXED', createdAt: new Date('2024-03-06') },
    })
    await db.responsibilityProposal.create({
      data: {
        caseId: leak.id, proposedById: landlord.id, arrangedBy: 'LANDLORD', payer: 'LANDLORD', basis: 'FAIR_WEAR',
        reason: 'Old washer', status: 'ACCEPTED', respondedById: pastTenant.id, respondedAt: new Date('2024-03-02'),
      },
    })

    const currentCheckIn = await signedInspection(current.id, 'CHECK_IN', currentAgent.id, landlord.id, currentTenant.id, '2025-02-02')
    await db.inspection.create({ data: { tenancyId: current.id, kind: 'CHECK_OUT', status: 'AWAITING_SIGNATURE' } })
    const duplicate = await db.maintenanceCase.create({
      data: {
        tenancyId: current.id, reportedById: currentTenant.id, category: 'OTHER', title: 'Duplicate',
        description: 'Reported twice', status: 'CLOSED_NO_ACTION',
        createdAt: new Date('2025-03-01'), resolvedAt: new Date('2025-03-02'),
      },
    })
    await db.responsibilityProposal.create({
      data: {
        caseId: duplicate.id, proposedById: currentTenant.id, arrangedBy: 'TENANT', payer: 'TENANT',
        basis: 'OTHER', reason: 'Still open, never answered',
      },
    })

    const landlordView = await propertyTimeline(property.id, landlord.id)
    expect(landlordView.tenancies.map((tenancy) => tenancy.id)).toEqual([past.id, current.id])
    expect(landlordView.events.map((event) => event.kind)).toEqual([
      'CLOSED_WITHOUT_REPAIR', 'PROBLEM_REPORTED', 'CHECK_IN_SIGNED', 'TENANCY_STARTED',
      'TENANCY_ENDED', 'CONFIRMED_FIXED', 'REPAIRED', 'COST_AGREED', 'PROBLEM_REPORTED',
      'CHECK_IN_SIGNED', 'TENANCY_STARTED',
    ])
    expect(landlordView.events.find((event) => event.kind === 'REPAIRED')).toMatchObject({
      title: 'Repaired: Leaking tap', detail: 'S$95.00', link: { type: 'maintenance', id: leak.id },
    })
    expect(landlordView.events.find((event) => event.kind === 'COST_AGREED')?.detail)
      .toBe('Landlord pays. Landlord arranges the repair.')
    // The landlord sees a report was signed but cannot open the agent's working copy.
    expect(landlordView.events.filter((event) => event.kind === 'CHECK_IN_SIGNED').map((event) => event.link))
      .toEqual([null, null])

    const pastTenantView = await propertyTimeline(property.id, pastTenant.id)
    expect(new Set(pastTenantView.events.map((event) => event.tenancyId))).toEqual(new Set([past.id]))
    const currentTenantView = await propertyTimeline(property.id, currentTenant.id)
    expect(new Set(currentTenantView.events.map((event) => event.tenancyId))).toEqual(new Set([current.id]))

    const agentView = await propertyTimeline(property.id, currentAgent.id)
    expect(agentView.events.find((event) => event.kind === 'CHECK_IN_SIGNED')?.link)
      .toEqual({ type: 'inspection', id: currentCheckIn.id })
    expect(agentView.events.some((event) => event.link?.id === pastCheckIn.id)).toBe(false)

    const refused = await propertyTimeline(property.id, stranger.id).catch((error: Error) => error.message)
    const missing = await propertyTimeline('no-such-property', stranger.id).catch((error: Error) => error.message)
    expect(refused).toBe('Property not found')
    expect(refused).toBe(missing)
    await expect(propertyTimeline(property.id, pastAgent.id)).rejects.toThrow('Property not found')
  })
})
