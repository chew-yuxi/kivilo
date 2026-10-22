import { randomUUID } from 'node:crypto'
import { afterAll, describe, expect, it, vi } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/auth', async (original) => ({
  ...await original<typeof import('@/lib/auth')>(),
  requireAgent: vi.fn(), currentStakeholder: vi.fn(),
}))

import { db } from '@/lib/db'
import { currentStakeholder, requireAgent } from '@/lib/auth'
import { changeAgencyMember } from '@/lib/agency-actions'
import { GET } from '@/app/api/v1/inspections/route'
import { GET as tenancies } from '@/app/api/v1/tenancies/route'
import { GET as renewals } from '@/app/api/v1/renewals/route'
import { GET as me } from '@/app/api/v1/me/route'
import type { Stakeholder } from '@/generated/prisma'

const people: string[] = []
const properties: string[] = []
const agencies: string[] = []

async function person() {
  const row = await db.stakeholder.create({ data: {
    name: 'Workspace agent', email: `workspace-${randomUUID()}@example.test`,
  } })
  people.push(row.id)
  return row
}

async function fixture() {
  const owner = await person()
  const agent = await person()
  const manager = await person()
  const outsider = await person()
  const agency = await db.agency.create({ data: {
    name: `Workspace ${randomUUID()}`,
    members: { create: [
      { stakeholderId: owner.id, role: 'OWNER', status: 'ACTIVE', acceptedAt: new Date() },
      { stakeholderId: agent.id, role: 'AGENT', status: 'ACTIVE', acceptedAt: new Date() },
      { stakeholderId: manager.id, role: 'MANAGER', status: 'ACTIVE', acceptedAt: new Date() },
    ] },
  }, include: { members: true } })
  agencies.push(agency.id)
  const outsideAgency = await db.agency.create({ data: {
    name: `Outside workspace ${randomUUID()}`,
    members: { create: { stakeholderId: outsider.id, role: 'OWNER', status: 'ACTIVE', acceptedAt: new Date() } },
  } })
  agencies.push(outsideAgency.id)
  const landlord = await person()
  const tenant = await person()
  async function deal(lead: Stakeholder, agencyId: string | null = null) {
    const property = await db.property.create({ data: {
      line1: `Workspace property ${randomUUID()}`, postalCode: '998863', type: 'HDB',
    } })
    properties.push(property.id)
    const tenancy = await db.tenancy.create({ data: {
      propertyId: property.id, landlordId: landlord.id, tenantId: tenant.id, agentId: lead.id, agencyId,
      startDate: new Date('2026-01-01'), endDate: new Date('2099-01-01'), monthlyRent: '1000', deposit: '1000',
      inspections: { create: { kind: 'CHECK_IN', conductedById: lead.id } },
    }, include: { inspections: true } })
    return { id: tenancy.inspections[0].id, tenancyId: tenancy.id, propertyId: property.id }
  }
  const personal = await deal(agent)
  const ownersPersonal = await deal(owner)
  const assigned = await deal(agent, agency.id)
  const shared = await deal(owner, agency.id)
  const unassigned = await deal(owner, agency.id)
  const historical = await deal(outsider, outsideAgency.id)
  await db.tenancyCollaborator.create({ data: { tenancyId: shared.tenancyId, stakeholderId: agent.id } })
  await db.inspectionAccessGrant.create({ data: { inspectionId: historical.id, stakeholderId: agent.id } })
  return { owner, agent, manager, outsider, tenant, agency, outsideAgency, personal, ownersPersonal, assigned, shared, unassigned, historical }
}

async function list(actor: Stakeholder, query = '') {
  vi.mocked(currentStakeholder).mockResolvedValue(actor)
  const response = await GET(new Request(`http://localhost/api/v1/inspections${query}`), { params: Promise.resolve({}) })
  expect(response.status).toBe(200)
  return await response.json() as { id: string; agencyId: string | null; assignedToMe: boolean }[]
}

afterAll(async () => {
  await db.property.deleteMany({ where: { id: { in: properties } } })
  await db.agency.deleteMany({ where: { id: { in: agencies } } })
  await db.stakeholder.deleteMany({ where: { id: { in: people } } })
  await db.$disconnect()
})

