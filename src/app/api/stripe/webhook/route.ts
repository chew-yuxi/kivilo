import { stripe, stripeModeMatches } from '@/lib/stripe'
import { recordPaidInvoice, syncCheckoutSession, syncInvoice, syncSubscription } from '@/lib/billing'
import { handleBillingRiskEvent } from '@/lib/billing-risk'

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

  // Kivilo bills its own customers and has no connected accounts. A correctly signed
  // sandbox or Connect event must never change a production workspace's entitlement.
  if (event.account || !stripeModeMatches(event.livemode)) {
    return Response.json({ received: true })
  }

  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded':
      if (event.data.object.mode === 'subscription') await syncCheckoutSession(event.data.object.id)
      break
    case 'invoice.payment_succeeded':
      await recordPaidInvoice(event.data.object.id)
      break
    case 'invoice.paid':
    case 'invoice.payment_failed':
      await syncInvoice(event.data.object.id)
      break
    case 'charge.refunded':
    case 'charge.dispute.created':
    case 'radar.early_fraud_warning.created':
      await handleBillingRiskEvent(event)
      break
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      await syncSubscription(event.data.object.id)
      break
  }
  return Response.json({ received: true })
}
