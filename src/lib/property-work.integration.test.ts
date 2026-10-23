import { afterAll, describe, expect, it } from 'vitest'

/// The Properties tab lists one row per property, at the stage of the newest term the
/// viewer can see, using the same access as the work list.

import { db } from '@/lib/db'
import { propertyOverview, propertyStage, propertyWork } from '@/lib/property-work'

const postalCode = '998833'
const DAY = 86_400_000
const now = new Date('2026-10-23T00:00:00Z')

const person = (name: string) => db.stakeholder.create({ data: { name } })

async function property(label: string) {
  return db.property.create({ data: { line1: `${label} Road`, postalCode, type: 'PRIVATE_NON_LANDED' } })
}

async function term(propertyId: string, agentId: string, start: string, end: string, extra: { agencyId?: string } = {}) {
  return db.tenancy.create({
    data: {
      propertyId,
      agentId,
      landlordId: (await person('Landlord')).id,
      tenantId: (await person('Tenant')).id,
      startDate: new Date(start),
      endDate: new Date(end),
      monthlyRent: '1000',
      deposit: '2000',
      ...extra,
    },
  })
}

const report = (tenancyId: string, kind: 'CHECK_IN' | 'CHECK_OUT', status: 'DRAFT' | 'AWAITING_SIGNATURE' | 'COMPLETED') =>
  db.inspection.create({ data: { tenancyId, kind, status, fullyFurnished: false } })

afterAll(async () => {
  await db.property.deleteMany({ where: { postalCode } })
  await db.$disconnect()
})

describe('property stage', () => {
  const at = (kind: 'CHECK_IN' | 'CHECK_OUT', status: 'DRAFT' | 'AWAITING_SIGNATURE' | 'COMPLETED', offset = 0) =>
    ({ id: `${kind}-${status}`, kind, status, createdAt: new Date(now.getTime() + offset) })
  const far = new Date(now.getTime() + 200 * DAY)
  it('follows the check-in, then the term, then the check-out', () => {
    expect(propertyStage([at('CHECK_IN', 'DRAFT')], far, now).stage).toBe('CHECK_IN_IN_PROGRESS')
    expect(propertyStage([at('CHECK_IN', 'AWAITING_SIGNATURE')], far, now).stage).toBe('CHECK_IN_AWAITING')
    expect(propertyStage([at('CHECK_IN', 'COMPLETED')], far, now).stage).toBe('RUNNING')
    expect(propertyStage([at('CHECK_IN', 'COMPLETED')], new Date(now.getTime() + 20 * DAY), now).stage).toBe('CHECK_OUT_DUE')
    expect(propertyStage([at('CHECK_IN', 'COMPLETED')], new Date(now.getTime() - DAY), now).stage).toBe('CHECK_OUT_DUE')
    expect(propertyStage([at('CHECK_IN', 'COMPLETED'), at('CHECK_OUT', 'DRAFT', 1)], far, now))
      .toMatchObject({ stage: 'CHECK_OUT_IN_PROGRESS', next: { kind: 'CHECK_OUT' } })
    expect(propertyStage([at('CHECK_OUT', 'AWAITING_SIGNATURE')], far, now).stage).toBe('CHECK_OUT_AWAITING')
    expect(propertyStage([at('CHECK_OUT', 'COMPLETED')], far, now).stage).toBe('ENDED')
  })
})

