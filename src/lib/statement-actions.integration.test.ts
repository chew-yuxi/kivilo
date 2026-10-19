import { afterAll, describe, expect, it, vi } from 'vitest'
import { randomUUID } from 'node:crypto'

/// The deposit statement: the published assessment's deductions against the deposit it
/// froze, which the landlord and tenant each agree or dispute once per version.

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/headers', () => ({ headers: async () => new Headers({ 'x-forwarded-for': '203.0.113.9' }) }))
vi.mock('@/lib/auth', async (importActual) => {
  // Only the session lookup is faked; the authorization boundary is the real one.
  const actual = await importActual<typeof import('@/lib/auth')>()
  return { ...actual, requireAgent: vi.fn(), requireStakeholder: vi.fn() }
})

import { db } from '@/lib/db'
import { requireAgent, requireStakeholder } from '@/lib/auth'
import { publishAssessment } from '@/lib/assessment-actions'
import { answerDepositStatement, answerDepositStatementInPerson } from '@/lib/statement-actions'
import { assessmentSnapshotSchema, depositStatement } from '@/lib/assessment-schema'
import type { Stakeholder } from '@/generated/prisma'

const POSTAL = '991619'

afterAll(async () => {
  await db.property.deleteMany({ where: { postalCode: POSTAL } })
  await db.stakeholder.deleteMany({ where: { email: { endsWith: '@statement.test' } } })
  await db.$disconnect()
})

const as = (person: Stakeholder) => {
  vi.mocked(requireAgent).mockResolvedValue(person)
  vi.mocked(requireStakeholder).mockResolvedValue(person)
}

async function checkOut() {
  const run = randomUUID().slice(0, 8)
  const [agent, landlord, tenant, outsider] = await Promise.all(['agent', 'landlord', 'tenant', 'outsider'].map((role) =>
    db.stakeholder.create({ data: { name: `Statement ${role}`, email: `${role}-${run}@statement.test` } })))
  const property = await db.property.create({ data: { line1: '9 Statement Road', postalCode: POSTAL, type: 'PRIVATE_NON_LANDED' } })
  const tenancy = await db.tenancy.create({
    data: {
      propertyId: property.id, landlordId: landlord.id, tenantId: tenant.id, agentId: agent.id,
      startDate: new Date('2024-01-01'), endDate: new Date('2026-01-01'), monthlyRent: '3000', deposit: '6000.10',
    },
  })
  const inspection = await db.inspection.create({ data: { tenancyId: tenancy.id, kind: 'CHECK_OUT', status: 'COMPLETED' } })
  const room = await db.room.create({ data: { inspectionId: inspection.id, name: 'Kitchen', order: 0, status: 'REVIEWED' } })
  const item = await db.inspectionItem.create({
    data: { roomId: room.id, name: 'Worktop', category: 'SURFACE', condition: 'DAMAGED', editedByHuman: true },
  })
  await db.finding.createMany({
    data: [
      { inspectionId: inspection.id, itemId: item.id, changeType: 'DAMAGE', verdict: 'TENANT_LIABLE', rationale: 'Burn', estimatedCost: '320.10', editedByHuman: true },
      { inspectionId: inspection.id, itemId: item.id, changeType: 'DAMAGE', verdict: 'TENANT_LIABLE', rationale: 'Chip', estimatedCost: '0.20', editedByHuman: true },
      { inspectionId: inspection.id, itemId: item.id, changeType: 'WEAR', verdict: 'FAIR_WEAR', rationale: 'Scuffs', estimatedCost: '80', editedByHuman: true },
    ],
  })
  as(agent)
  await publishAssessment(inspection.id)
  return { agent, landlord, tenant, outsider, tenancy, inspection }
}

