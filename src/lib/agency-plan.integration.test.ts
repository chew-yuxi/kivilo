import { randomUUID } from 'node:crypto'
import { afterAll, describe, expect, it, vi } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/headers', () => ({ headers: async () => new Headers() }))
vi.mock('@/lib/auth', async (original) => ({
  ...await original<typeof import('@/lib/auth')>(), requireAgent: vi.fn(), currentStakeholder: vi.fn(),
}))

import { db } from '@/lib/db'
import { currentStakeholder, requireAgent } from '@/lib/auth'
import { createInspection } from '@/lib/actions'
import { changeAgencyMember, respondAgencyInvitation } from '@/lib/agency-actions'
import { createRenewal } from '@/lib/renewal-actions'
import { resolveBillingWorkspace, workspacePlan } from '@/lib/plan'
import { GET as planRoute } from '@/app/api/v1/me/plan/route'
import type { AgencyRole, Stakeholder } from '@/generated/prisma'

const tag = randomUUID()
const people: string[] = []
const agencies: string[] = []
const properties: string[] = []

async function person() {
  const created = await db.stakeholder.create({ data: { name: `Agency plan ${tag}`, email: `${randomUUID()}@example.test` } })
  people.push(created.id)
  return created
}

async function agency(owner: Stakeholder) {
  const created = await db.agency.create({ data: {
    name: `Agency plan ${tag}`, members: { create: { stakeholderId: owner.id, role: 'OWNER', status: 'ACTIVE' } },
  } })
  agencies.push(created.id)
  return created
}

async function member(agencyId: string, actor: Stakeholder, role: AgencyRole = 'AGENT') {
  return db.agencyMembership.create({ data: { agencyId, stakeholderId: actor.id, status: 'ACTIVE', role } })
}

async function property(lead: Stakeholder, agencyId: string | null) {
  const landlord = await person()
  const tenant = await person()
  const created = await db.property.create({ data: {
    line1: `Billing property ${tag}`, postalCode: '998875', type: 'HDB',
    tenancies: { create: {
      agentId: lead.id, agencyId, landlordId: landlord.id, tenantId: tenant.id,
      startDate: new Date('2026-01-01'), endDate: new Date('2099-01-01'), monthlyRent: '3000', deposit: '6000',
      inspections: { create: { kind: 'CHECK_IN', conductedById: lead.id } },
    } },
  }, include: { tenancies: true } })
  properties.push(created.id)
  return created
}

function as(actor: Stakeholder) {
  vi.mocked(requireAgent).mockResolvedValue(actor)
  vi.mocked(currentStakeholder).mockResolvedValue(actor)
}

afterAll(async () => {
  await db.property.deleteMany({ where: { OR: [{ id: { in: properties } }, { line1: `New agency plan ${tag}` }] } })
  await db.agency.deleteMany({ where: { id: { in: agencies } } })
  await db.stakeholder.deleteMany({ where: { id: { in: people } } })
  await db.$disconnect()
})

