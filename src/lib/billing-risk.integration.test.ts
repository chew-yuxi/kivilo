import { randomUUID } from 'node:crypto'
import type Stripe from 'stripe'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

const { invoices, payments, charges, subscriptions, client, sendErrorAlert } = vi.hoisted(() => {
  const invoices = new Map<string, unknown>()
  const payments = new Map<string, { id: string }[][]>()
  const charges = new Map<string, unknown>()
  const subscriptions = new Map<string, unknown>()
  return {
    invoices, payments, charges, subscriptions,
    sendErrorAlert: vi.fn(async () => {}),
    client: {
      invoices: { retrieve: vi.fn(async (id: string) => {
        if (!invoices.has(id)) throw new Error('Invoice unavailable')
        return structuredClone(invoices.get(id))
      }) },
      charges: { retrieve: vi.fn(async (id: string) => {
        if (!charges.has(id)) throw new Error('Charge unavailable')
        return structuredClone(charges.get(id))
      }) },
      subscriptions: { retrieve: vi.fn(async (id: string) => {
        if (!subscriptions.has(id)) throw new Error('Subscription unavailable')
        return structuredClone(subscriptions.get(id))
      }) },
      invoicePayments: { list: vi.fn(async (params: {
        payment: { payment_intent: string }; starting_after?: string
      }) => {
        const pages = payments.get(params.payment.payment_intent) ?? [[]]
        const index = params.starting_after
          ? pages.findIndex((page) => page.at(-1)?.id === params.starting_after) + 1 : 0
        if (index >= pages.length) throw new Error('Unexpected invoice payment page')
        return { data: structuredClone(pages[index]), has_more: index < pages.length - 1 }
      }) },
    },
  }
})
vi.mock('@/lib/stripe', async (importActual) => ({
  ...await importActual<typeof import('@/lib/stripe')>(), stripe: () => client,
}))
vi.mock('@/lib/email', () => ({ sendErrorAlert }))
vi.mock('@/lib/auth', () => ({ requireStakeholder: vi.fn() }))
vi.mock('next/navigation', () => ({ notFound: () => { throw new Error('NOT_FOUND') } }))

import { db } from '@/lib/db'
import { handleBillingRiskEvent } from '@/lib/billing-risk'
import { adminBillingIncidents } from '@/lib/admin'
import { requireStakeholder } from '@/lib/auth'
import { alertNewErrors } from '@/lib/errors'

const tag = randomUUID().replaceAll('-', '')
const people: string[] = []
const prefix = `evt_${tag}`

async function fixture() {
  const suffix = `${tag}_${people.length}`
  const person = await db.stakeholder.create({ data: { name: `Risk ${tag}` } })
  people.push(person.id)
  const subscriptionId = `sub_${suffix}`
  const invoiceId = `in_${suffix}`
  const paymentIntentId = `pi_${suffix}`
  const customerId = `cus_${suffix}`
  const chargeId = `ch_${suffix}`
  const subscription = await db.subscription.create({ data: {
    stakeholderId: person.id, managedById: person.id, plan: 'PRO', seats: 1, status: 'active',
    stripeSubscriptionId: subscriptionId, stripeCustomerId: customerId,
  } })
  const acquisition = await db.accountAcquisition.create({ data: {
    stakeholderId: person.id, verifiedAt: new Date('2026-09-01'), source: 'direct', entryPoint: 'WEB',
    firstPaidAt: new Date('2026-10-01'), firstPaidInvoiceId: invoiceId,
    firstPaidAmount: 3900, firstPaidCurrency: 'sgd',
  } })
  const invoice = {
    id: invoiceId, customer: customerId, livemode: false,
    parent: { type: 'subscription_details', subscription_details: { subscription: subscriptionId } },
  }
  const payment = {
    id: `inpay_${suffix}`, invoice: invoiceId, livemode: false, status: 'paid',
    payment: { type: 'payment_intent', payment_intent: paymentIntentId },
  }
  const charge = {
    id: chargeId, object: 'charge', livemode: false, customer: customerId,
    payment_intent: paymentIntentId, amount_refunded: 1900, refunded: false, currency: 'sgd',
    billing_details: { name: 'Private customer', email: 'private@example.test' },
    metadata: { unrelated: 'sensitive payload' },
  }
  const stripeSubscription = {
    id: subscriptionId, customer: customerId, livemode: false, status: 'active',
    metadata: { stakeholderId: person.id },
    items: { has_more: false, data: [{ quantity: 1, price: {
      product: 'kivilo_pro', type: 'recurring', currency: 'sgd', unit_amount: 3900,
      livemode: false, recurring: { interval: 'month', interval_count: 1, usage_type: 'licensed' },
    } }] },
  }
  invoices.set(invoiceId, invoice)
  payments.set(paymentIntentId, [[payment]])
  charges.set(chargeId, charge)
  subscriptions.set(subscriptionId, stripeSubscription)
  const event = {
    id: `${prefix}_${people.length}`, type: 'charge.refunded', object: 'event',
    created: Math.floor(Date.now() / 1000), livemode: false, data: { object: charge },
  } as unknown as Stripe.ChargeRefundedEvent
  return { person, subscription, acquisition, invoice, payment, charge, event, stripeSubscription,
    subscriptionId, invoiceId, paymentIntentId, customerId, chargeId }
}

