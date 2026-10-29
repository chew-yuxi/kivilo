import { afterAll, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/storage', () => ({
  createDownloadUrl: vi.fn(async (path: string) => `https://storage.test/${path}?token=signed`),
}))

/// The Properties tab lists one row per property, at the stage of the newest term the
/// viewer can see, using the same access as the work list.

import { db } from '@/lib/db'
import { propertyNextStep, propertyOverview, propertyStage, propertyWork } from '@/lib/property-work'

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

describe('property next step', () => {
  const base = { kind: 'CHECK_IN' as const, rooms: { total: 0, reviewed: 0 }, unsigned: [], endDate: new Date(now.getTime() + 20 * DAY) }
  it('says what is next and who it waits on', () => {
    expect(propertyNextStep('CHECK_IN_IN_PROGRESS', base, now)).toBe('Check-in started, no rooms yet')
    expect(propertyNextStep('CHECK_OUT_IN_PROGRESS', { ...base, kind: 'CHECK_OUT', rooms: { total: 5, reviewed: 3 } }, now))
      .toBe('Check-out: 3 of 5 rooms reviewed')
    expect(propertyNextStep('CHECK_IN_AWAITING', { ...base, unsigned: ['Lee', 'Tan'] }, now)).toBe('Waiting on Lee and Tan to sign')
    expect(propertyNextStep('CHECK_OUT_DUE', base, now)).toBe('Check-out due by 12 Nov 2026')
    expect(propertyNextStep('CHECK_OUT_DUE', { ...base, endDate: new Date(now.getTime() - DAY) }, now))
      .toBe('Lease ended 22 Oct 2026, check-out not started')
    expect(propertyNextStep('RUNNING', base, now)).toBeNull()
  })
})

describe('property work', () => {
  it('gives each card its cover photo, next step and what is waiting', async () => {
    const agent = await person('Agent WORK-CARD')
    const viewer = await person('Viewer WORK-CARD')
    const home = await property('WORK-CARD')
    const tenancy = await term(home.id, agent.id, '2026-01-01', '2028-01-01')
    const checkIn = await report(tenancy.id, 'CHECK_IN', 'COMPLETED')
    const kitchen = await db.room.create({ data: { inspectionId: checkIn.id, name: 'Kitchen', order: 1 } })
    const living = await db.room.create({ data: { inspectionId: checkIn.id, name: 'Living', order: 0 } })
    const photo = (roomId: string, path: string, posterPath: string | null = null, kind: 'PHOTO' | 'VIDEO' = 'PHOTO') =>
      db.capture.create({ data: { roomId, kind, storagePath: `WORK-CARD/${path}`, posterPath, mimeType: 'image/jpeg', sizeBytes: 1 } })
    await photo(kitchen.id, 'kitchen.jpg')
    await photo(living.id, 'walkthrough.mp4', null, 'VIDEO')
    await photo(living.id, 'sofa.jpg', 'WORK-CARD/sofa.webp')
    await db.maintenanceCase.createMany({ data: [
      { tenancyId: tenancy.id, reportedById: agent.id, category: 'PLUMBING', title: 'Tap', description: 'Drips' },
      { tenancyId: tenancy.id, reportedById: agent.id, category: 'PLUMBING', title: 'Old', description: 'Fixed', status: 'RESOLVED' },
    ] })
    await db.reportAddendum.create({ data: {
      inspectionId: checkIn.id, number: 1, title: 'New oven', effectiveDate: now, createdById: agent.id, publishedAt: now,
    } })

    const [row] = (await propertyWork(agent.id, {}, now)).filter((each) => each.id === home.id)
    expect(row).toMatchObject({
      startDate: tenancy.startDate.toISOString(),
      coverUrl: 'https://storage.test/WORK-CARD/sofa.webp?token=signed',
      stage: 'RUNNING', nextStep: null,
      attention: { openRepairs: 1, pendingUpdates: 1, depositAnswersMissing: 0 },
    })

    // The property page says the same as its card.
    expect(await propertyOverview(home.id, agent.id, now)).toMatchObject({
      nextStep: null, attention: { openRepairs: 1, pendingUpdates: 1, depositAnswersMissing: 0 },
    })

    // An old-report grant sees the report and its updates, but repairs stay closed.
    await db.inspectionAccessGrant.create({ data: { inspectionId: checkIn.id, stakeholderId: viewer.id } })
    expect((await propertyWork(viewer.id, {}, now))[0].attention).toEqual({ openRepairs: 0, pendingUpdates: 1, depositAnswersMissing: 0 })
  })

  it('names who has not signed and counts unanswered deposit statements', async () => {
    const agent = await person('Agent WORK-SIGN')
    const home = await property('WORK-SIGN')
    const tenancy = await term(home.id, agent.id, '2026-01-01', '2028-01-01')
    await report(tenancy.id, 'CHECK_IN', 'COMPLETED')
    const checkOut = await report(tenancy.id, 'CHECK_OUT', 'AWAITING_SIGNATURE')
    const [landlord, tenant] = await Promise.all([
      db.stakeholder.update({ where: { id: tenancy.landlordId }, data: { name: 'Lee Landlord' } }),
      db.stakeholder.update({ where: { id: tenancy.tenantId }, data: { name: 'Tan Tenant' } }),
    ])
    const row = async () => (await propertyWork(agent.id, {}, now)).filter((each) => each.id === home.id)[0]
    expect((await row()).nextStep).toBe('Waiting on Lee Landlord and Tan Tenant to sign')
    await db.signature.create({ data: { inspectionId: checkOut.id, stakeholderId: landlord.id, imageData: 'data:,' } })
    expect((await row()).nextStep).toBe('Waiting on Tan Tenant to sign')
    expect((await propertyOverview(home.id, agent.id, now)).nextStep).toBe('Waiting on Tan Tenant to sign')

    await db.inspection.update({ where: { id: checkOut.id }, data: { status: 'COMPLETED' } })
    const version = (deposit: boolean, n: number) => db.assessmentVersion.create({ data: {
      inspectionId: checkOut.id, version: n, contentHash: `h${n}`, publishedById: agent.id,
      snapshot: deposit ? { deposit: '2000.00', findings: [] } : { findings: [] },
    } })
    await version(false, 1)
    expect((await row()).attention.depositAnswersMissing).toBe(0)
    const latest = await version(true, 2)
    expect((await row()).attention.depositAnswersMissing).toBe(2)
    await db.assessmentResponse.create({ data: {
      assessmentVersionId: latest.id, stakeholderId: tenant.id, answer: 'AGREED', method: 'OWN_ACCOUNT', contentHash: 'h2',
    } })
    expect(await row()).toMatchObject({ stage: 'ENDED', attention: { depositAnswersMissing: 1 } })
  })

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
    expect((await propertyWork(agent.id, { state: 'trash' }, now))[0]).toMatchObject({
      state: 'TRASHED', trashExpiresAt: new Date(now.getTime() + 30 * DAY).toISOString(),
    })
    expect((await propertyWork(agent.id, { state: 'archived' }, now))[0].trashExpiresAt).toBeNull()
  })
})
