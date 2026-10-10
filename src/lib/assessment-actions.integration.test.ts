import { afterAll, describe, expect, it, vi } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/auth', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/auth')>()
  return { ...actual, requireAgent: vi.fn() }
})

import { db } from '@/lib/db'
import { requireAgent } from '@/lib/auth'
import { publishAssessment } from '@/lib/assessment-actions'
import { assessmentSnapshotSchema } from '@/lib/assessment-schema'

afterAll(async () => {
  await db.property.deleteMany({ where: { postalCode: '991234' } })
  await db.stakeholder.deleteMany({
    where: {
      tenanciesAsAgent: { none: {} },
      tenanciesAsLandlord: { none: {} },
      tenanciesAsTenant: { none: {} },
      inspectionsRun: { none: {} },
      signatures: { none: {} },
      authUserId: null,
    },
  })
  await db.$disconnect()
})

describe('post-signature assessment publication', () => {
  it('preserves each published snapshot while a later draft is edited', async () => {
    const agent = await db.stakeholder.create({ data: { name: 'Assessment test agent' } })
    vi.mocked(requireAgent).mockResolvedValue(agent)
    const landlord = await db.stakeholder.create({ data: { name: 'Demo landlord' } })
    const tenant = await db.stakeholder.create({ data: { name: 'Demo tenant' } })
    const property = await db.property.create({
      data: { line1: 'Assessment test', postalCode: '991234', type: 'PRIVATE_NON_LANDED' },
    })
    const tenancy = await db.tenancy.create({
      data: {
        propertyId: property.id,
        landlordId: landlord.id,
        tenantId: tenant.id,
        agentId: agent.id,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2026-01-01'),
        monthlyRent: '1000',
        deposit: '2000',
      },
    })
    const inspection = await db.inspection.create({
      data: { tenancyId: tenancy.id, kind: 'CHECK_OUT', status: 'COMPLETED', summary: 'One changed item' },
    })
    const room = await db.room.create({
      data: { inspectionId: inspection.id, name: 'Kitchen', order: 0, status: 'REVIEWED' },
    })
    const item = await db.inspectionItem.create({
      data: { roomId: room.id, name: 'Worktop', category: 'SURFACE', condition: 'DAMAGED', editedByHuman: true },
    })
    const finding = await db.finding.create({
      data: {
        inspectionId: inspection.id,
        itemId: item.id,
        changeType: 'DAMAGE',
        verdict: 'TENANT_LIABLE',
        rationale: 'A deep chip in the edge',
        estimatedCost: '120.00',
        editedByHuman: false,
      },
    })

    await expect(publishAssessment(inspection.id)).rejects.toThrow('Review every finding')
    await db.finding.update({
      where: { id: finding.id },
      data: { editedByHuman: true, confidence: null },
    })
    await expect(publishAssessment(inspection.id)).resolves.toMatchObject({ version: 1 })
    await expect(publishAssessment(inspection.id)).resolves.toMatchObject({ version: 1 })
    await db.finding.update({
      where: { id: finding.id },
      data: { rationale: 'A deeper chip verified against the photo' },
    })
    await expect(publishAssessment(inspection.id)).resolves.toMatchObject({ version: 2 })

    const versions = await db.assessmentVersion.findMany({
      where: { inspectionId: inspection.id },
      orderBy: { version: 'asc' },
    })
    expect(versions).toHaveLength(2)
    expect(assessmentSnapshotSchema.parse(versions[0].snapshot).findings[0].rationale)
      .toBe('A deep chip in the edge')
    expect(assessmentSnapshotSchema.parse(versions[1].snapshot).findings[0].rationale)
      .toBe('A deeper chip verified against the photo')
  })
})
