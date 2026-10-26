import Stripe from 'stripe'

/// The catalog `pnpm billing:setup` creates. A fixed product id and a price lookup key,
/// so nothing about a particular Stripe account has to be configured in the environment.
export const PRO_PRODUCT_ID = 'kivilo_pro'
export const PRO_PRICE_LOOKUP_KEY = 'kivilo_pro_seat_monthly'
/// Marks the Customer Portal configuration the setup script owns, so it can be found again.
export const PORTAL_METADATA = { kivilo: 'pro_portal' }

/// The key and every event/resource must belong to the same mode. Production must
/// never apply sandbox entitlements, including through a webhook or Checkout return.
export function stripeModeMatches(livemode: boolean) {
  const mode = /^(?:sk|rk)_(test|live)_/.exec(process.env.STRIPE_SECRET_KEY ?? '')?.[1]
  return !!mode && (process.env.VERCEL_ENV !== 'production' || mode === 'live') &&
    livemode === (mode === 'live')
}

export function assertStripeMode(resource: { livemode: boolean }) {
  if (!stripeModeMatches(resource.livemode)) {
    throw new Error('Stripe resource mode does not match this environment')
  }
}

/// Server only: the secret key moves money. The SDK pins the API version it was built
/// against, so responses always match its types.
export function stripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY must be set')
  if (!stripeModeMatches(/^(sk|rk)_live_/.test(key))) {
    throw new Error('Stripe key is not configured for this environment')
  }
  return new Stripe(key)
}

/// Subscriptions need signed webhooks even when the customer never returns from Checkout.
/// A sandbox key in production would hand Pro to anyone with Stripe's public test card.
export function checkoutOpen() {
  const key = process.env.STRIPE_SECRET_KEY ?? ''
  return stripeModeMatches(/^(sk|rk)_live_/.test(key)) &&
    /^whsec_/.test(process.env.STRIPE_WEBHOOK_SECRET ?? '')
}
