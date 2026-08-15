import { afterAll, describe, expect, it } from 'vitest'
import { db } from '@/lib/db'
import { authorizeInspection, authorizeRoom, inspectionScope } from '@/lib/auth'

/// Server actions are public HTTP endpoints and every one of them takes an id from the
/// client. These tests pin the boundary that stops one agent reaching another's deal.

async function agentWithInspection(label: string) {
  const agent = await db.stakeholder.create({ data: { name: `Agent ${label}` } })
  const landlord = await db.stakeholder.create({ data: { name: `Landlord ${label}` } })
  const tenant = await db.stakeholder.create({ data: { name: `Tenant ${label}` } })
  const property = await db.property.create({
    data: { line1: `${label} block`, postalCode: '000000', type: 'PRIVATE_NON_LANDED' },
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
    data: { tenancyId: tenancy.id, kind: 'CHECK_IN' },
  })
  const room = await db.room.create({
    data: { inspectionId: inspection.id, name: 'Kitchen', order: 0 },
  })
  return { agent, inspection, room }
}

describe('authorization boundary', () => {
  afterAll(async () => {
    // Fixtures are disposable and shared one database, so clear them rather than
    // letting every run silt up the dev data.
    await db.property.deleteMany({ where: { postalCode: '000000' } })
    await db.stakeholder.deleteMany({ where: { tenanciesAsAgent: { none: {} }, tenanciesAsLandlord: { none: {} }, tenanciesAsTenant: { none: {} }, authUserId: null, inspectionsRun: { none: {} } } })
    await db.$disconnect()
  })

  it('lets an agent reach an inspection on their own deal', async () => {
    const mine = await agentWithInspection('A')
    await expect(authorizeInspection(mine.inspection.id, mine.agent.id)).resolves.toMatchObject({
      id: mine.inspection.id,
    })
  })

  it("refuses another agent's inspection", async () => {
    const mine = await agentWithInspection('B')
    const theirs = await agentWithInspection('C')
    await expect(authorizeInspection(theirs.inspection.id, mine.agent.id)).rejects.toThrow(
      'Inspection not found',
    )
  })

  /// The refusal must not reveal that the id is real, or the endpoint becomes a way to
  /// enumerate which inspections exist.
  it('gives the same error for a real id and a made-up one', async () => {
    const mine = await agentWithInspection('D')
    const theirs = await agentWithInspection('E')

    const forbidden = await authorizeInspection(theirs.inspection.id, mine.agent.id).catch(
      (e: Error) => e.message,
    )
    const nonexistent = await authorizeInspection('cl_not_a_real_id', mine.agent.id).catch(
      (e: Error) => e.message,
    )
    expect(forbidden).toBe(nonexistent)
  })

  it("refuses a room inside another agent's inspection", async () => {
    const mine = await agentWithInspection('F')
    const theirs = await agentWithInspection('G')
    await expect(authorizeRoom(theirs.room.id, mine.agent.id)).rejects.toThrow()
  })

  it('reaches an inspection the agent conducted even on a deal they do not hold', async () => {
    const other = await agentWithInspection('H')
    const conductor = await db.stakeholder.create({ data: { name: 'Standing in' } })
    await db.inspection.update({
      where: { id: other.inspection.id },
      data: { conductedById: conductor.id },
    })
    await expect(
      authorizeInspection(other.inspection.id, conductor.id),
    ).resolves.toBeTruthy()
  })

  it('scopes a list query to the agent, hiding everyone else', async () => {
    const mine = await agentWithInspection('I')
    await agentWithInspection('J')

    const visible = await db.inspection.findMany({
      where: inspectionScope(mine.agent.id),
      select: { id: true },
    })
    expect(visible.map((i) => i.id)).toEqual([mine.inspection.id])
  })
})
