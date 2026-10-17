import { afterAll, describe, expect, it, vi } from 'vitest'
import { randomUUID } from 'node:crypto'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/headers', () => ({ headers: async () => new Headers() }))
vi.mock('@/lib/auth', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/auth')>()
  return { ...actual, requireAgent: vi.fn() }
})

import { db } from '@/lib/db'
import { requireAgent } from '@/lib/auth'
import { dueRenewals, queueRenewalReminders } from '@/lib/renewals'
import { respondToRenewal, createRenewal } from '@/lib/renewal-actions'

const tag = randomUUID().slice(0, 8)
const created: string[] = []
const propertyIds: string[] = []
const now = new Date('2070-10-17T00:00:00Z')

async function fixture(endDate = '2071-01-17') {
  const agent = await db.stakeholder.create({ data: { name: `Renewal agent ${tag}` } })
  const landlord = await db.stakeholder.create({ data: { name: `Renewal landlord ${tag}` } })
  const tenant = await db.stakeholder.create({ data: { name: `Renewal tenant ${tag}` } })
  created.push(agent.id, landlord.id, tenant.id)
  const property = await db.property.create({ data: { line1: `Renewal ${tag}`, postalCode: '999117', type: 'HDB' } })
  propertyIds.push(property.id)
  const tenancy = await db.tenancy.create({ data: {
    propertyId: property.id, landlordId: landlord.id, tenantId: tenant.id, agentId: agent.id,
    startDate: new Date('2070-01-01'), endDate: new Date(endDate), monthlyRent: '3000', deposit: '6000',
    inspections: { create: { kind: 'CHECK_IN', status: 'COMPLETED', conductedById: agent.id, fullyFurnished: true } },
  }, include: { inspections: true } })
  return { agent, landlord, tenant, property, tenancy }
}

describe('renewal reminders and next term', () => {
  afterAll(async () => {
    await db.property.deleteMany({ where: { id: { in: propertyIds } } })
    await db.stakeholder.deleteMany({ where: { id: { in: created } } })
    await db.$disconnect()
  })

  it('shows the card immediately at three months and queues once for the agent only', async () => {
    const { agent, landlord, tenant, tenancy } = await fixture()
    expect(await dueRenewals(agent.id, new Date('2070-10-16T23:59:59Z'))).toEqual([])
    expect(await dueRenewals(agent.id, now)).toMatchObject([{ id: tenancy.id }])
    expect(await dueRenewals(landlord.id, now)).toEqual([])
    expect(await dueRenewals(tenant.id, now)).toEqual([])
    await queueRenewalReminders(now)
    await queueRenewalReminders(now)
    const notifications = await db.notification.findMany({ where: { recipientId: agent.id } })
    expect(notifications).toHaveLength(1)
    expect(notifications[0]).toMatchObject({ kind: 'RENEWAL_DUE', emailSentAt: null, pushExpandedAt: null, href: '/inspections' })
  })

  it('does not remind before the threshold, after tenancy end or a completed check-out', async () => {
    const early = await fixture('2071-01-18')
    const expired = await fixture('2070-10-16')
    const checkedOut = await fixture()
    await db.inspection.create({ data: { tenancyId: checkedOut.tenancy.id, kind: 'CHECK_OUT', status: 'COMPLETED', conductedById: checkedOut.agent.id } })
    for (const item of [early, expired, checkedOut]) expect(await dueRenewals(item.agent.id, now)).toEqual([])
  })

  it('lets teammates snooze and dismiss without giving the parties or another agent access', async () => {
    const { agent, landlord, tenancy } = await fixture()
    const team = await db.team.create({ data: { name: `Renewal team ${tag}` } })
    const teammate = await db.stakeholder.create({ data: { name: 'Renewal teammate', teamId: team.id } })
    created.push(teammate.id)
    await db.stakeholder.update({ where: { id: agent.id }, data: { teamId: team.id } })
    expect(await dueRenewals(teammate.id, now)).toMatchObject([{ id: tenancy.id }])
    vi.mocked(requireAgent).mockResolvedValueOnce(landlord)
    await expect(respondToRenewal(tenancy.id, 'DISMISSED')).rejects.toThrow('Tenancy not found')
    vi.mocked(requireAgent).mockResolvedValueOnce(teammate)
    const clock = vi.spyOn(Date, 'now').mockReturnValue(now.getTime())
    await respondToRenewal(tenancy.id, 'LATER')
    clock.mockRestore()
    const snoozed = await db.tenancy.findUniqueOrThrow({ where: { id: tenancy.id } })
    expect(snoozed.renewalSnoozedUntil!.getTime()).toBe(now.getTime() + 7 * 86400000)
    expect(await dueRenewals(agent.id, now)).toEqual([])
    expect(await dueRenewals(agent.id, new Date(now.getTime() + 7 * 86400000))).toMatchObject([{ id: tenancy.id }])
    vi.mocked(requireAgent).mockResolvedValueOnce(teammate)
    await respondToRenewal(tenancy.id, 'NOT_RENEWING')
    expect(await dueRenewals(agent.id, now)).toEqual([])
    await db.stakeholder.updateMany({ where: { teamId: team.id }, data: { teamId: null } })
    await db.team.delete({ where: { id: team.id } })
  })

  it('reuses the property and parties in one new term, leaving the signed term frozen', async () => {
    const { agent, landlord, tenant, property, tenancy } = await fixture()
    const input = { startDate: '2071-01-18', endDate: '2073-01-17', monthlyRent: '3300', deposit: '6600' }
    vi.mocked(requireAgent).mockResolvedValueOnce(landlord)
    await expect(createRenewal(tenancy.id, input)).rejects.toThrow('Tenancy not found')
    vi.mocked(requireAgent).mockResolvedValueOnce(agent)
    await expect(createRenewal(tenancy.id, { ...input, startDate: '2071-01-17' })).rejects.toThrow('Renewal dates must follow')
    vi.mocked(requireAgent).mockResolvedValueOnce(agent)
    const id = await createRenewal(tenancy.id, input)
    vi.mocked(requireAgent).mockResolvedValueOnce(agent)
    expect(await createRenewal(tenancy.id, input)).toBe(id)
    const renewal = await db.inspection.findUniqueOrThrow({ where: { id }, include: { tenancy: true } })
    expect(renewal).toMatchObject({ status: 'DRAFT', kind: 'CHECK_IN', conductedById: agent.id })
    expect(renewal.tenancy).toMatchObject({ propertyId: property.id, landlordId: landlord.id, tenantId: tenant.id, renewedFromId: tenancy.id })
    const original = await db.tenancy.findUniqueOrThrow({ where: { id: tenancy.id } })
    expect(original.endDate).toEqual(tenancy.endDate)
    expect(original.monthlyRent.toString()).toBe('3000')
    expect(await dueRenewals(agent.id, now)).toEqual([])
  })

  it('does not rebuild a deleted account inbox', async () => {
    const { agent } = await fixture()
    await db.accountDeletionRequest.create({ data: {
      stakeholderId: agent.id, status: 'COMPLETED', dueAt: now,
    } })
    await queueRenewalReminders(now)
    expect(await db.notification.count({ where: { recipientId: agent.id } })).toBe(0)
    await db.accountDeletionRequest.delete({ where: { stakeholderId: agent.id } })
  })
})
