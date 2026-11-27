import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

/// Malaysia added a country to every property. Nothing a Singapore party has already
/// signed, answered or downloaded may change because of it, so these hashes were
/// computed before that change, on a report shaped like the ones in production, and
/// must stay exactly as they are.

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/auth', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/auth')>()
  return { ...actual, requireAgent: vi.fn() }
})

import { db } from '@/lib/db'
import { requireAgent } from '@/lib/auth'
import { reportFingerprint } from '@/lib/report-fingerprint'
import { publishAssessment } from '@/lib/assessment-actions'
import { buildReportModel, loadReportRow, reportHash } from '@/lib/report-pdf/model'

const EMAIL = '@sg-hashes.test'
const PROPERTY = 'sgpin-property'
const at = (day: number) => new Date(Date.UTC(2025, 0, day, 2, 30))

async function clean() {
  await db.property.deleteMany({ where: { id: PROPERTY } })
  await db.stakeholder.deleteMany({ where: { email: { endsWith: EMAIL } } })
}

beforeAll(async () => {
  await clean()
  const [agent, landlord, tenant] = await Promise.all([
    db.stakeholder.create({ data: { id: 'sgpin-agent', name: 'Pin Agent', email: `agent${EMAIL}` } }),
    db.stakeholder.create({ data: { id: 'sgpin-landlord', name: 'Pin Landlord', email: `landlord${EMAIL}`, idNumber: 'S1234567D' } }),
    db.stakeholder.create({ data: { id: 'sgpin-tenant', name: 'Pin Tenant', email: `tenant${EMAIL}`, idNumber: 'G7654321N' } }),
  ])
  await db.property.create({
    data: { id: PROPERTY, line1: '1 Pin Road', unit: '#05-01', postalCode: '991901', type: 'PRIVATE_NON_LANDED' },
  })
  await db.tenancy.create({
    data: {
      id: 'sgpin-tenancy', propertyId: PROPERTY, landlordId: landlord.id, tenantId: tenant.id, agentId: agent.id,
      startDate: at(1), endDate: new Date(Date.UTC(2026, 11, 31)), monthlyRent: '4200', deposit: '8400.50',
    },
  })
  const report = (id: string, kind: 'CHECK_IN' | 'CHECK_OUT', day: number, baselineId?: string) => db.inspection.create({
    data: {
      id, tenancyId: 'sgpin-tenancy', kind, status: 'COMPLETED', baselineId,
      conductedById: agent.id, conductedAt: at(day), reportAgentId: agent.id, reportAgentFrozen: true,
    },
  })
  await report('sgpin-checkin', 'CHECK_IN', 2)
  await report('sgpin-checkout', 'CHECK_OUT', 20, 'sgpin-checkin')
  for (const [inspectionId, prefix, condition] of [['sgpin-checkin', 'in', 'GOOD'], ['sgpin-checkout', 'out', 'DAMAGED']] as const) {
    await db.room.create({ data: { id: `sgpin-${prefix}-room`, inspectionId, name: 'Kitchen', order: 0, status: 'REVIEWED' } })
    await db.capture.create({
      data: {
        id: `sgpin-${prefix}-capture`, roomId: `sgpin-${prefix}-room`, kind: 'PHOTO', storagePath: `sgpin/${prefix}/worktop.jpg`,
        mimeType: 'image/jpeg', sizeBytes: 123456, note: 'Worktop by the sink', processedAt: at(3), createdAt: at(2),
        annotations: {
          width: 4032, height: 3024,
          marks: [{ kind: 'ring', cx: 0.4, cy: 0.5, r: 0.1, note: 'Chip', authorId: agent.id, createdAt: at(2).toISOString() }],
        },
      },
    })
    await db.inspectionItem.create({
      data: {
        id: `sgpin-${prefix}-item`, roomId: `sgpin-${prefix}-room`, name: 'Worktop', category: 'SURFACE', condition,
        notes: 'Quartz', identifier: 'Caesarstone 4001', editedByHuman: true, createdAt: at(2),
        evidence: { create: { captureId: `sgpin-${prefix}-capture` } },
      },
    })
  }
  await db.finding.createMany({
    data: [
      { id: 'sgpin-finding-1', inspectionId: 'sgpin-checkout', itemId: 'sgpin-out-item', changeType: 'DAMAGE', verdict: 'TENANT_LIABLE', rationale: 'Burn mark', estimatedCost: '320.10', editedByHuman: true, createdAt: at(21) },
      { id: 'sgpin-finding-2', inspectionId: 'sgpin-checkout', itemId: 'sgpin-out-item', changeType: 'WEAR', verdict: 'FAIR_WEAR', rationale: 'Scuffs', estimatedCost: '80', editedByHuman: true, createdAt: at(22) },
    ],
  })
  vi.mocked(requireAgent).mockResolvedValue(agent)
  await publishAssessment('sgpin-checkout')
  await db.assessmentVersion.updateMany({ where: { inspectionId: 'sgpin-checkout' }, data: { publishedAt: at(23) } })
})

afterAll(async () => {
  await clean()
  await db.$disconnect()
})

describe('a Singapore report keeps its hashes', () => {
  it('signs the same fingerprint', async () => {
    expect(await reportFingerprint(db, 'sgpin-checkin')).toBe('13b8d0fe9315a526499f5bdf08310fcca1a720a29efdbaa932634903a48efc97')
  })

  it('publishes the same assessment snapshot', async () => {
    const version = await db.assessmentVersion.findFirstOrThrow({ where: { inspectionId: 'sgpin-checkout' } })
    expect(version.contentHash).toBe('3ca3a0c3a45dee560f54d770bacc468bc04146c5f1289de91e349bdf655f9551')
  })

  it('uses stable cache keys within the current PDF layout', async () => {
    const checkIn = await loadReportRow('sgpin-checkin')
    const checkOut = await loadReportRow('sgpin-checkout')
    expect(reportHash(buildReportModel(checkIn!))).toBe('650a8f72b41d15b64b656d1ea84478f0')
    expect(reportHash(buildReportModel(checkOut!))).toBe('6fd4095730443433faa86f32546f384d')
  })
})
