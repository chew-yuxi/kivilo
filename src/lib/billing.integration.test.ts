import { randomUUID } from 'node:crypto'
import Stripe from 'stripe'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

/// Stripe is the truth and the Subscription row a copy of it. These pin that the copy is
/// written from a fresh read whatever the event said, that a workspace paying twice is
/// refused rather than overwritten, who may reach checkout and the portal, that the
/// webhook reads nothing it has not verified, and that leaving cannot strand a payment.
/// Stripe itself is replaced by a stand-in holding the subscriptions; the database is real.

const { subscriptions, invoices, client } = vi.hoisted(() => {
  const subscriptions = new Map<string, unknown>()
  const invoices = new Map<string, unknown>()
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
    invoices: {
      retrieve: vi.fn(async (id: string) => {
        const found = invoices.get(id)
        if (!found) throw new Error(`No such invoice: ${id}`)
        return structuredClone(found)
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
  return { subscriptions, invoices, client }
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
import { syncCheckoutSession, syncInvoice, syncSubscription } from '@/lib/billing'
import { checkoutOpen } from '@/lib/stripe'
import { openBillingPortal, startCheckout } from '@/lib/billing-actions'
import { FREE_ACTIVE_PROPERTIES, workspacePlan } from '@/lib/plan'
import { POST as webhook } from '@/app/api/stripe/webhook/route'
import { setTeam } from '../../scripts/set-team'
import { fulfillAccountDeletion } from '../../scripts/fulfill-account-deletion'
import type { Stakeholder } from '@/generated/prisma'

const tag = randomUUID().slice(0, 8)
const people: string[] = []
const teams: string[] = []
const agencies: string[] = []
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
    livemode: /_live_/.test(process.env.STRIPE_SECRET_KEY ?? ''),
    status: 'active',
    customer: `cus_${id}`,
    metadata: { ...workspace, managedById },
    cancel_at: null,
    cancel_at_period_end: false,
    items: { has_more: false, data: [{ quantity, current_period_end: periodEnd, price: {
      product: 'kivilo_pro', type: 'recurring', currency: 'sgd', unit_amount: 3900,
      livemode: /_live_/.test(process.env.STRIPE_SECRET_KEY ?? ''),
      recurring: { interval: 'month', interval_count: 1, usage_type: 'licensed' },
    } }] },
  })
  return subscriptions.get(id) as Stripe.Subscription
}

function as(person: Stakeholder) {
  vi.mocked(requireAgent).mockResolvedValueOnce(person)
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('VERCEL_ENV', 'development')
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_unused')
  vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_test_kivilo')
})

afterAll(async () => {
  vi.unstubAllEnvs()
  await db.accountDeletionRequest.deleteMany({ where: { stakeholderId: { in: people } } })
  await db.subscription.deleteMany({ where: { OR: [{ stakeholderId: { in: people } }, { teamId: { in: teams } }] } })
  await db.agency.deleteMany({ where: { id: { in: agencies } } })
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
    expect(await workspacePlan(solo)).toMatchObject({ plan: 'FREE', limit: FREE_ACTIVE_PROPERTIES })
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

  it('re-reads after acquiring the workspace lock instead of applying a delayed active snapshot', async () => {
    const payer = await agent('Concurrent-cancel')
    const id = `sub_concurrent_cancel_${tag}`
    const current = paid(id, { stakeholderId: payer.id }, payer.id)
    await syncSubscription(id)
    let started!: () => void
    let resume!: () => void
    const reading = new Promise<void>((resolve) => { started = resolve })
    const released = new Promise<void>((resolve) => { resume = resolve })
    client.subscriptions.retrieve.mockImplementationOnce(async () => {
      const old = structuredClone(current)
      started()
      await released
      return old
    })
    const delayed = syncSubscription(id)
    await reading
    try {
      current.status = 'canceled'
      await syncSubscription(id)
    } finally {
      resume()
    }
    await delayed
    expect(await workspacePlan(payer)).toMatchObject({ plan: 'FREE', subscription: { status: 'canceled' } })
  })

  it('serializes simultaneous first delivery and competing replacements of an ended subscription', async () => {
    const payer = await agent('Concurrent-replace')
    const initialId = `sub_concurrent_initial_${tag}`
    const initial = paid(initialId, { stakeholderId: payer.id }, payer.id)
    await Promise.all([syncSubscription(initialId), syncSubscription(initialId)])
    expect(await db.subscription.count({ where: { stakeholderId: payer.id } })).toBe(1)
    initial.status = 'canceled'
    await syncSubscription(initialId)
    const ids = [`sub_concurrent_a_${tag}`, `sub_concurrent_b_${tag}`]
    for (const id of ids) paid(id, { stakeholderId: payer.id }, payer.id)
    const results = await Promise.allSettled(ids.map((id) => syncSubscription(id)))
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    const refusal = results.find((result) => result.status === 'rejected')
    expect(refusal?.status === 'rejected' && refusal.reason.message).toContain('already pays through')
    const saved = await db.subscription.findUniqueOrThrow({ where: { stakeholderId: payer.id } })
    const winner = results.findIndex((result) => result.status === 'fulfilled')
    expect(saved.stripeSubscriptionId).toBe(ids[winner])
  })

  it.each(['product', 'currency', 'metered', 'annual', 'multiple', 'zero-seats', 'free-price']) (
    'refuses an unsupported %s catalog shape before granting Pro', async (change) => {
      const payer = await agent(`Catalog-${change}`)
      const id = `sub_catalog_${change}_${tag}`
      const value = paid(id, { stakeholderId: payer.id }, payer.id)
      const item = value.items.data[0]
      if (change === 'product') item.price.product = 'another_product'
      if (change === 'currency') item.price.currency = 'usd'
      if (change === 'metered') item.price.recurring!.usage_type = 'metered'
      if (change === 'annual') item.price.recurring!.interval = 'year'
      if (change === 'multiple') value.items.data.push(structuredClone(item))
      if (change === 'zero-seats') item.quantity = 0
      if (change === 'free-price') item.price.unit_amount = 0
      await expect(syncSubscription(id)).rejects.toThrow('not a supported Kivilo Pro subscription')
      expect(await db.subscription.findUnique({ where: { stakeholderId: payer.id } })).toBeNull()
    },
  )

  it('refuses production sandbox resources through direct sync and the Checkout return', async () => {
    const payer = await agent('Mode-boundary')
    const id = `sub_mode_${tag}`
    paid(id, { stakeholderId: payer.id }, payer.id)
    vi.stubEnv('VERCEL_ENV', 'production')
    await expect(syncSubscription(id)).rejects.toThrow('mode does not match')
    vi.stubEnv('STRIPE_SECRET_KEY', 'rk_live_unused')
    await expect(syncSubscription(id)).rejects.toThrow('mode does not match')
    client.checkout.sessions.retrieve.mockResolvedValue({
      livemode: false, mode: 'subscription', payment_status: 'paid', subscription: id,
    })
    await expect(syncCheckoutSession('cs_test_mode')).rejects.toThrow('mode does not match')
    expect(await db.subscription.findUnique({ where: { stakeholderId: payer.id } })).toBeNull()
  })
})

describe('checkout and the billing portal', () => {
  it.each([
    ['development', '', 'whsec_configured', false],
    ['development', 'sk_test_unused', '', false],
    ['development', 'pk_test_unused', 'whsec_configured', false],
    ['development', 'rk_test_unused', 'whsec_configured', true],
    ['production', 'sk_test_unused', 'whsec_configured', false],
    ['production', 'rk_live_unused', '', false],
    ['production', 'rk_live_unused', 'invalid', false],
    ['production', 'rk_live_unused', 'whsec_configured', true],
    ['production', 'sk_live_unused', 'whsec_configured', true],
  ])('checkout readiness: %s / %s / %s is %s', (environment, key, secret, open) => {
    vi.stubEnv('VERCEL_ENV', environment)
    vi.stubEnv('STRIPE_SECRET_KEY', key)
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', secret)
    expect(checkoutOpen()).toBe(open)
  })

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

  it('sells nothing in production on a sandbox key, where the public test card would buy Pro', async () => {
    const solo = await agent('Sandbox')
    vi.stubEnv('VERCEL_ENV', 'production')
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_sandbox')

    as(solo)
    await expect(startCheckout()).rejects.toThrow('Pro is not on sale yet')
    expect(client.checkout.sessions.create).not.toHaveBeenCalled()
    vi.unstubAllEnvs()
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
  beforeEach(() => vi.stubEnv('STRIPE_SECRET_KEY', 'rk_live_unused'))

  function post(body: string, signature: string | null) {
    return webhook(new Request('http://localhost/api/stripe/webhook', {
      method: 'POST',
      body,
      headers: signature ? { 'stripe-signature': signature } : {},
    }))
  }

  function signedEvent(type: string, object: Record<string, unknown>, overrides: Record<string, unknown> = {}) {
    const body = JSON.stringify({
      id: 'evt_test', object: 'event', type,
      livemode: /_live_/.test(process.env.STRIPE_SECRET_KEY ?? ''), data: { object }, ...overrides,
    })
    const signature = (client.webhooks as Stripe['webhooks']).generateTestHeaderString({ payload: body, secret })
    return post(body, signature)
  }

  async function acquired(name: string, teamId: string | null = null) {
    const person = await agent(name, teamId)
    await db.accountAcquisition.create({ data: {
      stakeholderId: person.id, verifiedAt: new Date('2026-10-01'), source: 'direct', entryPoint: 'web',
    } })
    return person
  }

  function invoice(id: string, subscriptionId: string, overrides: Record<string, unknown> = {}) {
    const value = {
      id, livemode: true, status: 'paid', amount_paid: 3900, amount_paid_off_stripe: 0, currency: 'sgd',
      customer: `cus_${subscriptionId}`,
      parent: { type: 'subscription_details', subscription_details: { subscription: subscriptionId } },
      status_transitions: { paid_at: Math.floor(new Date('2026-10-26T10:00:00Z').getTime() / 1000) },
      ...overrides,
    }
    invoices.set(id, value)
    return value
  }

  it('ignores signed events from the wrong mode or a connected account without reads or writes', async () => {
    for (const overrides of [{ livemode: false }, { account: 'acct_connected' }]) {
      expect((await signedEvent('customer.subscription.created', { id: 'sub_unrelated' }, overrides)).status).toBe(200)
    }
    expect(client.subscriptions.retrieve).not.toHaveBeenCalled()
    expect(client.invoices.retrieve).not.toHaveBeenCalled()
  })

  it('reconciles failed and paid invoices from the current subscription without recording a conversion', async () => {
    const payer = await acquired('Invoice-lifecycle')
    const id = `sub_lifecycle_${tag}`
    const current = paid(id, { stakeholderId: payer.id }, payer.id)
    const bill = invoice(`in_lifecycle_${tag}`, id, { status: 'open' })
    current.status = 'past_due'
    await signedEvent('invoice.payment_failed', { id: bill.id })
    expect(await workspacePlan(payer)).toMatchObject({ plan: 'PRO', subscription: { status: 'past_due' } })
    current.status = 'active'
    invoice(bill.id, id)
    await signedEvent('invoice.paid', { id: bill.id })
    // An old failure delivered after recovery must not put the account back past due.
    await signedEvent('invoice.payment_failed', { id: bill.id, status: 'open' })
    expect(await workspacePlan(payer)).toMatchObject({ subscription: { status: 'active' } })
    expect((await db.accountAcquisition.findUniqueOrThrow({ where: { stakeholderId: payer.id } })).firstPaidAt).toBeNull()
    current.status = 'unpaid'
    await signedEvent('invoice.payment_failed', { id: bill.id })
    expect(await workspacePlan(payer)).toMatchObject({ plan: 'FREE', subscription: { status: 'unpaid' } })
  })

  it('checks invoice mode and customer before entitlement changes', async () => {
    const payer = await acquired('Invoice-boundary')
    const id = `sub_invoice_boundary_${tag}`
    const current = paid(id, { stakeholderId: payer.id }, payer.id)
    await syncSubscription(id)
    current.status = 'canceled'
    const wrongMode = invoice(`in_wrong_mode_${tag}`, id, { livemode: false })
    await expect(syncInvoice(wrongMode.id)).rejects.toThrow('mode does not match')
    const wrongCustomer = invoice(`in_wrong_lifecycle_customer_${tag}`, id, { customer: 'cus_other' })
    await expect(syncInvoice(wrongCustomer.id)).rejects.toThrow('invoice customer')
    expect(await workspacePlan(payer)).toMatchObject({ plan: 'PRO', subscription: { status: 'active' } })
    const standalone = invoice(`in_standalone_lifecycle_${tag}`, id, { parent: null })
    expect(await syncInvoice(standalone.id)).toBeNull()
  })

  it('reads nothing it has not verified, then syncs from Stripe', async () => {
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', secret)
    const solo = await agent('Hooked')
    paid(`sub_hook_${tag}`, { stakeholderId: solo.id }, solo.id)
    const body = JSON.stringify({
      id: 'evt_test', object: 'event', type: 'customer.subscription.created', livemode: true,
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
    expect(client.subscriptions.retrieve).toHaveBeenCalledTimes(2)
    expect(client.subscriptions.retrieve).toHaveBeenNthCalledWith(1, `sub_hook_${tag}`)
    expect(await workspacePlan(solo)).toMatchObject({ plan: 'PRO' })
  })

  it('re-reads signed invoices and retains the earliest actual live payment for the team payer', async () => {
    const office = await team('Conversion')
    const payer = await acquired('Conversion', office.id)
    const member = await acquired('Conversion-member', office.id)
    const sub = `sub_conversion_${tag}`
    paid(sub, { teamId: office.id }, payer.id, 2)
    const first = invoice(`in_conversion_${tag}`, sub, { amount_paid: 4800, amount_paid_off_stripe: 900 })

    // The event's amount and customer are not authoritative. Its id is the only input.
    const event = { id: first.id, livemode: false, amount_paid: 1, customer: 'cus_wrong' }
    expect((await signedEvent('invoice.payment_succeeded', event)).status).toBe(200)
    const saved = await db.accountAcquisition.findUniqueOrThrow({ where: { stakeholderId: payer.id } })
    expect(saved).toMatchObject({
      firstPaidAt: new Date('2026-10-26T10:00:00Z'), firstPaidInvoiceId: first.id,
      firstPaidAmount: 3900, firstPaidCurrency: 'sgd',
    })
    expect(client.invoices.retrieve).toHaveBeenCalledWith(first.id, { expand: ['amount_paid_off_stripe'] })
    await signedEvent('invoice.payment_succeeded', event)
    invoice(`in_renewal_${tag}`, sub, {
      amount_paid: 7800,
      status_transitions: { paid_at: Math.floor(new Date('2026-11-26T10:00:00Z').getTime() / 1000) },
    })
    await signedEvent('invoice.payment_succeeded', { id: `in_renewal_${tag}` })
    expect(await db.accountAcquisition.findUniqueOrThrow({ where: { stakeholderId: payer.id } })).toEqual(saved)
    const earlier = invoice(`in_earlier_${tag}`, sub, {
      amount_paid: 1900,
      status_transitions: { paid_at: Math.floor(new Date('2026-10-15T10:00:00Z').getTime() / 1000) },
    })
    await signedEvent('invoice.payment_succeeded', { id: earlier.id })
    // Delivery order must not define the first payment. Replaying either invoice keeps
    // the earliest qualifying date, together with that invoice's amount and currency.
    await signedEvent('invoice.payment_succeeded', event)
    await signedEvent('invoice.payment_succeeded', { id: earlier.id })
    expect(await db.accountAcquisition.findUniqueOrThrow({ where: { stakeholderId: payer.id } })).toMatchObject({
      firstPaidAt: new Date('2026-10-15T10:00:00Z'), firstPaidInvoiceId: earlier.id,
      firstPaidAmount: 1900, firstPaidCurrency: 'sgd',
    })
    expect((await db.accountAcquisition.findUniqueOrThrow({ where: { stakeholderId: member.id } })).firstPaidAt).toBeNull()
  })

  it.each([
    ['test', { livemode: false }],
    ['trial', { amount_paid: 0 }],
    ['offline', { amount_paid_off_stripe: 3900 }],
    ['unpaid', { status: 'open' }],
    ['standalone', { parent: null }],
  ])('does not count a %s invoice as a paid conversion', async (name, overrides) => {
    if (name === 'test') vi.stubEnv('STRIPE_SECRET_KEY', 'rk_test_unused')
    const payer = await acquired(`Excluded-${name}`)
    const sub = `sub_excluded_${name}_${tag}`
    paid(sub, { stakeholderId: payer.id }, payer.id)
    const created = invoice(`in_excluded_${name}_${tag}`, sub, overrides)
    expect((await signedEvent('invoice.payment_succeeded', { id: created.id })).status).toBe(200)
    expect((await db.accountAcquisition.findUniqueOrThrow({ where: { stakeholderId: payer.id } })).firstPaidAt).toBeNull()
    expect(client.subscriptions.retrieve).not.toHaveBeenCalled()
  })

  it('counts neither an active/trial entitlement, a comp, nor a checkout return as a payment', async () => {
    const payer = await acquired('Entitlement')
    const sub = `sub_entitlement_${tag}`
    const current = paid(sub, { stakeholderId: payer.id }, payer.id)
    current.status = 'trialing'
    await signedEvent('customer.subscription.created', { id: sub })
    current.status = 'active'
    client.checkout.sessions.retrieve.mockResolvedValue({ livemode: true, mode: 'subscription', subscription: sub, payment_status: 'paid' })
    await signedEvent('checkout.session.completed', { id: 'cs_completed', mode: 'subscription' })
    await db.subscription.update({ where: { stakeholderId: payer.id }, data: { status: 'comped' } })
    expect((await db.accountAcquisition.findUniqueOrThrow({ where: { stakeholderId: payer.id } })).firstPaidAt).toBeNull()
    expect(client.invoices.retrieve).not.toHaveBeenCalled()
  })

  it('waits for a delayed Checkout payment before syncing its subscription', async () => {
    const payer = await acquired('Delayed')
    const sub = `sub_delayed_${tag}`
    paid(sub, { stakeholderId: payer.id }, payer.id)
    client.checkout.sessions.retrieve.mockResolvedValue({ livemode: true, mode: 'subscription', subscription: sub, payment_status: 'unpaid' })
    await signedEvent('checkout.session.completed', { id: 'cs_delayed', mode: 'subscription' })
    expect(client.subscriptions.retrieve).not.toHaveBeenCalled()
    client.checkout.sessions.retrieve.mockResolvedValue({ livemode: true, mode: 'subscription', subscription: sub, payment_status: 'paid' })
    await signedEvent('checkout.session.async_payment_succeeded', { id: 'cs_delayed', mode: 'subscription' })
    expect(await workspacePlan(payer)).toMatchObject({ plan: 'PRO' })
    expect((await db.accountAcquisition.findUniqueOrThrow({ where: { stakeholderId: payer.id } })).firstPaidAt).toBeNull()
  })

  it('does not invent acquisition for a legacy payer or count a payment before verified signup', async () => {
    const legacy = await agent('Legacy-paid')
    const recent = await acquired('Recent-paid')
    await db.accountAcquisition.update({ where: { stakeholderId: recent.id }, data: { verifiedAt: new Date('2026-10-27') } })
    for (const person of [legacy, recent]) {
      const sub = `sub_before_${person.id}`
      paid(sub, { stakeholderId: person.id }, person.id)
      const created = invoice(`in_before_${person.id}`, sub)
      await signedEvent('invoice.payment_succeeded', { id: created.id })
    }
    expect(await db.accountAcquisition.findUnique({ where: { stakeholderId: legacy.id } })).toBeNull()
    expect((await db.accountAcquisition.findUniqueOrThrow({ where: { stakeholderId: recent.id } })).firstPaidAt).toBeNull()
  })

  it('uses the stored billing manager and refuses a mismatched customer or a cleared manager', async () => {
    const payer = await acquired('Owner-paid')
    const other = await acquired('Other-paid')
    const sub = `sub_owner_${tag}`
    paid(sub, { stakeholderId: payer.id }, payer.id)
    await syncSubscription(sub)
    // Stripe metadata can be stale after local account handling; it cannot change ownership.
    paid(sub, { stakeholderId: payer.id }, other.id)
    const wrong = invoice(`in_wrong_customer_${tag}`, sub, { customer: 'cus_unrelated' })
    await expect(signedEvent('invoice.payment_succeeded', { id: wrong.id })).rejects.toThrow('invoice customer')
    expect((await db.accountAcquisition.findUniqueOrThrow({ where: { stakeholderId: payer.id } })).firstPaidAt).toBeNull()
    const right = invoice(`in_right_owner_${tag}`, sub)
    await signedEvent('invoice.payment_succeeded', { id: right.id })
    expect((await db.accountAcquisition.findUniqueOrThrow({ where: { stakeholderId: payer.id } })).firstPaidInvoiceId).toBe(right.id)
    expect((await db.accountAcquisition.findUniqueOrThrow({ where: { stakeholderId: other.id } })).firstPaidAt).toBeNull()

    const clearedSub = `sub_cleared_${tag}`
    paid(clearedSub, { stakeholderId: other.id }, other.id)
    await syncSubscription(clearedSub)
    await db.subscription.update({ where: { stakeholderId: other.id }, data: { managedById: null } })
    const cleared = invoice(`in_cleared_${tag}`, clearedSub)
    await signedEvent('invoice.payment_succeeded', { id: cleared.id })
    expect((await db.accountAcquisition.findUniqueOrThrow({ where: { stakeholderId: other.id } })).firstPaidAt).toBeNull()
  })

  it('does not credit the current payer for an older discarded subscription', async () => {
    const payer = await acquired('Current-paid')
    const sub = `sub_current_${tag}`
    paid(sub, { stakeholderId: payer.id }, payer.id)
    await syncSubscription(sub)
    const old = `sub_discarded_${tag}`
    paid(old, { stakeholderId: payer.id }, payer.id).status = 'canceled'
    const created = invoice(`in_discarded_${tag}`, old)
    await signedEvent('invoice.payment_succeeded', { id: created.id })
    expect((await db.accountAcquisition.findUniqueOrThrow({ where: { stakeholderId: payer.id } })).firstPaidAt).toBeNull()
  })

  it('fails visibly for missing payment verification data so Stripe can retry', async () => {
    invoice(`in_incomplete_${tag}`, 'sub_unused', { amount_paid_off_stripe: undefined })
    await expect(signedEvent('invoice.payment_succeeded', { id: `in_incomplete_${tag}` })).rejects.toThrow('off-Stripe payment amount')
    invoice(`in_no_date_${tag}`, 'sub_unused', { status_transitions: { paid_at: null } })
    await expect(signedEvent('invoice.payment_succeeded', { id: `in_no_date_${tag}` })).rejects.toThrow('no payment timestamp')
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

  it('will not move the member managing their team\'s subscription off the team until it has ended', async () => {
    const office = await team('Managed')
    const manager = await agent('Treasurer', office.id)
    const teammate = await agent('Colleague', office.id)
    const subscription = paid(`sub_payer_${tag}`, { teamId: office.id }, manager.id, 2)
    await syncSubscription(`sub_payer_${tag}`)

    // Neither off the team nor onto another, whichever way it is asked.
    const refusal = `manages ${office.name}'s Pro subscription (sub_payer_${tag})`
    await expect(setTeam(manager.email!, '')).rejects.toThrow(refusal)
    await expect(setTeam(manager.email!, `Billing Elsewhere ${tag}`)).rejects.toThrow(refusal)
    expect((await db.stakeholder.findUniqueOrThrow({ where: { id: manager.id } })).teamId).toBe(office.id)
    expect(await db.team.count({ where: { name: `Billing Elsewhere ${tag}` } })).toBe(0)
    // Staying put is not a move, and a member who does not manage it may leave.
    expect((await setTeam(manager.email!, office.name)).teamId).toBe(office.id)
    expect((await setTeam(teammate.email!, '')).teamId).toBeNull()

    subscription.status = 'canceled'
    await syncSubscription(`sub_payer_${tag}`)
    expect((await setTeam(manager.email!, '')).teamId).toBeNull()
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


describe('operational team billing', () => {
  it('checks out and reconciles the selected operational team independently of its payer', async () => {
    const owner = await agent('Agency payer')
    const teammate = await agent('Agency teammate')
    const agency = await db.agency.create({ data: { name: `Paid agency ${tag}`, members: { create: [
      { stakeholderId: owner.id, status: 'ACTIVE', role: 'OWNER' },
      { stakeholderId: teammate.id, status: 'ACTIVE', role: 'AGENT' },
    ] } } })
    agencies.push(agency.id)
    const form = new FormData()
    form.set('agencyId', agency.id)
    form.set('seats', '3')
    as(teammate)
    await expect(startCheckout(form)).rejects.toThrow('Only the member who manages billing can subscribe')
    expect(client.checkout.sessions.create).not.toHaveBeenCalled()
    form.set('seats', '1')
    as(owner)
    await expect(startCheckout(form)).rejects.toThrow('enough seats')
    form.set('seats', '3')
    as(owner)
    await expect(startCheckout(form)).rejects.toThrow('REDIRECT https://checkout.stripe.com/')
    expect(client.checkout.sessions.create).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      line_items: [{ price: 'price_pro', quantity: 3 }],
      subscription_data: { metadata: { agencyId: agency.id, managedById: owner.id } },
      success_url: `http://localhost:3000/account?agencyId=${agency.id}&checkout={CHECKOUT_SESSION_ID}`,
    }))
    paid(`sub_agency_${tag}`, { agencyId: agency.id }, owner.id, 3)
    await syncSubscription(`sub_agency_${tag}`)
    expect(await workspacePlan(teammate, agency.id)).toMatchObject({ plan: 'PRO', limit: 75, isManager: false })
    expect(await workspacePlan(owner, null)).toMatchObject({ plan: 'FREE', limit: 5 })
    as(teammate)
    await expect(openBillingPortal(form)).rejects.toThrow('Not found')
    as(owner)
    await expect(openBillingPortal(form)).rejects.toThrow('REDIRECT https://billing.stripe.com/')
    expect(client.billingPortal.sessions.create).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      return_url: `http://localhost:3000/account?agencyId=${agency.id}&billing=returned`,
    }))
  })

  it('refuses mixed workspace metadata instead of charging another plan', async () => {
    const payer = await agent('Mixed target')
    const agency = await db.agency.create({ data: { name: `Mixed agency ${tag}` } })
    agencies.push(agency.id)
    paid(`sub_mixed_${tag}`, { agencyId: agency.id, stakeholderId: payer.id }, payer.id)
    await expect(syncSubscription(`sub_mixed_${tag}`)).rejects.toThrow('exactly one workspace')
    expect(await db.subscription.count({ where: { agencyId: agency.id } })).toBe(0)
  })
})
