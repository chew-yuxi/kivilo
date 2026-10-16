import { db } from '@/lib/db'
import { isLive } from '@/lib/plan'
import { stripe } from '@/lib/stripe'

/// Stripe is the truth about what a workspace has paid for; the Subscription row is a
/// copy that `src/lib/plan.ts` can read without a network call. This is the only code that
/// writes a Stripe-paid row, and the actions that send an agent to Stripe are in
/// `billing-actions.ts`.

/// Copies a subscription's current state onto its workspace's row. It never trusts an
/// event's payload: it re-reads the subscription, so an event delivered twice, late or out
/// of order writes the same, current state. Which workspace it belongs to is the metadata
/// `startCheckout` put on it, which only our server can set.
///
/// A workspace has one row, so if it is already paying through a different subscription
/// that is still live (two members checked out at once), this refuses rather than
/// overwrite it. The throw is recorded by error tracking and alerts us: one of the two
/// has to be refunded and canceled by hand.
export async function syncSubscription(subscriptionId: string) {
  const subscription = await stripe().subscriptions.retrieve(subscriptionId)
  const { teamId, stakeholderId, managedById } = subscription.metadata
  const where = teamId ? { teamId } : stakeholderId ? { stakeholderId } : null
  if (!where) throw new Error(`Stripe subscription ${subscription.id} names no workspace`)

  const [item] = subscription.items.data
  const state = {
    plan: 'PRO' as const,
    seats: item.quantity ?? 1,
    status: subscription.status,
    stripeCustomerId:
      typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id,
    stripeSubscriptionId: subscription.id,
    // A cancellation set for a date rather than the period end still ends it then.
    currentPeriodEnd: new Date((subscription.cancel_at ?? item.current_period_end) * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end || subscription.cancel_at !== null,
  }

  return db.$transaction(async (tx) => {
    const existing = await tx.subscription.findUnique({ where })
    if (!existing) {
      return tx.subscription.create({ data: { ...where, ...state, managedById: managedById || null } })
    }
    if (existing.stripeSubscriptionId === subscription.id) {
      // The manager is set when the subscription first lands and is ours after that:
      // account deletion clears it, and a replayed event must not bring it back.
      return tx.subscription.update({ where, data: state })
    }
    // A different subscription from the one on the row. One that has ended, such as the
    // duplicate we canceled, has nothing to say about this workspace.
    if (!isLive(subscription.status)) return existing
    if (existing.stripeSubscriptionId && isLive(existing.status)) {
      throw new Error(
        `Workspace ${teamId ? `team ${teamId}` : stakeholderId} already pays through ` +
        `${existing.stripeSubscriptionId}; refusing to replace it with ${subscription.id}. ` +
        'Refund and cancel one of them in Stripe.',
      )
    }
    // A new subscription over a comp or one that has ended: the payer now manages it.
    return tx.subscription.update({ where, data: { ...state, managedById: managedById || null } })
  })
}

/// The checkout return page calls this, so the plan has flipped by the time the agent
/// sees it, whichever of the page and the webhook gets there first.
export async function syncCheckoutSession(sessionId: string) {
  const session = await stripe().checkout.sessions.retrieve(sessionId)
  if (!session.subscription) return null
  return syncSubscription(
    typeof session.subscription === 'string' ? session.subscription : session.subscription.id,
  )
}
