import { randomUUID } from 'node:crypto'
import Stripe from 'stripe'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

/// Stripe is the truth and the Subscription row a copy of it. These pin that the copy is
/// written from a fresh read whatever the event said, that a workspace paying twice is
/// refused rather than overwritten, who may reach checkout and the portal, that the
/// webhook reads nothing it has not verified, and that leaving cannot strand a payment.
/// Stripe itself is replaced by a stand-in holding the subscriptions; the database is real.

const { subscriptions, client } = vi.hoisted(() => {
  const subscriptions = new Map<string, unknown>()
  const client = {
    subscriptions: {
      retrieve: vi.fn(async (id: string) => {
        const found = subscriptions.get(id)
        if (!found) throw new Error(`No such subscription: ${id}`)
        return structuredClone(found)
      }),
      cancel: vi.fn(async (id: string) => {
        const found = subscriptions.get(id) as { status: string }
        found.status = 'canceled'
        return found
      }),
    },
    prices: { list: vi.fn(async () => ({ data: [{ id: 'price_pro' }] })) },
    checkout: {
      sessions: {
        create: vi.fn(async () => ({ url: 'https://checkout.stripe.com/c/pay/cs_test_fake' })),
        retrieve: vi.fn(),
      },
    },
    billingPortal: {
      configurations: {
        list: vi.fn(() => [{ id: 'bpc_fake', metadata: { kivilo: 'pro_portal' } }]),
      },
      sessions: { create: vi.fn(async () => ({ url: 'https://billing.stripe.com/p/session/fake' })) },
    },
    webhooks: undefined as unknown,
  }
  return { subscriptions, client }
})
vi.mock('@/lib/stripe', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/stripe')>()
  const { default: RealStripe } = await import('stripe')
  // Signature checking is the real SDK's, which is the point of testing it.
  client.webhooks = new RealStripe('sk_test_unused').webhooks
  return { ...actual, stripe: () => client }
})
vi.mock('next/headers', () => ({
  headers: async () => new Headers({ origin: 'http://localhost:3000' }),
}))
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT ${url}`)
  },
}))
vi.mock('@/lib/auth', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/auth')>()
  return { ...actual, requireAgent: vi.fn() }
})
vi.mock('@/lib/email', () => ({ sendAccountDeletionComplete: vi.fn(async () => {}) }))

import { db } from '@/lib/db'
import { requireAgent } from '@/lib/auth'
import { syncSubscription } from '@/lib/billing'
import { openBillingPortal, startCheckout } from '@/lib/billing-actions'
import { workspacePlan } from '@/lib/plan'
import { POST as webhook } from '@/app/api/stripe/webhook/route'
import { setTeam } from '../../scripts/set-team'
import { fulfillAccountDeletion } from '../../scripts/fulfill-account-deletion'
import type { Stakeholder } from '@/generated/prisma'

const tag = randomUUID().slice(0, 8)
const people: string[] = []
const teams: string[] = []
const periodEnd = Math.floor(new Date('2026-12-01T00:00:00Z').getTime() / 1000)

async function agent(name: string, teamId: string | null = null) {
  const person = await db.stakeholder.create({
    data: { name: `${name} ${tag}`, email: `billing-${name.toLowerCase()}-${tag}@example.test`, teamId },
  })
  people.push(person.id)
  return person
}

async function team(name: string) {
  const created = await db.team.create({ data: { name: `Billing ${name} ${tag}` } })
  teams.push(created.id)
  return created
}

/// What Stripe would hold for a subscription bought through `startCheckout`.
function paid(id: string, workspace: Record<string, string>, managedById: string, quantity = 1) {
  subscriptions.set(id, {
    id,
    status: 'active',
    customer: `cus_${id}`,
    metadata: { ...workspace, managedById },
    cancel_at: null,
    cancel_at_period_end: false,
    items: { data: [{ quantity, current_period_end: periodEnd }] },
  })
  return subscriptions.get(id) as { status: string; cancel_at_period_end: boolean; items: { data: { quantity: number }[] } }
}

function as(person: Stakeholder) {
  vi.mocked(requireAgent).mockResolvedValueOnce(person)
}

beforeEach(() => vi.clearAllMocks())

afterAll(async () => {
  vi.unstubAllEnvs()
  await db.accountDeletionRequest.deleteMany({ where: { stakeholderId: { in: people } } })
  await db.subscription.deleteMany({ where: { OR: [{ stakeholderId: { in: people } }, { teamId: { in: teams } }] } })
  await db.stakeholder.deleteMany({ where: { id: { in: people } } })
  await db.team.deleteMany({ where: { id: { in: teams } } })
  await db.$disconnect()
})

describe('syncSubscription', () => {
  it('writes the same current state however often, and in whatever order, events arrive', async () => {
    const solo = await agent('Solo')
    const live = paid(`sub_solo_${tag}`, { stakeholderId: solo.id }, solo.id)

    await syncSubscription(`sub_solo_${tag}`)
    await syncSubscription(`sub_solo_${tag}`)
    expect(await db.subscription.count({ where: { stakeholderId: solo.id } })).toBe(1)
    expect(await workspacePlan(solo)).toMatchObject({ plan: 'PRO', seats: 1 })
    expect(await db.subscription.findUniqueOrThrow({ where: { stakeholderId: solo.id } })).toMatchObject({
      status: 'active', stripeCustomerId: `cus_sub_solo_${tag}`, managedById: solo.id,
      currentPeriodEnd: new Date(periodEnd * 1000), cancelAtPeriodEnd: false,
    })

    // The agent cancels and Stripe ends it; then the stale "created" event is redelivered.
    // It is re-read, not trusted, so the row stays canceled.
    live.status = 'canceled'
    await syncSubscription(`sub_solo_${tag}`)
    await syncSubscription(`sub_solo_${tag}`)
    expect(await workspacePlan(solo)).toMatchObject({ plan: 'FREE', limit: 1 })
  })

  it('refuses a second live subscription for a workspace already paying, and records nothing', async () => {
    const office = await team('Race')
    const first = await agent('First', office.id)
    const second = await agent('Second', office.id)
    paid(`sub_race_a_${tag}`, { teamId: office.id }, first.id, 2)
    const duplicate = paid(`sub_race_b_${tag}`, { teamId: office.id }, second.id, 2)

    await syncSubscription(`sub_race_a_${tag}`)
    await expect(syncSubscription(`sub_race_b_${tag}`)).rejects.toThrow(
      `already pays through sub_race_a_${tag}; refusing to replace it with sub_race_b_${tag}`,
    )
    const row = await db.subscription.findUniqueOrThrow({ where: { teamId: office.id } })
    expect(row).toMatchObject({ stripeSubscriptionId: `sub_race_a_${tag}`, managedById: first.id })

    // We refund and cancel the duplicate: its own events then leave the row alone.
    duplicate.status = 'canceled'
    await syncSubscription(`sub_race_b_${tag}`)
    expect(await db.subscription.findUniqueOrThrow({ where: { teamId: office.id } })).toEqual(row)
  })

  it('replaces a comp, or a subscription that has ended, and hands billing to the new payer', async () => {
    const office = await team('Comp')
    const comper = await agent('Comper', office.id)
    const payer = await agent('Payer', office.id)
    await db.subscription.create({
      data: { teamId: office.id, plan: 'PRO', seats: 3, status: 'comped', managedById: comper.id },
    })
    paid(`sub_comp_${tag}`, { teamId: office.id }, payer.id, 2)

    await syncSubscription(`sub_comp_${tag}`)
    expect(await db.subscription.findUniqueOrThrow({ where: { teamId: office.id } })).toMatchObject({
      status: 'active', seats: 2, stripeSubscriptionId: `sub_comp_${tag}`, managedById: payer.id,
    })
  })
})

describe('checkout and the billing portal', () => {
  it('sends a Free agent to Checkout for one seat per team member, keyed to the workspace', async () => {
    const office = await team('Checkout')
    const manager = await agent('Manager', office.id)
    await agent('Member', office.id)
    await agent('Other', office.id)

    as(manager)
    await expect(startCheckout()).rejects.toThrow('REDIRECT https://checkout.stripe.com/')
    expect(client.checkout.sessions.create).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      mode: 'subscription',
      line_items: [{ price: 'price_pro', quantity: 3 }],
      customer_email: manager.email,
      subscription_data: { metadata: { teamId: office.id, managedById: manager.id } },
      success_url: 'http://localhost:3000/account?checkout={CHECKOUT_SESSION_ID}',
    }))
    expect(client.checkout.sessions.create.mock.calls[0]).not.toHaveProperty('0.payment_method_types')
  })

  it('opens the portal for the member who pays and for nobody else on the team', async () => {
    const office = await team('Portal')
    const manager = await agent('Holder', office.id)
    const teammate = await agent('Teammate', office.id)
    paid(`sub_portal_${tag}`, { teamId: office.id }, manager.id, 2)
    await syncSubscription(`sub_portal_${tag}`)

    as(teammate)
    await expect(openBillingPortal()).rejects.toThrow('Not found')
    as(teammate)
    await expect(startCheckout()).rejects.toThrow('already on Pro')
    expect(client.billingPortal.sessions.create).not.toHaveBeenCalled()

    as(manager)
    await expect(openBillingPortal()).rejects.toThrow('REDIRECT https://billing.stripe.com/')
    expect(client.billingPortal.sessions.create).toHaveBeenCalledExactlyOnceWith({
      customer: `cus_sub_portal_${tag}`,
      configuration: 'bpc_fake',
      return_url: 'http://localhost:3000/account?billing=returned',
    })

    // Once nobody manages it, the payer's card and invoices are still nobody else's.
    await db.subscription.update({ where: { teamId: office.id }, data: { managedById: null } })
    as(teammate)
    await expect(openBillingPortal()).rejects.toThrow('Not found')
  })
})

describe('the Stripe webhook', () => {
  const secret = 'whsec_test_kivilo'

  function post(body: string, signature: string | null) {
    return webhook(new Request('http://localhost/api/stripe/webhook', {
      method: 'POST',
      body,
      headers: signature ? { 'stripe-signature': signature } : {},
    }))
  }

  it('reads nothing it has not verified, then syncs from Stripe', async () => {
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', secret)
    const solo = await agent('Hooked')
    paid(`sub_hook_${tag}`, { stakeholderId: solo.id }, solo.id)
    const body = JSON.stringify({
      id: 'evt_test', object: 'event', type: 'customer.subscription.created',
      data: { object: { id: `sub_hook_${tag}` } },
    })

    expect((await post(body, null)).status).toBe(400)
    expect((await post(body, 't=1,v1=forged')).status).toBe(400)
    const wrongSecret = client.webhooks as Stripe['webhooks']
    expect((await post(body, wrongSecret.generateTestHeaderString({ payload: body, secret: 'whsec_other' }))).status).toBe(400)
    // Signed correctly, but over a different body.
    const signed = wrongSecret.generateTestHeaderString({ payload: body, secret })
    expect((await post(body.replace('created', 'deleted'), signed)).status).toBe(400)
    expect(client.subscriptions.retrieve).not.toHaveBeenCalled()
    expect(await db.subscription.count({ where: { stakeholderId: solo.id } })).toBe(0)

    const accepted = await post(body, signed)
    expect(accepted.status).toBe(200)
    expect(client.subscriptions.retrieve).toHaveBeenCalledExactlyOnceWith(`sub_hook_${tag}`)
    expect(await workspacePlan(solo)).toMatchObject({ plan: 'PRO' })
  })
})

describe('leaving a paid plan behind', () => {
  it('will not put an agent paying on their own onto a team until that subscription has ended', async () => {
    const solo = await agent('Mover')
    const own = paid(`sub_mover_${tag}`, { stakeholderId: solo.id }, solo.id)
    await syncSubscription(`sub_mover_${tag}`)
    const name = `Billing Joined ${tag}`

    await expect(setTeam(solo.email!, name)).rejects.toThrow(`pays for Pro on their own (sub_mover_${tag})`)
    expect((await db.stakeholder.findUniqueOrThrow({ where: { id: solo.id } })).teamId).toBeNull()

    own.status = 'canceled'
    await syncSubscription(`sub_mover_${tag}`)
    const joined = await setTeam(solo.email!, name)
    teams.push(joined.teamId!)
    expect(joined.team?.name).toBe(name)
  })

  it('cancels the plan a deleted agent pays for, so a teammate can subscribe on their own card', async () => {
    vi.stubEnv('KIVILO_RETAIN_SIGNED_RECORDS', '1')
    vi.stubEnv('KIVILO_DELETE_SOLE_UNSIGNED_RECORDS', '1')
    vi.stubEnv('KIVILO_RETAIN_SHARED_UNSIGNED_RECORDS', '1')
    const office = await team('Deleted')
    const leaver = await agent('Leaver', office.id)
    const teammate = await agent('Stayer', office.id)
    paid(`sub_leaver_${tag}`, { teamId: office.id }, leaver.id, 2)
    await syncSubscription(`sub_leaver_${tag}`)
    const request = await db.accountDeletionRequest.create({
      data: { stakeholderId: leaver.id, email: leaver.email, dueAt: new Date('2099-01-01') },
    })

    // Completion can wait on unrelated storage purges; the cancellation comes first.
    await fulfillAccountDeletion(request.id, 'billing-integration-test').catch((error: Error) => {
      if (!error.message.startsWith('Deletion remains PROCESSING')) throw error
    })
    expect(client.subscriptions.cancel).toHaveBeenCalledExactlyOnceWith(`sub_leaver_${tag}`)
    expect(await db.subscription.findUniqueOrThrow({ where: { teamId: office.id } })).toMatchObject({
      status: 'canceled', managedById: null,
    })
    expect(await workspacePlan(teammate)).toMatchObject({ plan: 'FREE', isManager: true })

    // A rerun does not cancel twice.
    await fulfillAccountDeletion(request.id, 'billing-integration-test').catch((error: Error) => {
      if (!error.message.startsWith('Deletion remains PROCESSING')) throw error
    })
    expect(client.subscriptions.cancel).toHaveBeenCalledTimes(1)

    // The teammate starts afresh, with a customer of their own.
    as(teammate)
    await expect(startCheckout()).rejects.toThrow('REDIRECT https://checkout.stripe.com/')
    expect(client.checkout.sessions.create).toHaveBeenCalledWith(expect.objectContaining({
      customer: undefined, customer_email: teammate.email,
      subscription_data: { metadata: { teamId: office.id, managedById: teammate.id } },
    }))
  })
})
