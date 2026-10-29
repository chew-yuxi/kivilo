import { afterAll, describe, expect, it } from 'vitest'

/// Home lists outstanding work from report, repair, document and update state, in the
/// context the viewer chose. One account can be an agent, a landlord and a tenant at
/// once; each context shows only its own relationships, and nobody else sees any of it.

import { db } from '@/lib/db'
import { HOME_SOURCE_LIMIT, homeContexts, homeTasks, sortHomeTasks, type HomeTask } from '@/lib/home-tasks'
import { listTenancies } from '@/lib/maintenance'

const postalCode = '998844'
const DAY = 86_400_000
const now = new Date('2026-10-25T04:00:00Z')

const person = (name: string) => db.stakeholder.create({ data: { name } })

async function term(label: string, people: { agentId?: string; landlordId?: string; tenantId?: string; agencyId?: string }, dates = {
  start: new Date(now.getTime() - 100 * DAY), end: new Date(now.getTime() + 300 * DAY),
}) {
  const property = await db.property.create({ data: { line1: `${label} Road`, postalCode, type: 'HDB' } })
  return db.tenancy.create({
    data: {
      propertyId: property.id,
      agentId: people.agentId ?? null,
      agencyId: people.agencyId ?? null,
      landlordId: people.landlordId ?? (await person(`${label} landlord`)).id,
      tenantId: people.tenantId ?? (await person(`${label} tenant`)).id,
      startDate: dates.start,
      endDate: dates.end,
      monthlyRent: '3000',
      deposit: '6000',
    },
    include: { landlord: true, tenant: true },
  })
}

const inspection = (tenancyId: string, kind: 'CHECK_IN' | 'CHECK_OUT', status: 'DRAFT' | 'REVIEW' | 'AWAITING_SIGNATURE' | 'COMPLETED') =>
  db.inspection.create({ data: { tenancyId, kind, status } })

const kinds = (tasks: HomeTask[]) => tasks.map((task) => `${task.group}:${task.kind}`).sort()

afterAll(async () => {
  await db.property.deleteMany({ where: { postalCode } })
  await db.$disconnect()
})

