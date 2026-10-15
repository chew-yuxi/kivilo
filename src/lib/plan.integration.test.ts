import { afterAll, describe, expect, it, vi } from 'vitest'
import { randomUUID } from 'node:crypto'

/// A workspace may hold as many active properties as its plan allows, and no more. These
/// tests pin what counts (a running tenancy whose check-out is not signed), that a team
/// shares one allowance, and that only a live subscription lifts Free's.

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/headers', () => ({ headers: async () => new Headers() }))
vi.mock('@/lib/auth', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/auth')>()
  return { ...actual, requireAgent: vi.fn(), currentStakeholder: vi.fn() }
})

import { db } from '@/lib/db'
import { currentStakeholder, requireAgent } from '@/lib/auth'
import { createInspection } from '@/lib/actions'
import { PRO_ACTIVE_PROPERTIES_PER_SEAT, workspacePlan } from '@/lib/plan'
import { GET as planRoute } from '@/app/api/v1/me/plan/route'
import { POST as createRoute } from '@/app/api/v1/inspections/route'
import type { Stakeholder } from '@/generated/prisma'

const postalCode = '994444'
const tag = randomUUID().slice(0, 8)
const created: string[] = []
const teams: string[] = []

async function agent(name: string, teamId: string | null = null) {
  const person = await db.stakeholder.create({ data: { name: `${name} ${tag}`, teamId } })
  created.push(person.id)
  return person
}

const input = {
  line1: `Plan limits ${tag}`,
  unit: null,
  postalCode,
  propertyType: 'HDB' as const,
  landlordName: 'Landlord',
  landlordEmail: null,
  tenantName: 'Tenant',
  tenantEmail: null,
  startDate: '2026-01-01',
  endDate: '2030-01-01',
  monthlyRent: '3000',
  deposit: '6000',
}

async function deal(by: Stakeholder) {
  vi.mocked(requireAgent).mockResolvedValueOnce(by)
  const id = await createInspection(input)
  const { tenancy } = await db.inspection.findUniqueOrThrow({ where: { id }, include: { tenancy: true } })
  created.push(tenancy.landlordId, tenancy.tenantId)
  return { id, tenancy }
}

function attempt(by: Stakeholder) {
  vi.mocked(requireAgent).mockResolvedValueOnce(by)
  return createInspection(input)
}

describe('plan limits', () => {
  afterAll(async () => {
    await db.property.deleteMany({ where: { postalCode } })
    await db.stakeholder.deleteMany({ where: { id: { in: created } } })
    await db.team.deleteMany({ where: { id: { in: teams } } })
    await db.$disconnect()
  })

  it('lets a Free agent hold one active property and refuses a second', async () => {
    const solo = await agent('Solo')
    await deal(solo)

    await expect(attempt(solo)).rejects.toThrow('Plan limit reached')
    expect(await workspacePlan(solo)).toMatchObject({ plan: 'FREE', active: 1, limit: 1 })
  })

  it('stops counting a property once its tenancy ends or its check-out is signed', async () => {
    const ended = await agent('Ended')
    const first = await deal(ended)
    await db.tenancy.update({ where: { id: first.tenancy.id }, data: { endDate: new Date('2020-01-01') } })
    const second = await deal(ended)

    await db.inspection.create({
      data: { tenancyId: second.tenancy.id, kind: 'CHECK_OUT', status: 'AWAITING_SIGNATURE', baselineId: second.id, conductedById: ended.id },
    })
    await expect(attempt(ended)).rejects.toThrow('Plan limit reached')

    await db.inspection.updateMany({ where: { baselineId: second.id }, data: { status: 'COMPLETED' } })
    await deal(ended)
    expect((await workspacePlan(ended)).active).toBe(1)
  })

  it('shares one allowance across a team, a teammate deal included', async () => {
    const team = await db.team.create({ data: { name: `Plan team ${tag}` } })
    teams.push(team.id)
    const lead = await agent('Lead', team.id)
    const teammate = await agent('Teammate', team.id)
    await deal(lead)

    await expect(attempt(teammate)).rejects.toThrow('Plan limit reached')

    await db.subscription.create({
      data: { teamId: team.id, plan: 'PRO', seats: 2, status: 'active', managedById: lead.id },
    })
    expect(await workspacePlan(teammate)).toMatchObject({
      plan: 'PRO',
      active: 1,
      limit: 2 * PRO_ACTIVE_PROPERTIES_PER_SEAT,
      isManager: false,
    })
    await deal(teammate)
    expect((await workspacePlan(lead)).active).toBe(2)
  })

  it('keeps Pro through a failed payment and drops to Free once canceled', async () => {
    const payer = await agent('Payer')
    const subscription = await db.subscription.create({
      data: { stakeholderId: payer.id, plan: 'PRO', seats: 1, status: 'past_due', managedById: payer.id },
    })
    expect((await workspacePlan(payer)).plan).toBe('PRO')

    await db.subscription.update({ where: { id: subscription.id }, data: { status: 'canceled' } })
    expect(await workspacePlan(payer)).toMatchObject({ plan: 'FREE', limit: 1, isManager: true })
  })

  it('refuses through the API as plan_limit, and reports the plan without a price', async () => {
    const app = await agent('App')
    vi.mocked(currentStakeholder).mockResolvedValue(app)
    vi.mocked(requireAgent).mockResolvedValue(app)
    const request = () => new Request('http://kivilo.test/api/v1/inspections', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    const context = { params: Promise.resolve({}) }

    expect((await createRoute(request(), context)).status).toBe(200)
    const refused = await createRoute(request(), context)
    expect(refused.status).toBe(403)
    expect(await refused.json()).toEqual({ error: 'plan_limit' })

    const plan = await planRoute(new Request('http://kivilo.test/api/v1/me/plan'), context)
    expect(await plan.json()).toEqual({ plan: 'FREE', activeProperties: 1, limit: 1, seats: 1, team: null })
    const parties = await db.tenancy.findMany({ where: { agentId: app.id } })
    created.push(...parties.flatMap((tenancy) => [tenancy.landlordId, tenancy.tenantId]))
    vi.mocked(requireAgent).mockReset()
  })
})
