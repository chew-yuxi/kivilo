import { createHash } from 'node:crypto'
import type Stripe from 'stripe'
import { z } from 'zod'
import { db } from '@/lib/db'
import { assertStripeMode, PRO_PRODUCT_ID, stripe } from '@/lib/stripe'

type BillingRiskEvent = Stripe.ChargeRefundedEvent | Stripe.ChargeDisputeCreatedEvent |
  Stripe.RadarEarlyFraudWarningCreatedEvent

const stripeId = z.string().regex(/^[a-zA-Z0-9_]+$/).max(255)

/// Only this allowlist is saved, never the webhook payload, metadata or dispute evidence.
export const billingIncidentSchema = z.object({
  eventId: stripeId,
  type: z.enum(['charge.refunded', 'charge.dispute.created', 'radar.early_fraud_warning.created']),
  objectId: stripeId,
  chargeId: stripeId,
  paymentIntentId: stripeId,
  invoiceId: stripeId,
  subscriptionId: stripeId,
  livemode: z.boolean(),
  status: z.string().regex(/^[a-z_]+$/).max(80),
  amount: z.number().int().nonnegative().nullable(),
  currency: z.string().regex(/^[a-z]{3}$/).nullable(),
  evidenceDueAt: z.number().int().nonnegative().nullable(),
})

/// Called only after Stripe signature verification. A risk event records an operator
/// task; it never refunds, cancels, changes access, or rewrites a paid conversion.
/// InvoicePayments replaced Charge.invoice in Basil. One PaymentIntent can pay several
/// invoices, so follow every page and map the current invoice to our saved subscription.
export async function handleBillingRiskEvent(event: BillingRiskEvent) {
  assertStripeMode(event)
  const object = event.data.object
  assertStripeMode(object)
  const chargeId = object.object === 'charge' ? object.id :
    typeof object.charge === 'string' ? object.charge : object.charge.id
  let paymentIntentId = typeof object.payment_intent === 'string'
    ? object.payment_intent : object.payment_intent?.id
  let chargeCustomerId = object.object === 'charge'
    ? typeof object.customer === 'string' ? object.customer : object.customer?.id
    : undefined
  if (!paymentIntentId) {
    const charge = await stripe().charges.retrieve(chargeId)
    assertStripeMode(charge)
    paymentIntentId = typeof charge.payment_intent === 'string'
      ? charge.payment_intent : charge.payment_intent?.id
    chargeCustomerId = typeof charge.customer === 'string' ? charge.customer : charge.customer?.id
  }
  // Legacy direct charges and unrelated one-off payments have no subscription graph.
  if (!paymentIntentId) return 0

  const invoiceIds = new Set<string>()
  let startingAfter: string | undefined
  while (true) {
    const page = await stripe().invoicePayments.list({
      payment: { type: 'payment_intent', payment_intent: paymentIntentId },
      status: 'paid',
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    })
    for (const payment of page.data) {
      assertStripeMode(payment)
      const intent = payment.payment.payment_intent
      if (payment.status !== 'paid' || payment.payment.type !== 'payment_intent' ||
          (typeof intent === 'string' ? intent : intent?.id) !== paymentIntentId) continue
      invoiceIds.add(typeof payment.invoice === 'string' ? payment.invoice : payment.invoice.id)
    }
    if (!page.has_more) break
    const last = page.data.at(-1)?.id
    if (!last || last === startingAfter) throw new Error('Stripe invoice payment pagination did not advance')
    startingAfter = last
  }

  const incidents = []
  for (const invoiceId of invoiceIds) {
    const invoice = await stripe().invoices.retrieve(invoiceId)
    assertStripeMode(invoice)
    if (invoice.parent?.type !== 'subscription_details') continue
    const subscription = invoice.parent.subscription_details?.subscription
    if (!subscription || !invoice.customer) continue
    const subscriptionId = typeof subscription === 'string' ? subscription : subscription.id
    const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer.id
    if (chargeCustomerId && chargeCustomerId !== customerId) continue
    const local = await db.subscription.findUnique({ where: { stripeSubscriptionId: subscriptionId } })
    if (local) {
      if (local.stripeCustomerId !== customerId) continue
    } else {
      // The workspace row keeps only its current subscription. A late dispute can
      // concern an older one, or a concurrent duplicate that never became current.
      // Verify Kivilo's catalog and customer through Stripe; metadata grants no access.
      const historical = await stripe().subscriptions.retrieve(subscriptionId)
      assertStripeMode(historical)
      const historicalCustomer = typeof historical.customer === 'string'
        ? historical.customer : historical.customer.id
      if (historicalCustomer !== customerId) continue
      const [item] = historical.items.data
      const price = item?.price
      const productId = typeof price?.product === 'string' ? price.product : price?.product.id
      if (historical.items.has_more || historical.items.data.length !== 1 ||
          productId !== PRO_PRODUCT_ID || price?.type !== 'recurring' || price.currency !== 'sgd' ||
          price.recurring?.interval !== 'month' || price.recurring.interval_count !== 1 ||
          price.recurring.usage_type !== 'licensed' || !Number.isInteger(price.unit_amount) ||
          price.unit_amount! <= 0 || !Number.isInteger(item.quantity) || item.quantity! < 1) continue
      assertStripeMode(price)
    }

    const details = billingIncidentSchema.parse({
      eventId: event.id,
      type: event.type,
      objectId: object.id,
      chargeId,
      paymentIntentId,
      invoiceId,
      subscriptionId,
      livemode: event.livemode,
      status: object.object === 'charge' ? object.refunded ? 'fully_refunded' : 'partially_refunded'
        : object.object === 'dispute' ? object.status : object.actionable ? 'actionable' : 'not_actionable',
      amount: object.object === 'charge' ? object.amount_refunded : object.object === 'dispute' ? object.amount : null,
      currency: object.object === 'radar.early_fraud_warning' ? null : object.currency,
      evidenceDueAt: object.object === 'dispute' ? object.evidence_details.due_by : null,
    })
    const fingerprint = createHash('sha256').update(`${event.id}:${invoiceId}:${subscriptionId}`).digest('hex')
    incidents.push({
      id: `stripe_billing_${fingerprint}`,
      source: 'SERVER' as const,
      context: 'stripe_billing',
      name: event.type,
      message: JSON.stringify(details),
      path: '/admin',
      fingerprint,
      occurredAt: new Date(event.created * 1000),
    })
  }
  if (!incidents.length) return 0
  const { count } = await db.errorEvent.createMany({ data: incidents, skipDuplicates: true })
  return count
}