describe('home tasks', () => {
  it('shows one account its agent, landlord and tenant work in separate contexts, and nothing to anyone else', async () => {
    const me = await person('Mira HOME-MULTI')
    const outsider = await person('Outsider HOME-MULTI')
    const asAgent = await term('HOME-MULTI-A', { agentId: me.id })
    const asLandlord = await term('HOME-MULTI-B', { landlordId: me.id })
    const asTenant = await term('HOME-MULTI-C', { tenantId: me.id })

    const draft = await inspection(asAgent.id, 'CHECK_IN', 'DRAFT')
    const toSign = await inspection(asLandlord.id, 'CHECK_IN', 'AWAITING_SIGNATURE')
    const tenantReport = await inspection(asTenant.id, 'CHECK_IN', 'AWAITING_SIGNATURE')
    await db.signature.create({ data: { inspectionId: tenantReport.id, stakeholderId: me.id, imageData: 'data:' } })

    expect(await homeContexts(me.id)).toEqual({ work: true, landlord: true, tenant: true })
    expect(await homeContexts(outsider.id)).toEqual({ work: false, landlord: false, tenant: false })

    const work = await homeTasks(me.id, { kind: 'WORK' }, now)
    expect(work.tasks.map((task) => task.href)).toEqual([`/inspections/${draft.id}`])
    expect(work.tasks[0]).toMatchObject({ group: 'ACTION', title: 'Continue the check-in', capacity: 'AGENT' })

    const owned = await homeTasks(me.id, { kind: 'LANDLORD' }, now)
    expect(owned.tasks).toHaveLength(1)
    expect(owned.tasks[0]).toMatchObject({
      group: 'ACTION', kind: 'SIGN_REPORT', capacity: 'LANDLORD', person: 'As landlord', href: `/sign/${toSign.id}`,
    })

    // Signed already: the row says who it is waiting on, not that the tenant must act.
    const rented = await homeTasks(me.id, { kind: 'TENANT' }, now)
    expect(rented.tasks).toHaveLength(1)
    expect(rented.tasks[0]).toMatchObject({
      group: 'WAITING', kind: 'SIGNATURES', person: `Waiting on ${asTenant.landlord.name} (landlord)`,
    })

    for (const context of [{ kind: 'WORK' }, { kind: 'LANDLORD' }, { kind: 'TENANT' }] as const) {
      expect((await homeTasks(outsider.id, context, now)).tasks).toEqual([])
    }

    const rows = await listTenancies(me.id, { party: 'LANDLORD' }, now)
    expect(rows.map((row) => row.id)).toEqual([asLandlord.id])
    expect(rows[0].capacities).toEqual(['LANDLORD'])
  })

  it('keeps every capacity on one tenancy, and an agent context never signs for the landlord', async () => {
    const me = await person('Dual HOME-DUAL')
    const tenancy = await term('HOME-DUAL', { agentId: me.id, landlordId: me.id })
    const report = await inspection(tenancy.id, 'CHECK_IN', 'AWAITING_SIGNATURE')

    const [row] = await listTenancies(me.id, {}, now)
    expect(row).toMatchObject({ role: 'LANDLORD', capacities: ['LANDLORD', 'AGENT'] })

    const work = await homeTasks(me.id, { kind: 'WORK' }, now)
    expect(work.tasks[0]).toMatchObject({
      group: 'WAITING', href: `/inspections/${report.id}`,
      person: `Waiting on You, as landlord, ${tenancy.tenant.name} (tenant)`,
    })
    const owned = await homeTasks(me.id, { kind: 'LANDLORD' }, now)
    expect(owned.tasks[0]).toMatchObject({ group: 'ACTION', kind: 'SIGN_REPORT', href: `/sign/${report.id}` })
  })

  it('drops work when collaboration is revoked or the agent leaves the team', async () => {
    const lead = await person('Lead HOME-REVOKE')
    const helper = await person('Helper HOME-REVOKE')
    const manager = await person('Manager HOME-REVOKE')
    const agency = await db.agency.create({ data: { name: 'HOME-REVOKE team' } })
    const membership = await db.agencyMembership.create({
      data: { agencyId: agency.id, stakeholderId: manager.id, role: 'MANAGER', status: 'ACTIVE', acceptedAt: now },
    })
    const tenancy = await term('HOME-REVOKE', { agentId: lead.id, agencyId: agency.id })
    const collaborator = await db.tenancyCollaborator.create({ data: { tenancyId: tenancy.id, stakeholderId: helper.id } })
    await inspection(tenancy.id, 'CHECK_IN', 'REVIEW')

    expect((await homeTasks(helper.id, { kind: 'WORK' }, now)).tasks).toHaveLength(1)
    expect((await homeTasks(manager.id, { kind: 'WORK', agencyId: agency.id }, now)).tasks).toHaveLength(1)
    // Managing a team's work is the team context; personal work stays the manager's own.
    expect((await homeTasks(manager.id, { kind: 'WORK', personal: true }, now)).tasks).toEqual([])

    await db.tenancyCollaborator.delete({ where: { id: collaborator.id } })
    await db.agencyMembership.update({ where: { id: membership.id }, data: { status: 'REMOVED', removedAt: now } })
    expect((await homeTasks(helper.id, { kind: 'WORK' }, now)).tasks).toEqual([])
    expect((await homeTasks(manager.id, { kind: 'WORK', agencyId: agency.id }, now)).tasks).toEqual([])
    expect(await homeContexts(helper.id)).toMatchObject({ work: false })
  })

  it('puts each repair decision with the side that can take it', async () => {
    const agent = await person('Agent HOME-REPAIR')
    const tenancy = await term('HOME-REPAIR', { agentId: agent.id })
    const reported = await db.maintenanceCase.create({
      data: { tenancyId: tenancy.id, reportedById: tenancy.tenantId, category: 'PLUMBING', title: 'Leaking tap', description: 'Drips' },
    })
    const confirm = await db.maintenanceCase.create({
      data: {
        tenancyId: tenancy.id, reportedById: tenancy.tenantId, category: 'APPLIANCE', title: 'Fridge',
        description: 'Warm', status: 'AWAITING_CONFIRMATION',
      },
    })
    const costed = await db.maintenanceCase.create({
      data: {
        tenancyId: tenancy.id, reportedById: tenancy.tenantId, category: 'ELECTRICAL', title: 'Socket',
        description: 'Loose', status: 'ACKNOWLEDGED',
      },
    })
    await db.responsibilityProposal.create({
      data: {
        caseId: costed.id, proposedById: tenancy.tenantId, arrangedBy: 'LANDLORD', payer: 'LANDLORD',
        basis: 'FAIR_WEAR', reason: 'Old socket',
      },
    })
    // Scheduling is ongoing work, not a decision: it never becomes a row.
    await db.maintenanceCase.create({
      data: {
        tenancyId: tenancy.id, reportedById: tenancy.tenantId, category: 'PEST', title: 'Ants',
        description: 'Kitchen', status: 'SCHEDULED',
      },
    })

    const work = await homeTasks(agent.id, { kind: 'WORK' }, now)
    const byHref = Object.fromEntries(work.tasks.map((task) => [task.href, task]))
    expect(byHref[`/maintenance/${reported.id}`]).toMatchObject({ group: 'ACTION', title: 'Acknowledge the repair: Leaking tap' })
    expect(byHref[`/maintenance/${confirm.id}`]).toMatchObject({
      group: 'WAITING', person: `Waiting on ${tenancy.tenant.name} (tenant)`,
    })
    expect(byHref[`/maintenance/${costed.id}`]).toMatchObject({ group: 'ACTION', kind: 'REPAIR_COST' })
    expect(work.tasks).toHaveLength(3)

    // The landlord switched off the agent's authority to agree costs.
    await db.tenancy.update({ where: { id: tenancy.id }, data: { agentMayAgreeCosts: false } })
    const limited = await homeTasks(agent.id, { kind: 'WORK' }, now)
    expect(limited.tasks.find((task) => task.href === `/maintenance/${costed.id}`)).toMatchObject({
      group: 'WAITING', person: `Waiting on ${tenancy.landlord.name} (landlord)`,
    })

    const tenant = await homeTasks(tenancy.tenantId, { kind: 'TENANT' }, now)
    expect(kinds(tenant.tasks)).toEqual([
      'ACTION:REPAIR_CONFIRMATION', 'WAITING:REPAIR_COST', 'WAITING:REPAIR_REPORTED',
    ])

    // Done work disappears on the next read.
    await db.maintenanceCase.update({ where: { id: reported.id }, data: { status: 'ACKNOWLEDGED' } })
    await db.maintenanceCase.update({ where: { id: confirm.id }, data: { status: 'RESOLVED' } })
    expect((await homeTasks(agent.id, { kind: 'WORK' }, now)).tasks.map((task) => task.href))
      .toEqual([`/maintenance/${costed.id}`])
  })

  it('lists document requests, updates, deposit answers and the tenant defect deadline', async () => {
    const agent = await person('Agent HOME-PAPER')
    const tenancy = await term('HOME-PAPER', { agentId: agent.id }, {
      start: new Date('2026-10-10T16:00:00Z'), end: new Date('2027-10-10T00:00:00Z'),
    })
    const checkIn = await inspection(tenancy.id, 'CHECK_IN', 'COMPLETED')
    const request = await db.supportingDocumentRequest.create({
      data: { tenancyId: tenancy.id, clientId: crypto.randomUUID(), title: 'Utilities receipt', requestedById: agent.id },
    })
    const update = await db.reportAddendum.create({
      data: {
        inspectionId: checkIn.id, number: 1, title: 'New dishwasher', effectiveDate: now, createdById: agent.id,
        publishedAt: now, publishedById: agent.id, snapshot: {}, contentHash: 'x',
      },
    })
    await db.addendumAcknowledgement.create({ data: { addendumId: update.id, stakeholderId: tenancy.landlordId, contentHash: 'x' } })

    const tenant = await homeTasks(tenancy.tenantId, { kind: 'TENANT' }, now)
    expect(tenant.tasks.find((task) => task.kind === 'UPLOAD_DOCUMENT')).toMatchObject({
      group: 'ACTION', title: 'Upload Utilities receipt',
      href: `/tenancies/${tenancy.id}/documents?requestId=${request.id}`,
    })
    expect(tenant.tasks.find((task) => task.kind === 'ACKNOWLEDGE_UPDATE')).toMatchObject({
      group: 'ACTION', title: 'Acknowledge update 1: New dishwasher', href: `/updates/${update.id}`,
    })
    // Starts 11 October in Singapore; 30 inclusive days end on 9 November.
    expect(tenant.tasks.find((task) => task.kind === 'MOVE_IN_WINDOW')).toMatchObject({
      group: 'COMING_UP', date: '2026-11-09', dateKind: 'DEADLINE', overdue: false,
    })

    const landlord = await homeTasks(tenancy.landlordId, { kind: 'LANDLORD' }, now)
    expect(kinds(landlord.tasks)).toEqual(['WAITING:UPDATE_ACKNOWLEDGEMENTS'])

    const work = await homeTasks(agent.id, { kind: 'WORK' }, now)
    expect(kinds(work.tasks)).toEqual(['WAITING:DOCUMENT_REQUESTED', 'WAITING:UPDATE_ACKNOWLEDGEMENTS'])

    const checkOut = await inspection(tenancy.id, 'CHECK_OUT', 'COMPLETED')
    const version = await db.assessmentVersion.create({
      data: {
        inspectionId: checkOut.id, version: 1, contentHash: 'v1', publishedById: agent.id,
        snapshot: { schemaVersion: 1, summary: null, deposit: '6000', findings: [] },
      },
    })
    await db.assessmentResponse.create({
      data: { assessmentVersionId: version.id, stakeholderId: tenancy.tenantId, answer: 'AGREED', method: 'OWN_ACCOUNT', contentHash: 'v1' },
    })
    expect((await homeTasks(tenancy.landlordId, { kind: 'LANDLORD' }, now)).tasks.find((task) => task.kind === 'ANSWER_DEPOSIT'))
      .toMatchObject({ group: 'ACTION', href: `/sign/${checkOut.id}` })
    // A signed check-out closes the move-in window.
    expect((await homeTasks(tenancy.tenantId, { kind: 'TENANT' }, now)).tasks.map((task) => task.kind))
      .not.toContain('MOVE_IN_WINDOW')
  })

  it('offers renewal or check-out from the same rules as the Properties tab', async () => {
    const agent = await person('Agent HOME-ENDING')
    const renewing = await term('HOME-ENDING-RENEW', { agentId: agent.id }, {
      start: new Date('2025-11-01T00:00:00Z'), end: new Date('2026-11-10T00:00:00Z'),
    })
    await inspection(renewing.id, 'CHECK_IN', 'COMPLETED')
    const leaving = await term('HOME-ENDING-LEAVE', { agentId: agent.id }, {
      start: new Date('2025-11-01T00:00:00Z'), end: new Date('2026-11-12T00:00:00Z'),
    })
    const leavingCheckIn = await inspection(leaving.id, 'CHECK_IN', 'COMPLETED')
    await db.tenancy.update({ where: { id: leaving.id }, data: { renewalDecision: 'NOT_RENEWING' } })

    const work = await homeTasks(agent.id, { kind: 'WORK' }, now)
    expect(work.tasks.map((task) => [task.kind, task.date, task.href])).toEqual([
      ['RENEWAL_DUE', '2026-11-10', `/renewals/${renewing.id}`],
      ['CHECK_OUT_DUE', '2026-11-12', `/inspections/${leavingCheckIn.id}`],
    ])
    expect(work.counts).toEqual({ ACTION: 0, WAITING: 0, COMING_UP: 2 })
    expect(work.truncated).toBe(false)
  })

  it('offers a check-out only to someone who can start it, once the renewal is decided', async () => {
    const lead = await person('Lead HOME-CHECKOUT')
    const colleague = await person('Colleague HOME-CHECKOUT')
    const viewer = await person('Viewer HOME-CHECKOUT')
    const ending = await term('HOME-CHECKOUT', { agentId: lead.id }, {
      start: new Date('2025-11-01T00:00:00Z'), end: new Date('2026-11-12T00:00:00Z'),
    })
    const checkIn = await inspection(ending.id, 'CHECK_IN', 'COMPLETED')
    await db.tenancyCollaborator.create({ data: { tenancyId: ending.id, stakeholderId: colleague.id } })
    await db.inspectionAccessGrant.create({ data: { inspectionId: checkIn.id, stakeholderId: viewer.id } })
    const due = async (id: string) => (await homeTasks(id, { kind: 'WORK' }, now)).tasks
      .filter((task) => task.tenancyId === ending.id).map((task) => task.kind)

    // Undecided: the lead decides, and nobody is told to check out, snoozed or not.
    expect(await due(lead.id)).toEqual(['RENEWAL_DUE'])
    expect(await due(colleague.id)).toEqual([])
    await db.tenancy.update({ where: { id: ending.id }, data: { renewalSnoozedUntil: new Date(now.getTime() + 7 * DAY) } })
    expect(await due(lead.id)).toEqual([])

    await db.tenancy.update({ where: { id: ending.id }, data: { renewalDecision: 'NOT_RENEWING' } })
    expect(await due(lead.id)).toEqual(['CHECK_OUT_DUE'])
    expect(await due(colleague.id)).toEqual(['CHECK_OUT_DUE'])
    // An old-report grant cannot start one, so it is never offered.
    expect(await due(viewer.id)).toEqual([])
  })

  it('finds a pending deposit statement behind any number of settled ones', async () => {
    const agent = await person('Agent HOME-DEPOSITS')
    const settled = await term('HOME-DEPOSITS-SETTLED', { agentId: agent.id }, {
      start: new Date('2024-01-01T00:00:00Z'), end: new Date('2025-01-01T00:00:00Z'),
    })
    const statement = { schemaVersion: 1, summary: null, deposit: '6000', findings: [] }
    const old = await Promise.all(Array.from({ length: HOME_SOURCE_LIMIT }, () =>
      inspection(settled.id, 'CHECK_OUT', 'COMPLETED')))
    const versions = await Promise.all(old.map((row) => db.assessmentVersion.create({ data: {
      inspectionId: row.id, version: 1, snapshot: statement, contentHash: 'h', publishedById: agent.id,
    } })))
    await db.assessmentResponse.createMany({ data: versions.flatMap((version) =>
      [settled.landlordId, settled.tenantId].map((stakeholderId) => ({
        assessmentVersionId: version.id, stakeholderId, answer: 'AGREED' as const, method: 'OWN_ACCOUNT' as const, contentHash: 'h',
      }))) })
    const pending = await term('HOME-DEPOSITS-PENDING', { agentId: agent.id }, {
      start: new Date('2025-01-01T00:00:00Z'), end: new Date('2026-10-01T00:00:00Z'),
    })
    const checkOut = await inspection(pending.id, 'CHECK_OUT', 'COMPLETED')
    await db.assessmentVersion.create({ data: {
      inspectionId: checkOut.id, version: 1, snapshot: statement, contentHash: 'h', publishedById: agent.id,
    } })

    const work = await homeTasks(agent.id, { kind: 'WORK' }, now)
    expect(work.tasks.filter((task) => task.kind === 'DEPOSIT_ANSWERS').map((task) => task.tenancyId)).toEqual([pending.id])
    expect(work.truncated).toBe(false)
  })

  it('knows a move-in notice by its frozen snapshot, not by its repair link', async () => {
    const landlord = await person('Landlord HOME-NOTICE')
    const tenancy = await term('HOME-NOTICE', { landlordId: landlord.id })
    const checkIn = await inspection(tenancy.id, 'CHECK_IN', 'COMPLETED')
    await db.reportAddendum.create({ data: {
      inspectionId: checkIn.id, number: 1, title: 'Move-in defect: chipped basin', effectiveDate: now,
      createdById: tenancy.tenantId, publishedAt: now, publishedById: tenancy.tenantId, contentHash: 'x',
      snapshot: { moveInDefect: { caseId: 'removed', reportedAt: now.toISOString(), deadline: '2026-11-01' } },
    } })
    const owned = await homeTasks(landlord.id, { kind: 'LANDLORD' }, now)
    expect(owned.tasks.map((task) => task.kind)).toEqual(['RESPOND_MOVE_IN_NOTICE'])
  })
})

describe('sorting', () => {
  const task = (id: string, extra: Partial<HomeTask>): HomeTask => ({
    id, group: 'ACTION', kind: 'X', capacity: 'AGENT', propertyId: 'p', property: 'p', tenancyId: 't',
    title: id, person: null, date: null, dateKind: null, overdue: false, href: '/', ...extra,
  })
  it('puts overdue deadlines first, then dated rows soonest first, then undated work', () => {
    expect(sortHomeTasks([
      task('undated', {}),
      task('started', { date: '2026-09-01', dateKind: 'STARTED' }),
      task('ends-later', { date: '2026-12-01', dateKind: 'ENDS' }),
      task('deadline', { date: '2026-11-01', dateKind: 'DEADLINE' }),
      task('overdue', { date: '2026-10-01', dateKind: 'DEADLINE', overdue: true }),
    ]).map((row) => row.id)).toEqual(['overdue', 'deadline', 'ends-later', 'started', 'undated'])
  })
})