describe('deposit statement', () => {
  it('freezes the deposit, deducts only tenant-liable costs, and asks both parties', async () => {
    const { landlord, tenant, tenancy, inspection } = await checkOut()
    const version = await db.assessmentVersion.findFirstOrThrow({ where: { inspectionId: inspection.id } })
    // Cents, not floats: 320.10 + 0.20 is 320.30, and 6000.10 less that is 5679.80.
    expect(depositStatement(assessmentSnapshotSchema.parse(version.snapshot))).toMatchObject({
      deposit: 6000.1, deductions: 320.3, toReturn: 5679.8,
    })
    // A later change to the tenancy does not move the figure already published.
    await db.tenancy.update({ where: { id: tenancy.id }, data: { deposit: '9000' } })
    const reread = await db.assessmentVersion.findFirstOrThrow({ where: { inspectionId: inspection.id } })
    expect(depositStatement(assessmentSnapshotSchema.parse(reread.snapshot))?.deposit).toBe(6000.1)

    const notified = await db.notification.findMany({ where: { href: `/sign/${inspection.id}` } })
    expect(notified.map((row) => row.recipientId).sort()).toEqual([landlord.id, tenant.id].sort())
  })

  it('records each party once, as themselves or in person, and refuses everyone else alike', async () => {
    const { agent, landlord, tenant, outsider, inspection } = await checkOut()

    as(tenant)
    await expect(answerDepositStatement(inspection.id, { version: 1, answer: 'DISPUTED' })).rejects.toThrow()
    await answerDepositStatement(inspection.id, { version: 1, answer: 'DISPUTED', reason: 'The burn was there at check-in' })
    await expect(answerDepositStatement(inspection.id, { version: 1, answer: 'AGREED' }))
      .rejects.toThrow('already been answered')

    as(outsider)
    await expect(answerDepositStatement(inspection.id, { version: 1, answer: 'AGREED' })).rejects.toThrow('Statement not found')
    // The agent is not a party in their own right, and cannot name a stranger in person.
    as(agent)
    await expect(answerDepositStatement(inspection.id, { version: 1, answer: 'AGREED' })).rejects.toThrow('Statement not found')
    await expect(answerDepositStatementInPerson(inspection.id, outsider.id, { version: 1, answer: 'AGREED' }))
      .rejects.toThrow('Statement not found')
    // Someone else's agent cannot record anything on this deal.
    as(outsider)
    await expect(answerDepositStatementInPerson(inspection.id, landlord.id, { version: 1, answer: 'AGREED' }))
      .rejects.toThrow(/not found/)

    as(agent)
    await answerDepositStatementInPerson(inspection.id, landlord.id, { version: 1, answer: 'AGREED' })

    const responses = await db.assessmentResponse.findMany({
      where: { assessmentVersion: { inspectionId: inspection.id } },
      orderBy: { respondedAt: 'asc' },
    })
    expect(responses.map(({ stakeholderId, answer, method, reason }) => ({ stakeholderId, answer, method, reason }))).toEqual([
      { stakeholderId: tenant.id, answer: 'DISPUTED', method: 'OWN_ACCOUNT', reason: 'The burn was there at check-in' },
      { stakeholderId: landlord.id, answer: 'AGREED', method: 'IN_PERSON', reason: null },
    ])
  })

  it('takes answers only on the latest version, and a revision asks again', async () => {
    const { agent, tenant, inspection } = await checkOut()
    as(tenant)
    await answerDepositStatement(inspection.id, { version: 1, answer: 'AGREED' })

    as(agent)
    await db.finding.updateMany({ where: { inspectionId: inspection.id, rationale: 'Chip' }, data: { estimatedCost: '50' } })
    await publishAssessment(inspection.id)

    as(tenant)
    await expect(answerDepositStatement(inspection.id, { version: 1, answer: 'AGREED' }))
      .rejects.toThrow('A revised statement has been published')
    await answerDepositStatement(inspection.id, { version: 2, answer: 'AGREED' })
    // The first answer stays, against the version it was given to.
    expect(await db.assessmentResponse.count({ where: { stakeholderId: tenant.id } })).toBe(2)
  })

  it('cannot be answered on a version published before deposits were frozen', async () => {
    const { tenant, inspection } = await checkOut()
    const version = await db.assessmentVersion.findFirstOrThrow({ where: { inspectionId: inspection.id } })
    const older = assessmentSnapshotSchema.parse(version.snapshot)
    delete older.deposit
    await db.assessmentVersion.update({ where: { id: version.id }, data: { snapshot: older } })
    as(tenant)
    await expect(answerDepositStatement(inspection.id, { version: 1, answer: 'AGREED' })).rejects.toThrow('Statement not found')
  })
})
