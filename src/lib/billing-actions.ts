'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { requireAgent } from '@/lib/auth'
import { resolveBillingWorkspace, subscriptionCanResume, workspacePlan } from '@/lib/plan'
import { PORTAL_METADATA, PRO_PRICE_LOOKUP_KEY, checkoutOpen, stripe } from '@/lib/stripe'

/// Web only. The app never links here: the stores forbid steering a buyer to an outside
/// purchase, so nothing in `/api/v1` starts a checkout or opens the portal.

/// Next refuses a server action whose Origin does not match the host, so this is the
/// address the agent is actually on, and Stripe sends them back to it.
async function origin() {
  const value = (await headers()).get('origin')
  if (!value) throw new Error('Server action without an Origin header')
  return value
}

/// Sends the agent to Stripe Checkout for Pro, one seat for every member of the workspace.
/// The workspace and the agent who will manage billing ride on the subscription's
/// metadata, which is how `syncSubscription` knows whose row to write.
export async function startCheckout(formData?: FormData) {
  const agent = await requireAgent()
  const selection = formData?.get('agencyId')
  const agencyId = typeof selection === 'string' && selection !== 'personal' ? selection : null
  const base = await origin()
  const accountUrl = `${base}/account${agencyId ? `?agencyId=${encodeURIComponent(agencyId)}` : ''}`
  const session = await db.$transaction(async (tx) => {
    if (agencyId) await tx.$queryRaw`SELECT "id" FROM "Agency" WHERE "id" = ${agencyId} FOR SHARE`
    const target = await resolveBillingWorkspace(agent, agencyId, tx)
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${target.lockKey}, 0))`
    const workspace = await workspacePlan(agent, agencyId, tx)
    if ((workspace.subscription?.googlePlayPurchaseId || workspace.subscription?.applePurchaseId) && subscriptionCanResume(workspace.subscription)) {
      throw new Error('Manage your existing app store subscription before changing billing providers')
    }
    if (workspace.plan === 'PRO') throw new Error('This workspace is already on Pro')
    if (!workspace.isManager) throw new Error('Only the member who manages billing can subscribe')
    if (!checkoutOpen()) throw new Error('Pro is not on sale yet')

    const requestedSeats = formData?.get('seats')
    const seats = requestedSeats ? Number(requestedSeats) : target.seatsNeeded
    if (!Number.isInteger(seats) || seats < target.seatsNeeded || seats > 1000 || (target.kind === 'stakeholder' && seats !== 1)) {
      throw new Error('Choose enough seats for every active team member')
    }
    const client = stripe()
    const [price] = (await client.prices.list({ lookup_keys: [PRO_PRICE_LOOKUP_KEY], active: true })).data
    if (!price) throw new Error(`No active Stripe price ${PRO_PRICE_LOOKUP_KEY}; run pnpm billing:setup`)
    // Only this workspace's original payer can reuse its customer and saved invoices.
    const previous = workspace.subscription
    const customer = previous?.managedById === agent.id ? (previous.stripeCustomerId ?? undefined) : undefined
    return client.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: price.id, quantity: seats }],
      customer,
      customer_email: customer ? undefined : (agent.email ?? undefined),
      client_reference_id: agent.id,
      subscription_data: { metadata: {
        [target.kind === 'agency' ? 'agencyId' : target.kind === 'team' ? 'teamId' : 'stakeholderId']: target.id,
        managedById: agent.id,
      } },
      success_url: `${accountUrl}${agencyId ? '&' : '?'}checkout={CHECKOUT_SESSION_ID}`,
      cancel_url: accountUrl,
      integration_identifier: 'kivilo_pro_upgrade_qzmtrwkd',
    })
  }, { timeout: 15_000, maxWait: 10_000 })
  redirect(session.url!)
}

/// Stripe's Customer Portal, for seats, cancelling, the card and invoices. It shows the
/// payer's card and billing details, so only the member who manages the plan may open it,
/// strictly: unlike checkout, nobody else may when the manager has gone. To anyone else
/// it does not exist.
export async function openBillingPortal(formData?: FormData) {
  const agent = await requireAgent()
  const selection = formData?.get('agencyId')
  const agencyId = typeof selection === 'string' && selection !== 'personal' ? selection : null
  const workspace = await workspacePlan(agent, agencyId)
  const { subscription } = workspace
  if (!workspace.isManager || subscription?.googlePlayPurchaseId || subscription?.applePurchaseId || !subscription?.stripeCustomerId || subscription.managedById !== agent.id) {
    throw new Error('Not found')
  }

  const client = stripe()
  let configuration: string | undefined
  for await (const candidate of client.billingPortal.configurations.list({ active: true })) {
    if (candidate.metadata?.kivilo === PORTAL_METADATA.kivilo) configuration = candidate.id
  }
  if (!configuration) throw new Error('No Kivilo portal configuration; run pnpm billing:setup')

  const session = await client.billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    configuration,
    return_url: `${await origin()}/account?${agencyId ? `agencyId=${encodeURIComponent(agencyId)}&` : ''}billing=returned`,
  })
  redirect(session.url)
}
