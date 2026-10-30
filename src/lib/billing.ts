import { createHash } from 'node:crypto'
import { db } from '@/lib/db'
import { isLive, subscriptionCanResume } from '@/lib/plan'
import { assertStripeMode, PRO_PRODUCT_ID, stripe } from '@/lib/stripe'

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
export async function syncSubscription(subscriptionId: string, expectedCustomerId?: string) {
  const client = stripe()
  const initial = await client.subscriptions.retrieve(subscriptionId)
  assertStripeMode(initial)
  const { agencyId, teamId, stakeholderId } = initial.metadata
  const where = agencyId ? { agencyId } : teamId ? { teamId } : stakeholderId ? { stakeholderId } : null
  if (!where || [agencyId, teamId, stakeholderId].filter(Boolean).length !== 1) {
    throw new Error(`Stripe subscription ${initial.id} must name exactly one workspace`)
  }

  const result = await db.$transaction(async (tx) => {
    if (agencyId) await tx.$queryRaw`SELECT "id" FROM "Agency" WHERE "id" = ${agencyId} FOR SHARE`
    // Lock the workspace even before it has a Subscription row. Fetch again only after
    // acquiring the lock: an earlier network response must not overwrite a newer sync.
    const lock = agencyId ? `billing:agency:${agencyId}` : teamId ? `billing:team:${teamId}` : `billing:stakeholder:${stakeholderId}`
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lock}, 0))`
    const subscription = await client.subscriptions.retrieve(subscriptionId, {}, {
      timeout: 8_000, maxNetworkRetries: 0,
    })
    assertStripeMode(subscription)
    if (subscription.metadata.agencyId !== agencyId || subscription.metadata.teamId !== teamId || subscription.metadata.stakeholderId !== stakeholderId) {
      throw new Error(`Stripe subscription ${subscription.id} changed workspace while syncing`)
    }
    const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id
    if (expectedCustomerId && customerId !== expectedCustomerId) {
      throw new Error(`Stripe subscription ${subscription.id} does not match the invoice customer`)
    }
    const [item] = subscription.items.data
    const price = item?.price
    const productId = typeof price?.product === 'string' ? price.product : price?.product.id
    if (subscription.items.has_more || subscription.items.data.length !== 1 ||
        productId !== PRO_PRODUCT_ID || price?.type !== 'recurring' || price.currency !== 'sgd' ||
        price.recurring?.interval !== 'month' || price.recurring.interval_count !== 1 ||
        price.recurring.usage_type !== 'licensed' || !Number.isInteger(price.unit_amount) ||
        price.unit_amount! <= 0 || !Number.isInteger(item.quantity) || item.quantity! < 1) {
      throw new Error(`Stripe subscription ${subscription.id} is not a supported Kivilo Pro subscription`)
    }
    assertStripeMode(price)
    const state = {
      plan: 'PRO' as const,
      seats: item.quantity!,
      status: subscription.status,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      googlePlayPurchaseId: null,
      applePurchaseId: null,
      // A cancellation set for a date rather than the period end still ends it then.
      currentPeriodEnd: new Date((subscription.cancel_at ?? item.current_period_end) * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end || subscription.cancel_at !== null,
    }
    const { managedById } = subscription.metadata
    const existing = await tx.subscription.findUnique({ where })
    if (agencyId && existing?.stripeSubscriptionId !== subscription.id) {
      // Checkout can stay open after the payer is removed or demoted. Recheck while
      // holding the Agency lock; membership changes cannot race this first grant.
      const payer = managedById ? await tx.agencyMembership.findFirst({ where: {
        agencyId, stakeholderId: managedById, status: 'ACTIVE', role: { in: ['OWNER', 'MANAGER'] },
      }, select: { id: true } }) : null
      if (!payer) {
        // Once the operator cancels this unfulfilled purchase, its final/replayed
        // events are harmless and must not create an unmanageable historical row.
        if (!isLive(subscription.status)) return existing
        const message = `Stripe subscription ${subscription.id} cannot be assigned to agency ${agencyId}: ` +
          'its payer is no longer an active owner or manager. Cancel and refund this unfulfilled purchase in Stripe: ' +
          `https://dashboard.stripe.com/${subscription.livemode ? '' : 'test/'}subscriptions/${subscription.id}`
        const fingerprint = createHash('sha256').update(`stripe-agency-payer:${subscription.id}`).digest('hex')
        // Commit a deduplicated operational record before rejecting the webhook.
        // The existing error alert delivers its manual resolution instructions;
        // throwing outside the transaction keeps Stripe's delivery retryable.
        await tx.errorEvent.createMany({ data: [{
          id: `stripe_agency_payer_${fingerprint}`, source: 'SERVER', context: 'stripe_agency_payer',
          name: 'StripeAgencyPayerConflict', message, path: '/api/stripe/webhook',
          fingerprint, occurredAt: new Date(),
        }], skipDuplicates: true })
        return { billingConflict: message }
      }
    }
    if (!existing) {
      return tx.subscription.create({ data: { ...where, ...state, managedById: managedById || null } })
    }
    if ((existing.googlePlayPurchaseId || existing.applePurchaseId) && subscriptionCanResume(existing)) {
      if (!isLive(subscription.status)) return existing
      throw new Error('Workspace already pays through an app store; refusing a second paid subscription')
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
        `Workspace ${agencyId ?? teamId ?? stakeholderId} already pays through ` +
        `${existing.stripeSubscriptionId}; refusing to replace it with ${subscription.id}. ` +
        'Refund and cancel one of them in Stripe.',
      )
    }
    // A new subscription over a comp or one that has ended: the payer now manages it.
    return tx.subscription.update({ where, data: { ...state, managedById: managedById || null } })
  }, { timeout: 15_000, maxWait: 10_000 })
  if (result && 'billingConflict' in result) throw new Error(result.billingConflict)
  return result
}

