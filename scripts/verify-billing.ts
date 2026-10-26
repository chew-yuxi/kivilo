import { config } from 'dotenv'
import Stripe from 'stripe'
import { PORTAL_METADATA, PRO_PRICE_LOOKUP_KEY, PRO_PRODUCT_ID, assertStripeMode, stripe } from '../src/lib/stripe'

/// An operator check, never part of the ordinary build. Reads the configured account,
/// then creates and immediately expires one unpublished, unpaid Checkout Session.
/// Run inside a remote Vercel production build to use its write-only runtime key:
///   pnpm billing:verify --live
/// No customer, email, workspace metadata, payment confirmation or database writes.
config({ path: ['.env.local', '.env'], quiet: true })

class VerificationFailure extends Error {}

let stage = 'configuration'
let permission = ''

function begin(label: string, requiredPermission: string) {
  stage = label
  permission = requiredPermission
}

function requireValue(condition: unknown, message: string): asserts condition {
  if (!condition) throw new VerificationFailure(message)
}

function denied(error: unknown) {
  return error instanceof Stripe.errors.StripePermissionError ||
    error instanceof Stripe.errors.StripeError && error.statusCode === 403
}

async function main() {
  const args = process.argv.slice(2)
  requireValue(args.length === 0 || args.length === 1 && args[0] === '--live',
    'Usage: pnpm billing:verify [--live]')
  const live = args[0] === '--live'
  const key = process.env.STRIPE_SECRET_KEY ?? ''
  const mode = /^(?:sk|rk)_(test|live)_/.exec(key)?.[1]
  requireValue(mode, 'STRIPE_SECRET_KEY must be a Stripe server key')
  requireValue(live === (mode === 'live'),
    'Live keys require --live; without --live, use a sandbox key')
  requireValue(process.env.VERCEL_ENV !== 'production' || live,
    'Vercel production verification requires a live key and --live')
  const client = stripe()
  console.log(`Checking ${live ? 'live' : 'sandbox'} billing configuration. No payment will be taken.`)

  begin('Pro price', 'Prices Read')
  const prices = await client.prices.list({ lookup_keys: [PRO_PRICE_LOOKUP_KEY], active: true, limit: 2 })
  requireValue(prices.data.length === 1, 'Expected exactly one active Kivilo Pro price')
  const [price] = prices.data
  assertStripeMode(price)
  const productId = typeof price.product === 'string' ? price.product : price.product.id
  requireValue(productId === PRO_PRODUCT_ID && price.active && price.currency === 'sgd' &&
    price.unit_amount === 3900 && price.type === 'recurring' && price.billing_scheme === 'per_unit' &&
    price.recurring?.interval === 'month' && price.recurring.interval_count === 1 &&
    price.recurring.usage_type === 'licensed' && price.transform_quantity === null,
  'Kivilo Pro must be SGD 39 per licensed seat each month, without quantity transformation')
  console.log('PASS Pro price: SGD 39 per seat per month')

  begin('Customer Portal configuration', 'Customer Portal Read')
  let portal: Stripe.BillingPortal.Configuration | undefined
  for await (const candidate of client.billingPortal.configurations.list({ active: true, limit: 100 })) {
    if (candidate.metadata?.kivilo !== PORTAL_METADATA.kivilo) continue
    requireValue(!portal, 'More than one active Kivilo Customer Portal configuration exists')
    portal = candidate
  }
  requireValue(portal, 'No active Kivilo Customer Portal configuration exists')
  // Stripe omits this configuration's product rules unless explicitly expanded.
  portal = await client.billingPortal.configurations.retrieve(portal.id, {
    expand: ['features.subscription_update.products'],
  })
  assertStripeMode(portal)
  const features = portal.features
  const updates = features.subscription_update
  const portalProduct = updates.products?.find((product) => product.product === PRO_PRODUCT_ID)
  requireValue(updates.enabled && updates.default_allowed_updates.length === 1 &&
    updates.default_allowed_updates[0] === 'quantity' && updates.proration_behavior === 'create_prorations' &&
    portalProduct?.prices.includes(price.id) && portalProduct.adjustable_quantity.enabled &&
    portalProduct.adjustable_quantity.minimum === 1 && features.subscription_cancel.enabled &&
    features.subscription_cancel.mode === 'at_period_end' && features.payment_method_update.enabled &&
    features.invoice_history.enabled && !features.customer_update.enabled,
  'Kivilo Customer Portal must allow seat changes, period-end cancellation, payment methods and invoices')
  console.log('PASS Customer Portal configuration')

  begin('Subscriptions read', 'Subscriptions Read')
  const subscriptions = await client.subscriptions.list({ limit: 1, status: 'all' })
  for (const subscription of subscriptions.data) {
    assertStripeMode(subscription)
    assertStripeMode(await client.subscriptions.retrieve(subscription.id))
  }
  console.log('PASS Subscriptions read')

  begin('Invoices read', 'Invoices Read')
  const invoices = await client.invoices.list({ limit: 1, expand: ['data.amount_paid_off_stripe'] })
  for (const invoice of invoices.data) {
    assertStripeMode(invoice)
    const current = await client.invoices.retrieve(invoice.id, { expand: ['amount_paid_off_stripe'] })
    assertStripeMode(current)
    requireValue(typeof current.amount_paid_off_stripe === 'number',
      'Invoice did not include its off-Stripe payment amount')
  }
  console.log('PASS Invoices read (including off-Stripe amount expansion)')

  begin('Invoice Payments read', 'Invoice Payments read access')
  const payments = await client.invoicePayments.list({ limit: 1, status: 'paid' })
  for (const payment of payments.data) assertStripeMode(payment)
  console.log('PASS Invoice Payments read')

  begin('Charges read', 'Charges Read')
  const charges = await client.charges.list({ limit: 1 })
  for (const charge of charges.data) {
    assertStripeMode(charge)
    assertStripeMode(await client.charges.retrieve(charge.id))
  }
  console.log('PASS Charges read')

  begin('Account activation', 'Accounts Read (optional)')
  let account: Stripe.Account | undefined
  try {
    account = await client.accounts.retrieveCurrent()
  } catch (error) {
    if (!denied(error)) throw error
    console.log('UNVERIFIED account activation: Accounts Read is not granted; check the Stripe Dashboard')
  }
  if (account) {
    console.log(`ACCOUNT charges_enabled=${account.charges_enabled} payouts_enabled=${account.payouts_enabled}`)
    requireValue(!live || account.charges_enabled && account.payouts_enabled,
      'Live account activation is incomplete: charges and payouts must both be enabled')
  }

  // All read checks must pass before this sole write. The URL is never printed or
  // opened. Automatic expiration bounds cleanup if the process is interrupted.
  begin('Checkout creation and retrieval', 'Checkout Sessions Write')
  let checkoutId: string | undefined
  try {
    const checkout = await client.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: price.id, quantity: 1 }],
      success_url: 'https://my.kivilo.app/account',
      cancel_url: 'https://my.kivilo.app/account',
      expires_at: Math.floor(Date.now() / 1000) + 35 * 60,
      metadata: { kivilo: 'billing_verification' },
      integration_identifier: 'kivilo_billing_verify_vtqlspwx',
    })
    checkoutId = checkout.id
    assertStripeMode(checkout)
    requireValue(checkout.status === 'open' && checkout.payment_status === 'unpaid' &&
      !checkout.customer && !checkout.subscription,
    'Verification Checkout must remain open and unpaid, without a customer or subscription')
    const current = await client.checkout.sessions.retrieve(checkoutId)
    assertStripeMode(current)
    requireValue(current.status === 'open' && current.payment_status === 'unpaid',
      'Verification Checkout changed unexpectedly')
    console.log('PASS Checkout creation and retrieval (unpaid)')
  } finally {
    if (checkoutId) {
      const previousStage = stage
      begin('Verification Checkout expiration', 'Checkout Sessions Write')
      const expired = await client.checkout.sessions.expire(checkoutId)
      assertStripeMode(expired)
      requireValue(expired.status === 'expired' && expired.payment_status === 'unpaid',
        'Verification Checkout was not confirmed expired and unpaid')
      console.log('PASS Verification Checkout expired')
      stage = previousStage
    }
  }
  console.log('Billing preflight passed. Paid fulfillment, subscription cancellation, portal sessions and webhook delivery require separate checks.')
}

main().catch((error: unknown) => {
  // Stripe errors can contain keys, URLs and customer data. Never log the error,
  // message, request, headers or response; only our own fixed validation messages.
  const reason = error instanceof VerificationFailure ? error.message
    : denied(error) ? `Stripe denied access; check ${permission}`
      : error instanceof Stripe.errors.StripeAuthenticationError ? 'Stripe authentication failed'
        : error instanceof Stripe.errors.StripeError ? 'Stripe request failed; inspect the request in Stripe Workbench'
          : 'Verification could not complete'
  console.error(`FAIL ${stage}: ${reason}`)
  process.exitCode = 1
})
