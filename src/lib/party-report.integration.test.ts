import { afterAll, describe, expect, it, vi } from 'vitest'
import { randomUUID } from 'node:crypto'

/// The landlord and tenant read the report they are signing or have signed, and nothing
/// else: not a report still being written, not someone else's tenancy, and not the
/// agent's working copy with its draft findings. What they read is what the link shows.

vi.mock('@/lib/storage', () => ({
  createDownloadUrl: vi.fn(async (path: string) => `https://storage.test/${path}`),
  createDownloadUrls: vi.fn(async (paths: string[]) => new Map(paths.map((path) => [path, `https://storage.test/${path}`]))),
}))

import { db } from '@/lib/db'
import { authorizeInspection } from '@/lib/auth'
import { signedReport } from '@/lib/report'
import type { InspectionKind, InspectionStatus } from '@/generated/prisma'

const postalCode = '994444'
const tag = randomUUID().slice(0, 8)
const created: string[] = []

async function person(name: string) {
  const row = await db.stakeholder.create({ data: { name: `${name} ${tag}` } })
  created.push(row.id)
  return row
}

async function deal(status: InspectionStatus, kind: InspectionKind = 'CHECK_IN') {
  const [landlord, tenant, agent] = [await person('Landlord'), await person('Tenant'), await person('Agent')]
  const property = await db.property.create({
    data: { line1: `Report ${tag}`, postalCode, type: 'PRIVATE_NON_LANDED' },
  })
  const tenancy = await db.tenancy.create({
    data: {
      propertyId: property.id, landlordId: landlord.id, tenantId: tenant.id, agentId: agent.id,
      startDate: new Date('2026-01-01'), endDate: new Date('2027-01-01'), monthlyRent: '3000', deposit: '6000',
    },
  })
  const inspection = await db.inspection.create({ data: { tenancyId: tenancy.id, kind, status } })
  const room = await db.room.create({ data: { inspectionId: inspection.id, name: 'Kitchen', order: 0 } })
  await db.inspectionItem.create({
    data: { roomId: room.id, name: 'Fridge', category: 'APPLIANCE', condition: 'GOOD', identifier: 'SN 123' },
  })
  const capture = (kind: 'PHOTO' | 'VIDEO', stamped: boolean) => db.capture.create({
    data: {
      roomId: room.id, kind, storagePath: `${room.id}/${randomUUID()}`, mimeType: 'image/jpeg', sizeBytes: 1,
      processedAt: stamped ? new Date() : null,
    },
  })
  const reviewed = await capture('PHOTO', true)
  await capture('PHOTO', false)
  await capture('VIDEO', true)
  return { landlord, tenant, agent, inspection, reviewed }
}

describe('party reports', () => {
  afterAll(async () => {
    await db.property.deleteMany({ where: { postalCode } })
    await db.stakeholder.deleteMany({ where: { id: { in: created } } })
    await db.$disconnect()
  })

  it('lets the landlord and tenant read their signed report, as the link shows it', async () => {
    const { landlord, tenant, inspection, reviewed } = await deal('COMPLETED')

    for (const party of [landlord, tenant]) {
      const report = await signedReport(inspection.id, party.id)
      expect(report.rooms).toHaveLength(1)
      expect(report.rooms[0].items.map((item) => item.name)).toEqual(['Fridge'])
      // A photo that arrived after review, and the walkthrough video, are not in it.
      expect(report.rooms[0].photos.map((photo) => photo.id)).toEqual([reviewed.id])
    }
  })

  it('lets them read it once sent for signature, since the landlord signs from it', async () => {
    const { landlord, tenant, inspection } = await deal('AWAITING_SIGNATURE')

    await expect(signedReport(inspection.id, landlord.id)).resolves.toMatchObject({ status: 'AWAITING_SIGNATURE' })
    await expect(signedReport(inspection.id, tenant.id)).resolves.toMatchObject({ id: inspection.id })
  })

  it('refuses a report still being written, though the agent reads it', async () => {
    const { landlord, tenant, agent, inspection } = await deal('REVIEW')

    await expect(signedReport(inspection.id, landlord.id)).rejects.toThrow('Report not found')
    await expect(signedReport(inspection.id, tenant.id)).rejects.toThrow('Report not found')
    await expect(signedReport(inspection.id, agent.id)).resolves.toMatchObject({ id: inspection.id })
  })

  it("refuses another tenancy's report with the same error as a made-up id", async () => {
    const mine = await deal('COMPLETED')
    const theirs = await deal('COMPLETED')

    const forbidden = await signedReport(theirs.inspection.id, mine.landlord.id).catch((e: Error) => e.message)
    const nonexistent = await signedReport('cl_not_a_real_id', mine.landlord.id).catch((e: Error) => e.message)
    expect(forbidden).toBe('Report not found')
    expect(nonexistent).toBe(forbidden)
  })

  it("keeps the agent's working copy, and its draft findings, from the parties", async () => {
    const { tenant, inspection } = await deal('COMPLETED', 'CHECK_OUT')
    await db.finding.create({
      data: { inspectionId: inspection.id, changeType: 'DAMAGE', rationale: 'Draft, unpublished' },
    })

    await expect(authorizeInspection(inspection.id, tenant.id)).rejects.toThrow('Inspection not found')
    expect((await signedReport(inspection.id, tenant.id)).assessment).toBeNull()
  })
})