/// The checkout return page calls this, so the plan has flipped by the time the agent
/// sees it, whichever of the page and the webhook gets there first.
export async function syncCheckoutSession(sessionId: string) {
  const session = await stripe().checkout.sessions.retrieve(sessionId)
  assertStripeMode(session)
  if (session.mode !== 'subscription') return null
  if (session.payment_status !== 'paid' && session.payment_status !== 'no_payment_required') return null
  if (!session.subscription) return null
  return syncSubscription(
    typeof session.subscription === 'string' ? session.subscription : session.subscription.id,
  )
}

/// Paid and failed invoices both reconcile current subscription state. The invoice's
/// event/status never decides access: a failure can arrive after a successful retry.
export async function syncInvoice(invoiceId: string) {
  const invoice = await stripe().invoices.retrieve(invoiceId)
  assertStripeMode(invoice)
  if (invoice.parent?.type !== 'subscription_details') return null
  const subscription = invoice.parent.subscription_details?.subscription
  if (!subscription || !invoice.customer) return null
  return syncSubscription(
    typeof subscription === 'string' ? subscription : subscription.id,
    typeof invoice.customer === 'string' ? invoice.customer : invoice.customer.id,
  )
}

/// Conversion means money actually collected by Stripe, not an active entitlement or a
/// checkout redirect. Only invoice.payment_succeeded calls this. Read the invoice again:
/// event payloads can be old, and invoice.paid can also mean an offline/manual payment.
export async function recordPaidInvoice(invoiceId: string) {
  const invoice = await stripe().invoices.retrieve(invoiceId, { expand: ['amount_paid_off_stripe'] })
  assertStripeMode(invoice)
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
  const current = await syncSubscription(subscriptionId, customerId)
  // A canceled duplicate can resolve to a different current subscription. Its invoice
  // must never credit that subscription's payer, nor restore a cleared manager.
  if (!current || current.stripeSubscriptionId !== subscriptionId || current.stripeCustomerId !== customerId ||
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
