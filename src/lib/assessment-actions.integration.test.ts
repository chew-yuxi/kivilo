import { afterAll, describe, expect, it, vi } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/auth', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/auth')>()
  return { ...actual, requireAgent: vi.fn() }
})

import { db } from '@/lib/db'
import { requireAgent } from '@/lib/auth'
import { publishAssessment } from '@/lib/assessment-actions'
import { createFinding, deleteFinding } from '@/lib/actions'
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
    const maintenanceCase = await db.maintenanceCase.create({
      data: {
        tenancyId: tenancy.id,
        reportedById: tenant.id,
        category: 'OTHER',
        title: 'Worktop repair history',
        description: 'Chip repaired during the tenancy.',
        status: 'RESOLVED',
      },
    })
    await db.maintenanceEvidence.create({
      data: {
        clientId: 'e6c1bb2d-7e6c-4e0d-b9aa-7cf4e9b74738',
        caseId: maintenanceCase.id,
        uploadedById: tenant.id,
        purpose: 'AFTER',
        storagePath: `maintenance/${maintenanceCase.id}/after.jpg`,
        mimeType: 'image/jpeg',
        sizeBytes: 100,
        note: 'Repair completed',
      },
    })
    await db.finding.update({
      where: { id: finding.id },
      data: { maintenanceCaseId: maintenanceCase.id },
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
    expect(assessmentSnapshotSchema.parse(versions[0].snapshot).findings[0].maintenanceEvidence)
      .toMatchObject({
        title: 'Worktop repair history',
        evidence: [{ purpose: 'AFTER', note: 'Repair completed' }],
      })
    expect(assessmentSnapshotSchema.parse(versions[1].snapshot).findings[0].rationale)
      .toBe('A deeper chip verified against the photo')
  })

  it('takes findings written by hand and publishes them with no drafted summary', async () => {
    const agent = await db.stakeholder.create({ data: { name: 'Manual findings agent' } })
    vi.mocked(requireAgent).mockResolvedValue(agent)
    const property = await db.property.create({
      data: { line1: 'Manual findings', postalCode: '991234', type: 'PRIVATE_NON_LANDED' },
    })
    const tenancy = await db.tenancy.create({
      data: {
        propertyId: property.id,
        landlordId: (await db.stakeholder.create({ data: { name: 'Manual landlord' } })).id,
        tenantId: (await db.stakeholder.create({ data: { name: 'Manual tenant' } })).id,
        agentId: agent.id,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2026-01-01'),
        monthlyRent: '1000',
        deposit: '2000',
      },
    })
    const inventory = async (kind: 'CHECK_IN' | 'CHECK_OUT', baselineId: string | null) => {
      const inspection = await db.inspection.create({
        data: { tenancyId: tenancy.id, kind, status: 'COMPLETED', baselineId },
      })
      const room = await db.room.create({
        data: { inspectionId: inspection.id, name: 'Kitchen', order: 0, status: 'REVIEWED' },
      })
      const item = await db.inspectionItem.create({
        data: { roomId: room.id, name: 'Worktop', category: 'SURFACE', condition: 'GOOD', editedByHuman: true },
      })
      return { inspection, item }
    }
    const checkIn = await inventory('CHECK_IN', null)
    const checkOut = await inventory('CHECK_OUT', checkIn.inspection.id)
    const stranger = await inventory('CHECK_IN', null)

    const finding = {
      changeType: 'DAMAGE' as const,
      verdict: 'TENANT_LIABLE' as const,
      rationale: 'Burn mark beside the hob',
      estimatedCost: '180.00',
    }
    // An item from another inspection is refused on either side of the comparison.
    await expect(createFinding(checkOut.inspection.id, {
      ...finding, itemId: stranger.item.id, baselineItemId: null,
    })).rejects.toThrow('Item not found')
    await expect(createFinding(checkOut.inspection.id, {
      ...finding, itemId: null, baselineItemId: stranger.item.id,
    })).rejects.toThrow('Item not found')

    // Given only the check-out line, the check-in line with the same room and name is matched.
    const id = await createFinding(checkOut.inspection.id, {
      ...finding, itemId: checkOut.item.id, baselineItemId: null,
    })
    await expect(db.finding.findUniqueOrThrow({ where: { id } })).resolves.toMatchObject({
      baselineItemId: checkIn.item.id,
      editedByHuman: true,
    })
    const extra = await createFinding(checkOut.inspection.id, {
      ...finding, itemId: null, baselineItemId: checkIn.item.id,
    })
    await deleteFinding(extra, checkOut.inspection.id)

    await expect(publishAssessment(checkOut.inspection.id)).resolves.toMatchObject({ version: 1 })
    const [version] = await db.assessmentVersion.findMany({ where: { inspectionId: checkOut.inspection.id } })
    const snapshot = assessmentSnapshotSchema.parse(version.snapshot)
    expect(snapshot.summary).toBeNull()
    expect(snapshot.findings).toHaveLength(1)
  })
})
