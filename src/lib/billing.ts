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
  if (session.payment_status !== 'paid' && session.payment_status !== 'no_payment_required') return null
  if (!session.subscription) return null
  return syncSubscription(
    typeof session.subscription === 'string' ? session.subscription : session.subscription.id,
  )
}

/// Conversion means money actually collected by Stripe, not an active entitlement or a
/// checkout redirect. Only invoice.payment_succeeded calls this. Read the invoice again:
/// event payloads can be old, and invoice.paid can also mean an offline/manual payment.
export async function recordPaidInvoice(invoiceId: string) {
  const invoice = await stripe().invoices.retrieve(invoiceId, { expand: ['amount_paid_off_stripe'] })
  if (!invoice.livemode || invoice.status !== 'paid' || invoice.parent?.type !== 'subscription_details') return
  if (invoice.amount_paid_off_stripe === undefined) {
    throw new Error(`Stripe invoice ${invoice.id} did not include its off-Stripe payment amount`)
  }
  const amount = invoice.amount_paid - invoice.amount_paid_off_stripe
  if (amount <= 0) return
  const paidAt = invoice.status_transitions.paid_at
  if (paidAt === null) throw new Error(`Paid Stripe invoice ${invoice.id} has no payment timestamp`)
  const subscription = invoice.parent.subscription_details?.subscription
  if (!subscription || !invoice.customer) return
  const subscriptionId = typeof subscription === 'string' ? subscription : subscription.id
  const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer.id
  const current = await syncSubscription(subscriptionId)
  // A canceled duplicate can resolve to a different current subscription. Its invoice
  // must never credit that subscription's payer, nor restore a cleared manager.
  if (current.stripeSubscriptionId !== subscriptionId || current.stripeCustomerId !== customerId ||
      !current.managedById) return
  await db.accountAcquisition.updateMany({
    where: {
      stakeholderId: current.managedById,
      OR: [{ firstPaidAt: null }, { firstPaidAt: { gt: new Date(paidAt * 1000) } }],
      verifiedAt: { lte: new Date(paidAt * 1000) },
      // Keep the ownership check in the write, too, if account deletion or a replacement
      // subscription changed the row after syncSubscription returned.
      stakeholder: { subscriptionsManaged: { some: {
        id: current.id, stripeSubscriptionId: subscriptionId, stripeCustomerId: customerId,
      } } },
    },
    data: {
      firstPaidAt: new Date(paidAt * 1000),
      firstPaidInvoiceId: invoice.id,
      firstPaidAmount: amount,
      firstPaidCurrency: invoice.currency,
    },
  })
}