describe('property work', () => {
  it('lists each property once, at the stage of its newest term', async () => {
    const agent = await person('Agent WORK-RENEWAL')
    const home = await property('WORK-RENEWAL')
    const first = await term(home.id, agent.id, '2025-01-01', '2026-12-31')
    await report(first.id, 'CHECK_IN', 'COMPLETED')
    const renewal = await term(home.id, agent.id, '2027-01-01', '2028-12-31')
    const draft = await report(renewal.id, 'CHECK_IN', 'DRAFT')

    const rows = (await propertyWork(agent.id, {}, now)).filter((row) => row.id === home.id)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      tenancyId: renewal.id, stage: 'CHECK_IN_IN_PROGRESS', stageLabel: 'Check-in in progress',
      nextInspectionId: draft.id, reports: 2, tenancies: 2, state: 'ACTIVE',
    })

    const overview = await propertyOverview(home.id, agent.id, now)
    expect(overview.terms.map((t) => t.tenancyId)).toEqual([renewal.id, first.id])
    expect(overview.terms[1].reports.map((r) => r.status)).toEqual(['COMPLETED'])
  })

  it('narrows by workspace, and shows old-report access without the rest of the property', async () => {
    const lead = await person('Lead WORK-SCOPE')
    const viewer = await person('Viewer WORK-SCOPE')
    const agency = await db.agency.create({ data: { name: 'WORK-SCOPE team' } })
    await db.agencyMembership.create({ data: { agencyId: agency.id, stakeholderId: lead.id, role: 'OWNER', status: 'ACTIVE' } })
    const teamHome = await property('WORK-SCOPE-TEAM')
    const teamTerm = await term(teamHome.id, lead.id, '2026-01-01', '2028-01-01', { agencyId: agency.id })
    await report(teamTerm.id, 'CHECK_IN', 'DRAFT')
    const personalHome = await property('WORK-SCOPE-PERSONAL')
    const personalTerm = await term(personalHome.id, lead.id, '2026-01-01', '2028-01-01')
    const granted = await report(personalTerm.id, 'CHECK_IN', 'COMPLETED')

    const ids = async (filters: Parameters<typeof propertyWork>[1]) =>
      (await propertyWork(lead.id, filters, now)).map((row) => row.id).filter((id) => [teamHome.id, personalHome.id].includes(id)).sort()
    expect(await ids({})).toEqual([teamHome.id, personalHome.id].sort())
    expect(await ids({ agencyId: agency.id })).toEqual([teamHome.id])
    expect(await ids({ personal: true })).toEqual([personalHome.id])

    expect(await propertyWork(viewer.id, {}, now)).toEqual([])
    await expect(propertyOverview(personalHome.id, viewer.id, now)).rejects.toThrow('Property not found')
    await db.inspectionAccessGrant.create({ data: { inspectionId: granted.id, stakeholderId: viewer.id } })
    expect((await propertyWork(viewer.id, {}, now)).map((row) => row.id)).toEqual([personalHome.id])
    const overview = await propertyOverview(personalHome.id, viewer.id, now)
    expect(overview.terms[0].reports.map((r) => r.id)).toEqual([granted.id])
    // An old-report grant is not the running tenancy, so its repairs stay closed.
    expect(overview.terms[0].tenancy).toBeNull()
    expect(overview.canOpenTimeline).toBe(false)
  })

  it('moves archived and deleted properties to their own filters', async () => {
    const agent = await person('Agent WORK-STATE')
    const archived = await property('WORK-STATE-ARCHIVED')
    await report((await term(archived.id, agent.id, '2026-01-01', '2028-01-01')).id, 'CHECK_IN', 'COMPLETED')
    await db.property.update({ where: { id: archived.id }, data: { archivedAt: now } })
    const trashed = await property('WORK-STATE-TRASH')
    await report((await term(trashed.id, agent.id, '2026-01-01', '2028-01-01')).id, 'CHECK_IN', 'DRAFT')
    await db.property.update({ where: { id: trashed.id }, data: { trashedAt: now, trashExpiresAt: new Date(now.getTime() + 30 * DAY) } })

    const has = async (state: 'active' | 'archived' | 'trash') =>
      (await propertyWork(agent.id, { state }, now)).map((row) => row.id)
    expect(await has('active')).not.toContain(archived.id)
    expect(await has('active')).not.toContain(trashed.id)
    expect(await has('archived')).toEqual([archived.id])
    expect(await has('trash')).toEqual([trashed.id])
    expect((await propertyWork(agent.id, { state: 'trash' }, now))[0].state).toBe('TRASHED')
  })
})
