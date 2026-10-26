import { config } from 'dotenv'
import Stripe from 'stripe'
import { PORTAL_METADATA, PRO_PRICE_LOOKUP_KEY, PRO_PRODUCT_ID, stripe } from '../src/lib/stripe'

/// Brings a Stripe account up to what Kivilo expects: the Pro product, its SGD per-seat
/// price, the Customer Portal configuration, and, given a base URL, the webhook endpoint.
/// Idempotent, like `setup:storage`: run it once per Stripe account and again whenever
/// this file changes.
///
///   pnpm billing:setup                          catalog and portal only (local work, where
///                                               `stripe listen` stands in for the endpoint)
///   pnpm billing:setup https://kivilo.example   also the endpoint at <url>/api/stripe/webhook
///
/// The endpoint's signing secret can only be read when it is created, so it is printed
/// then and never again. Store it as STRIPE_WEBHOOK_SECRET.
config({ path: ['.env.local', '.env'], quiet: true })

const UNIT_AMOUNT = 3900 // S$39.00
const CURRENCY = 'sgd'
/// Every event the webhook acts on, and nothing else.
const EVENTS: Stripe.WebhookEndpointCreateParams.EnabledEvent[] = [
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.paid',
  'invoice.payment_failed',
  'invoice.payment_succeeded',
  'charge.refunded',
  'charge.dispute.created',
  'radar.early_fraud_warning.created',
]

async function product(client: Stripe) {
  try {
    return await client.products.retrieve(PRO_PRODUCT_ID)
  } catch (error) {
    if (!(error instanceof Stripe.errors.StripeInvalidRequestError) || error.statusCode !== 404) throw error
  }
  console.log(`Created product ${PRO_PRODUCT_ID}`)
  return client.products.create({
    id: PRO_PRODUCT_ID,
    name: 'Kivilo Pro',
    description: 'Active properties for each agent, pooled across the team.',
    unit_label: 'agent',
  })
}

/// A price cannot be edited once it exists. If the amount ever changes, create the new
/// price by hand with `transfer_lookup_key` so the key moves to it, and new checkouts follow.
async function price(client: Stripe) {
  const [existing] = (await client.prices.list({ lookup_keys: [PRO_PRICE_LOOKUP_KEY], active: true })).data
  if (existing) {
    if (existing.unit_amount !== UNIT_AMOUNT || existing.currency !== CURRENCY ||
        existing.recurring?.interval !== 'month' || existing.product !== PRO_PRODUCT_ID) {
      throw new Error(`${PRO_PRICE_LOOKUP_KEY} is ${existing.id}, which is not S$39 a month on ${PRO_PRODUCT_ID}`)
    }
    return existing
  }
  console.log(`Created price ${PRO_PRICE_LOOKUP_KEY}`)
  return client.prices.create({
    product: PRO_PRODUCT_ID,
    lookup_key: PRO_PRICE_LOOKUP_KEY,
    currency: CURRENCY,
    unit_amount: UNIT_AMOUNT,
    recurring: { interval: 'month' },
  })
}

/// Seats up and down (prorated), cancel at the end of the paid period, card, invoices.
async function portal(client: Stripe, priceId: string) {
  const settings = {
    business_profile: { headline: 'Kivilo Pro: S$39 per agent each month' },
    features: {
      subscription_update: {
        enabled: true,
        default_allowed_updates: ['quantity' as const],
        products: [{ product: PRO_PRODUCT_ID, prices: [priceId], adjustable_quantity: { enabled: true, minimum: 1 } }],
        proration_behavior: 'create_prorations' as const,
      },
      subscription_cancel: { enabled: true, mode: 'at_period_end' as const },
      payment_method_update: { enabled: true },
      invoice_history: { enabled: true },
      customer_update: { enabled: false },
    },
  }
  for await (const configuration of client.billingPortal.configurations.list({ active: true })) {
    if (configuration.metadata?.kivilo === PORTAL_METADATA.kivilo) {
      console.log(`Updated portal configuration ${configuration.id}`)
      return client.billingPortal.configurations.update(configuration.id, settings)
    }
  }
  const created = await client.billingPortal.configurations.create({ ...settings, metadata: PORTAL_METADATA })
  console.log(`Created portal configuration ${created.id}`)
  return created
}

async function webhook(client: Stripe, base: string) {
  const url = new URL('/api/stripe/webhook', base).toString()
  for await (const endpoint of client.webhookEndpoints.list()) {
    if (endpoint.url === url) {
      if (endpoint.api_version !== Stripe.API_VERSION) {
        throw new Error(`Webhook ${endpoint.id} uses ${endpoint.api_version}; recreate it with ${Stripe.API_VERSION} before enabling billing`)
      }
      await client.webhookEndpoints.update(endpoint.id, { enabled_events: EVENTS, disabled: false })
      console.log(`Updated webhook ${endpoint.id} for ${url}. Its secret was printed when it was created.`)
      return
    }
  }
  const created = await client.webhookEndpoints.create({
    url,
    enabled_events: EVENTS,
    api_version: Stripe.API_VERSION,
    description: 'Kivilo: subscription state and verified paid conversions',
  })
  console.log(`Created webhook ${created.id} for ${url}`)
  console.log(`Store this as STRIPE_WEBHOOK_SECRET; it is not shown again:\n${created.secret}`)
}

async function main(base: string | undefined) {
  const client = stripe()
  await product(client)
  const { id: priceId } = await price(client)
  await portal(client, priceId)
  if (base) await webhook(client, base)
  console.log(`Pro is ${priceId} (${PRO_PRICE_LOOKUP_KEY})`)
}

main(process.argv[2]).catch((error) => {
  console.error(error)
  process.exit(1)
})