describe('inspection workspaces', () => {
  it('offers the native agent workspace to accepted members before their first assignment', async () => {
    const row = await fixture()
    const membership = await db.agencyMembership.create({ data: {
      agencyId: row.agency.id, stakeholderId: row.tenant.id, status: 'INVITED', role: 'AGENT',
    } })
    vi.mocked(currentStakeholder).mockResolvedValue(row.tenant)
    const pending = await me(new Request('http://localhost/api/v1/me'), { params: Promise.resolve({}) })
    expect(await pending.json()).toMatchObject({ roles: ['TENANT'] })
    await db.agencyMembership.update({ where: { id: membership.id }, data: { status: 'ACTIVE', acceptedAt: new Date() } })
    const accepted = await me(new Request('http://localhost/api/v1/me'), { params: Promise.resolve({}) })
    expect(await accepted.json()).toMatchObject({ roles: ['TENANT', 'AGENT'] })
    expect(await list(row.tenant, `?agencyId=${row.agency.id}`)).toEqual([])
    await db.agencyMembership.update({ where: { id: membership.id }, data: { status: 'REMOVED', removedAt: new Date() } })
    const removed = await me(new Request('http://localhost/api/v1/me'), { params: Promise.resolve({}) })
    expect(await removed.json()).toMatchObject({ roles: ['TENANT'] })
  })

  it('keeps legacy no-query clients on all their own work, including shared and historical access', async () => {
    const row = await fixture()
    const expected = [row.personal.id, row.assigned.id, row.shared.id, row.historical.id].sort()
    expect((await list(row.agent)).map((value) => value.id).sort()).toEqual(expected)
    expect((await list(row.agent, '?personal=false')).map((value) => value.id).sort()).toEqual(expected)
    // Overseeing a team does not silently add its unassigned records to legacy My work.
    expect(await list(row.manager)).toEqual([])
  })

  it('separates personal and team work while ordinary agents only see their assignments', async () => {
    const row = await fixture()
    expect((await list(row.agent, '?personal=true')).map((value) => value.id).sort())
      .toEqual([row.personal.id])
    const team = await list(row.agent, `?agencyId=${row.agency.id}`)
    expect(team.map((value) => value.id).sort()).toEqual([row.assigned.id, row.shared.id].sort())
    expect(team.every((value) => value.agencyId === row.agency.id && value.assignedToMe)).toBe(true)
    expect(await list(row.agent, `?agencyId=${row.agency.id}&assigneeId=${row.owner.id}`))
      .toMatchObject([{ id: row.shared.id }])
    expect(await list(row.agent, `?agencyId=${row.agency.id}&personal=true`)).toEqual([])
  })

  it('lets active owners and managers oversee team work without seeing personal properties', async () => {
    const row = await fixture()
    for (const actor of [row.owner, row.manager]) {
      expect((await list(actor, `?agencyId=${row.agency.id}`)).map((value) => value.id).sort())
        .toEqual([row.assigned.id, row.shared.id, row.unassigned.id].sort())
      expect(await list(actor, `?agencyId=${row.agency.id}&assigneeId=${row.agent.id}`))
        .toMatchObject([{ id: row.assigned.id, assignedToMe: false }])
    }
    expect(await list(row.manager, '?personal=true&mine=false')).toEqual([])
    expect(await list(row.manager, `?agencyId=${row.agency.id}&mine=true`)).toEqual([])
    expect(await list(row.owner, '?personal=true')).toMatchObject([{ id: row.ownersPersonal.id }])
  })

  it('returns the same empty workspace for unknown teams, outsiders and unaccepted invitations', async () => {
    const row = await fixture()
    const requested = `?agencyId=${row.agency.id}`
    expect(await list(row.outsider, requested)).toEqual([])
    expect(await list(row.agent, '?agencyId=unknown-team')).toEqual([])
    // An exact old report remains in All my work, without admitting its team's portfolio.
    expect(await list(row.agent, `?agencyId=${row.outsideAgency.id}`)).toEqual([])
    await db.agencyMembership.create({ data: {
      agencyId: row.agency.id, stakeholderId: row.outsider.id, role: 'MANAGER', status: 'INVITED',
    } })
    expect(await list(row.outsider, requested)).toEqual([])
    vi.mocked(currentStakeholder).mockResolvedValue(row.agent)
    const invalid = await GET(new Request('http://localhost/api/v1/inspections?personal=anything'), { params: Promise.resolve({}) })
    expect(invalid.status).toBe(400)
  })

  it('removes team results on offboarding while preserving personal and outside historical work', async () => {
    const row = await fixture()
    vi.mocked(requireAgent).mockResolvedValue(row.owner)
    const membership = row.agency.members.find((value) => value.stakeholderId === row.agent.id)!
    await changeAgencyMember(row.agency.id, membership.id, { action: 'remove', reassignToId: row.owner.id })
    expect(await list(row.agent, `?agencyId=${row.agency.id}`)).toEqual([])
    expect((await list(row.agent)).map((value) => value.id).sort()).toEqual([row.personal.id, row.historical.id].sort())
    expect((await list(row.agent, '?personal=true')).map((value) => value.id).sort())
      .toEqual([row.personal.id])
  })

  it('applies property lifecycle and status filters within the chosen workspace', async () => {
    const row = await fixture()
    await db.property.update({ where: { id: row.shared.propertyId }, data: { archivedAt: new Date() } })
    await db.property.update({ where: { id: row.personal.propertyId }, data: { trashedAt: new Date() } })
    await db.inspection.update({ where: { id: row.assigned.id }, data: { status: 'REVIEW' } })
    expect(await list(row.agent, `?agencyId=${row.agency.id}&state=archived`)).toMatchObject([{ id: row.shared.id }])
    expect(await list(row.agent, `?agencyId=${row.agency.id}&status=REVIEW`)).toMatchObject([{ id: row.assigned.id }])
    expect(await list(row.agent, `?agencyId=${row.agency.id}&status=DRAFT`)).toEqual([])
    expect(await list(row.agent, '?personal=true')).toEqual([])
  })

  it('keeps native tenancy and renewal lists in the same workspace and their existing authorization', async () => {
    const row = await fixture()
    const due = new Date()
    due.setUTCDate(due.getUTCDate() + 30)
    await db.tenancy.updateMany({
      where: { propertyId: { in: [row.personal, row.ownersPersonal, row.assigned, row.shared, row.unassigned, row.historical].map((value) => value.propertyId) } },
      data: { endDate: due },
    })
    for (const [handler, path] of [[tenancies, 'tenancies'], [renewals, 'renewals']] as const) {
      async function ids(actor: Stakeholder, query = '') {
        vi.mocked(currentStakeholder).mockResolvedValue(actor)
        const response = await handler(new Request(`http://localhost/api/v1/${path}${query}`), { params: Promise.resolve({}) })
        expect(response.status).toBe(200)
        return (await response.json() as { id: string }[]).map((value) => value.id).sort()
      }
      const own = path === 'tenancies'
        ? [row.personal.tenancyId, row.assigned.tenancyId, row.shared.tenancyId]
        : [row.personal.tenancyId, row.assigned.tenancyId]
      expect(await ids(row.agent)).toEqual(own.sort())
      expect(await ids(row.agent, '?personal=false')).toEqual(own.sort())
      expect(await ids(row.agent, '?personal=true')).toEqual([row.personal.tenancyId])
      expect(await ids(row.agent, `?agencyId=${row.agency.id}`)).toEqual(own.filter((id) => id !== row.personal.tenancyId).sort())
      expect(await ids(row.manager, `?agencyId=${row.agency.id}`))
        .toEqual([row.assigned.tenancyId, row.shared.tenancyId, row.unassigned.tenancyId].sort())
      expect(await ids(row.manager, '?personal=true')).toEqual([])
      expect(await ids(row.agent, '?agencyId=unknown-team')).toEqual([])
      expect(await ids(row.outsider, `?agencyId=${row.agency.id}`)).toEqual([])
      if (path === 'renewals') expect(await ids(row.manager, `?agencyId=${row.agency.id}&mine=true`)).toEqual([])
    }
  })
})