describe('operational agency plans', () => {
  it('isolates personal and each team pool, counting a teammate property without granting billing management', async () => {
    const owner = await person()
    const colleague = await person()
    const first = await agency(owner)
    const second = await agency(owner)
    await member(first.id, colleague)
    await property(owner, null)
    await property(owner, first.id)
    await property(colleague, first.id)
    await property(owner, second.id)
    await db.subscription.create({ data: { agencyId: first.id, plan: 'PRO', seats: 2, status: 'comped', managedById: owner.id } })

    expect(await workspacePlan(owner, null)).toMatchObject({ plan: 'FREE', active: 1 })
    expect(await workspacePlan(owner, second.id)).toMatchObject({ plan: 'FREE', active: 1 })
    expect(await workspacePlan(owner, first.id)).toMatchObject({ plan: 'PRO', active: 2, limit: 50, isManager: true })
    expect(await workspacePlan(colleague, first.id)).toMatchObject({ plan: 'PRO', active: 2, limit: 50, isManager: false })
    expect(await resolveBillingWorkspace(colleague, first.id)).toMatchObject({ canManage: false, seatsNeeded: 2, workspaceKey: `agency:${first.id}` })
    // Previously released clients still get their old lead-scoped aggregate.
    expect(await workspacePlan(owner)).toMatchObject({ plan: 'FREE', active: 3 })
    expect((await db.stakeholder.findUniqueOrThrow({ where: { id: owner.id } })).teamId).toBeNull()
  })

  it('answers an inaccessible team like an unknown team, even when the caller pays personally', async () => {
    const owner = await person()
    const outsider = await person()
    const office = await agency(owner)
    await db.subscription.create({ data: { stakeholderId: outsider.id, plan: 'PRO', seats: 1, status: 'comped' } })
    as(outsider)
    const call = (id: string) => planRoute(new Request(`http://kivilo.test/api/v1/me/plan?agencyId=${id}`), { params: Promise.resolve({}) })
    for (const id of [office.id, randomUUID()]) {
      const response = await call(id)
      expect(response.status).toBe(404)
      expect(await response.json()).toEqual({ error: 'not_found' })
    }
  })

  it('enforces the destination team plan during check-in creation instead of borrowing the lead’s personal Pro', async () => {
    const owner = await person()
    const office = await agency(owner)
    await db.subscription.create({ data: { stakeholderId: owner.id, plan: 'PRO', seats: 1, status: 'comped' } })
    for (let i = 0; i < 5; i += 1) await property(owner, office.id)
    const landlord = await person()
    const tenant = await person()
    const input = {
      agencyId: office.id, line1: `New agency plan ${tag}`, unit: null, postalCode: '998875', propertyType: 'HDB' as const,
      landlordName: landlord.name, landlordEmail: landlord.email, tenantName: tenant.name, tenantEmail: tenant.email,
      startDate: '2026-01-01', endDate: '2099-01-01', monthlyRent: '3000', deposit: '6000',
    }
    as(owner)
    await expect(createInspection(input)).rejects.toThrow('Plan limit reached')
    await db.subscription.create({ data: { agencyId: office.id, plan: 'PRO', seats: 1, status: 'comped' } })
    const id = await createInspection(input)
    expect((await db.inspection.findUniqueOrThrow({ where: { id }, include: { tenancy: true } })).tenancy.agencyId).toBe(office.id)
    expect(await workspacePlan(owner, office.id)).toMatchObject({ active: 6, limit: 25 })
    expect(await workspacePlan(owner, null)).toMatchObject({ active: 0, limit: 25 })
  })

  it('reserves paid capacity for active members and prevents stranding the payer outside their team', async () => {
    const payer = await person()
    const otherOwner = await person()
    const invitee = await person()
    const office = await agency(payer)
    await member(office.id, otherOwner, 'OWNER')
    const paid = await db.subscription.create({ data: {
      agencyId: office.id, plan: 'PRO', seats: 2, status: 'active', managedById: payer.id,
      stripeSubscriptionId: `sub_agency_plan_${tag}`, currentPeriodEnd: new Date('2099-01-01'),
    } })
    const invitation = await db.agencyMembership.create({ data: {
      agencyId: office.id, stakeholderId: invitee.id, role: 'AGENT', status: 'INVITED', expiresAt: new Date('2099-01-01'),
    } })
    as(invitee)
    await expect(respondAgencyInvitation(office.id, invitation.id, 'accept')).rejects.toThrow('another paid seat')
    await db.subscription.update({ where: { id: paid.id }, data: { seats: 3 } })
    await expect(respondAgencyInvitation(office.id, invitation.id, 'accept')).resolves.toEqual({ accepted: true })
    const payerMembership = await db.agencyMembership.findUniqueOrThrow({ where: { agencyId_stakeholderId: { agencyId: office.id, stakeholderId: payer.id } } })
    as(otherOwner)
    await expect(changeAgencyMember(office.id, payerMembership.id, { action: 'remove' })).rejects.toThrow('paid subscription')
    await expect(changeAgencyMember(office.id, payerMembership.id, { role: 'AGENT' })).rejects.toThrow('paid subscription')
    await db.subscription.update({ where: { id: paid.id }, data: { status: 'canceled' } })
    await expect(changeAgencyMember(office.id, payerMembership.id, { action: 'remove' })).resolves.toMatchObject({ id: office.id })
    expect(await workspacePlan(otherOwner, office.id)).toMatchObject({ isManager: true, subscription: { managedById: null } })
  })

  it('permits a renewal within the existing pool but refuses reactivating an extra property at the team limit', async () => {
    const owner = await person()
    const office = await agency(owner)
    const current = await property(owner, office.id)
    for (let i = 1; i < 5; i += 1) await property(owner, office.id)
    const ended = await property(owner, office.id)
    await db.inspection.create({ data: { tenancyId: ended.tenancies[0].id, kind: 'CHECK_OUT', status: 'COMPLETED', conductedById: owner.id } })
    as(owner)
    await expect(createRenewal(ended.tenancies[0].id, {
      startDate: '2099-02-01', endDate: '2100-01-01', monthlyRent: '3000', deposit: '6000',
    })).rejects.toThrow('Plan limit reached')
    await expect(createRenewal(current.tenancies[0].id, {
      startDate: '2099-02-01', endDate: '2100-01-01', monthlyRent: '3000', deposit: '6000',
    })).resolves.toEqual(expect.any(String))
    expect(await workspacePlan(owner, office.id)).toMatchObject({ active: 5, limit: 5 })
  })
})