async function incidents() {
  return db.errorEvent.findMany({ where: { context: 'stripe_billing', message: { contains: prefix } } })
}

beforeEach(() => {
  vi.clearAllMocks()
  invoices.clear()
  payments.clear()
  charges.clear()
  subscriptions.clear()
  vi.stubEnv('VERCEL_ENV', 'development')
  vi.stubEnv('STRIPE_SECRET_KEY', 'rk_test_unused')
  vi.stubEnv('ADMIN_EMAILS', 'operator@example.test')
  vi.stubEnv('ERROR_ALERT_TO', 'operator@example.test')
})

afterAll(async () => {
  vi.unstubAllEnvs()
  await db.errorEvent.deleteMany({ where: { context: 'stripe_billing', message: { contains: prefix } } })
  await db.stakeholder.deleteMany({ where: { id: { in: people } } })
  await db.$disconnect()
})

describe('billing risk incidents', () => {
  it('follows every InvoicePayments page, deduplicates invoice links and retries without changing access or conversion', async () => {
    const first = await fixture()
    const second = await fixture()
    const secondPayment = { ...second.payment, payment: first.payment.payment }
    payments.set(first.paymentIntentId, [
      Array.from({ length: 100 }, (_, index) => ({ ...first.payment, id: `inpay_${tag}_${index}` })),
      [secondPayment],
    ])
    // A shared PaymentIntent may pay several subscription invoices for one customer.
    second.invoice.customer = first.customerId
    invoices.set(second.invoiceId, second.invoice)
    await db.subscription.update({ where: { id: second.subscription.id }, data: { stripeCustomerId: null } })
    // The local schema keeps one subscription per customer: the second invoice may be
    // a later period of the same subscription rather than a second workspace.
    second.invoice.parent.subscription_details.subscription = first.subscriptionId

    expect(await handleBillingRiskEvent(first.event)).toBe(2)
    expect(await handleBillingRiskEvent(first.event)).toBe(0)
    expect(client.invoicePayments.list).toHaveBeenNthCalledWith(2, {
      payment: { type: 'payment_intent', payment_intent: first.paymentIntentId }, status: 'paid',
      limit: 100, starting_after: `inpay_${tag}_99`,
    })
    const saved = (await incidents()).filter((row) => row.message.includes(first.event.id))
    expect(saved).toHaveLength(2)
    expect(saved.every((row) => row.stakeholderId === null && row.stack === null)).toBe(true)
    expect(saved.map((row) => JSON.parse(row.message).invoiceId).sort()).toEqual([first.invoiceId, second.invoiceId].sort())
    expect(JSON.stringify(saved)).not.toContain('private@example.test')
    expect(JSON.stringify(saved)).not.toContain('sensitive payload')
    expect(await db.subscription.findUniqueOrThrow({ where: { id: first.subscription.id } })).toEqual(first.subscription)
    expect(await db.accountAcquisition.findUniqueOrThrow({ where: { stakeholderId: first.person.id } })).toEqual(first.acquisition)
  })

  it('resolves a dispute with no PaymentIntent through a fresh charge and records its evidence deadline', async () => {
    const f = await fixture()
    const event = { ...f.event, type: 'charge.dispute.created', data: { object: {
      id: `dp_${tag}`, object: 'dispute', charge: f.chargeId, payment_intent: null,
      livemode: false, status: 'needs_response', amount: 3900, currency: 'sgd',
      evidence_details: { due_by: 1800000000 }, evidence: { customer_email_address: 'private@example.test' },
    } } } as unknown as Stripe.ChargeDisputeCreatedEvent
    expect(await handleBillingRiskEvent(event)).toBe(1)
    expect(client.charges.retrieve).toHaveBeenCalledExactlyOnceWith(f.chargeId)
    const saved = (await incidents()).find((row) => row.message.includes(event.id))!
    expect(JSON.parse(saved.message)).toMatchObject({
      type: event.type, status: 'needs_response', evidenceDueAt: 1800000000, amount: 3900,
    })
    expect(saved.message).not.toContain('private@example.test')
  })

  it('records fraud warnings for manual review and makes no Stripe mutation', async () => {
    const f = await fixture()
    const event = { ...f.event, type: 'radar.early_fraud_warning.created', data: { object: {
      id: `issfr_${tag}`, object: 'radar.early_fraud_warning', charge: f.chargeId,
      payment_intent: f.paymentIntentId, livemode: false, actionable: true,
    } } } as unknown as Stripe.RadarEarlyFraudWarningCreatedEvent
    expect(await handleBillingRiskEvent(event)).toBe(1)
    const saved = (await incidents()).find((row) => row.message.includes(event.id))!
    expect(JSON.parse(saved.message)).toMatchObject({ status: 'actionable', amount: null, evidenceDueAt: null })
    expect(client.charges.retrieve).not.toHaveBeenCalled()
    expect(await db.subscription.findUniqueOrThrow({ where: { id: f.subscription.id } })).toEqual(f.subscription)
    expect(await db.accountAcquisition.findUniqueOrThrow({ where: { stakeholderId: f.person.id } })).toEqual(f.acquisition)
  })

  it('ignores unrelated invoices and mismatched charge or subscription customers', async () => {
    for (const mismatch of ['parent', 'charge_customer', 'local_customer']) {
      const f = await fixture()
      if (mismatch === 'parent') f.invoice.parent.type = 'quote_details'
      if (mismatch === 'charge_customer') f.invoice.customer = `cus_other_${tag}`
      if (mismatch === 'local_customer') {
        f.charge.customer = `cus_other_${tag}`
        f.invoice.customer = `cus_other_${tag}`
      }
      expect(await handleBillingRiskEvent(f.event)).toBe(0)
    }
  })

  it.each(['canceled', 'active'])('records risk for an unmapped %s Kivilo subscription without changing the current plan', async (status) => {
    const f = await fixture()
    f.stripeSubscription.status = status
    // Replaced subscriptions and rejected concurrent duplicates are both absent from
    // the current workspace row, but the historical charge still needs review.
    const replacement = await db.subscription.update({ where: { id: f.subscription.id }, data: {
      stripeSubscriptionId: `sub_replacement_${f.subscriptionId}`,
      stripeCustomerId: `cus_replacement_${f.customerId}`,
    } })
    f.stripeSubscription.metadata.stakeholderId = 'metadata-must-not-grant-access'
    expect(await handleBillingRiskEvent(f.event)).toBe(1)
    expect(await handleBillingRiskEvent(f.event)).toBe(0)
    expect(client.subscriptions.retrieve).toHaveBeenCalledWith(f.subscriptionId)
    const saved = (await incidents()).find((row) => row.message.includes(f.event.id))!
    expect(JSON.parse(saved.message)).toMatchObject({ subscriptionId: f.subscriptionId, invoiceId: f.invoiceId })
    expect(await db.subscription.findUniqueOrThrow({ where: { id: f.subscription.id } })).toEqual(replacement)
    expect(await db.accountAcquisition.findUniqueOrThrow({ where: { stakeholderId: f.person.id } })).toEqual(f.acquisition)
  })

  it.each(['product', 'customer', 'multiple-items', 'annual', 'currency', 'metered', 'free-price', 'zero-seats'])(
    'ignores an unmapped subscription with an unsupported %s', async (mismatch) => {
      const f = await fixture()
      await db.subscription.update({ where: { id: f.subscription.id }, data: { stripeSubscriptionId: null } })
      const item = f.stripeSubscription.items.data[0]
      if (mismatch === 'product') item.price.product = 'unrelated_product'
      if (mismatch === 'customer') f.stripeSubscription.customer = 'cus_unrelated'
      if (mismatch === 'multiple-items') f.stripeSubscription.items.data.push(structuredClone(item))
      if (mismatch === 'annual') item.price.recurring.interval = 'year'
      if (mismatch === 'currency') item.price.currency = 'usd'
      if (mismatch === 'metered') item.price.recurring.usage_type = 'metered'
      if (mismatch === 'free-price') item.price.unit_amount = 0
      if (mismatch === 'zero-seats') item.quantity = 0
      expect(await handleBillingRiskEvent(f.event)).toBe(0)
      expect((await incidents()).some((row) => row.message.includes(f.event.id))).toBe(false)
    },
  )

  it.each(['subscription', 'price'])('rejects an unmapped subscription with a wrong-mode %s', async (mismatch) => {
    const f = await fixture()
    await db.subscription.update({ where: { id: f.subscription.id }, data: { stripeSubscriptionId: null } })
    if (mismatch === 'subscription') f.stripeSubscription.livemode = true
    else f.stripeSubscription.items.data[0].price.livemode = true
    await expect(handleBillingRiskEvent(f.event)).rejects.toThrow('mode does not match')
    expect((await incidents()).some((row) => row.message.includes(f.event.id))).toBe(false)
  })

  it('rejects wrong-mode events, payloads, InvoicePayments, invoices and fallback charges before recording', async () => {
    for (const mismatch of ['event', 'object', 'payment', 'invoice', 'charge']) {
      const f = await fixture()
      if (mismatch === 'event') f.event.livemode = true
      if (mismatch === 'object') f.event.data.object.livemode = true
      if (mismatch === 'payment') f.payment.livemode = true
      if (mismatch === 'invoice') f.invoice.livemode = true
      if (mismatch === 'charge') {
        f.event.data.object = { ...f.event.data.object, payment_intent: null }
        f.charge.livemode = true
      }
      await expect(handleBillingRiskEvent(f.event)).rejects.toThrow('mode does not match')
      expect((await incidents()).some((row) => row.message.includes(f.event.id))).toBe(false)
    }
  })

  it('ignores legacy direct charges and excludes unpaid or mismatched InvoicePayment objects', async () => {
    const f = await fixture()
    payments.set(f.paymentIntentId, [[
      { ...f.payment, status: 'open' },
      { ...f.payment, payment: { type: 'payment_intent', payment_intent: 'pi_unrelated' } },
    ] as unknown as { id: string }[]])
    expect(await handleBillingRiskEvent(f.event)).toBe(0)
    f.event.data.object.payment_intent = null
    f.charge.payment_intent = null as unknown as string
    expect(await handleBillingRiskEvent(f.event)).toBe(0)
  })

  it('leaves no partial record on a failed graph read and can retry safely', async () => {
    const f = await fixture()
    const second = await fixture()
    second.invoice.customer = f.customerId
    second.invoice.parent.subscription_details.subscription = f.subscriptionId
    payments.set(f.paymentIntentId, [[f.payment, { ...second.payment, payment: f.payment.payment }]])
    invoices.delete(second.invoiceId)
    await expect(handleBillingRiskEvent(f.event)).rejects.toThrow('Invoice unavailable')
    expect((await incidents()).some((row) => row.message.includes(f.event.id))).toBe(false)
    invoices.set(second.invoiceId, second.invoice)
    expect(await handleBillingRiskEvent(f.event)).toBe(2)
  })

  it('exposes safe details only to administrators and excludes incidents from automatic emails', async () => {
    const f = await fixture()
    await handleBillingRiskEvent(f.event)
    vi.mocked(requireStakeholder).mockResolvedValue({ email: 'outsider@example.test' } as never)
    await expect(adminBillingIncidents()).rejects.toThrow('NOT_FOUND')
    vi.mocked(requireStakeholder).mockResolvedValue({ email: 'operator@example.test' } as never)
    const visible = await adminBillingIncidents()
    expect(visible.find((row) => row.eventId === f.event.id)).toMatchObject({
      invoiceId: f.invoiceId, subscriptionId: f.subscriptionId,
      dashboardUrl: `https://dashboard.stripe.com/test/payments/${f.paymentIntentId}`,
    })
    await alertNewErrors()
    expect(JSON.stringify(sendErrorAlert.mock.calls)).not.toContain(prefix)
    const saved = (await incidents()).find((row) => row.message.includes(f.event.id))!
    expect(saved.notifiedAt).toBeNull()
  })
})
