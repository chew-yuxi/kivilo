import { stripe } from '@/lib/stripe'
import { recordPaidInvoice, syncCheckoutSession, syncSubscription } from '@/lib/billing'

/// Stripe's events about subscriptions. The signature is checked against the raw body
/// before anything in it is read: the request carries no session, so the signing secret
/// is the only thing separating Stripe from anyone who finds this URL. `src/proxy.ts`
/// does not match `/api/**` and must not, or this would be redirected to /login.
///
/// Handlers re-read Stripe's invoice/session/subscription and preserve the first paid
/// conversion on retries. A failure is a 500, which Stripe retries, and `onRequestError`
/// records it.
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET must be set')

  const body = await request.text()
  let event
  try {
    event = await stripe().webhooks.constructEventAsync(
      body,
      request.headers.get('stripe-signature') ?? '',
      secret,
    )
  } catch {
    // Same answer whether the signature is wrong, stale, or absent.
    return Response.json({ error: 'invalid_signature' }, { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded':
      if (event.data.object.mode === 'subscription') await syncCheckoutSession(event.data.object.id)
      break
    case 'invoice.payment_succeeded':
      await recordPaidInvoice(event.data.object.id)
      break
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      await syncSubscription(event.data.object.id)
      break
  }
  return Response.json({ received: true })
}
