'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { requireAgent } from '@/lib/auth'
import { workspacePlan } from '@/lib/plan'
import { PORTAL_METADATA, PRO_PRICE_LOOKUP_KEY, stripe } from '@/lib/stripe'

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
export async function startCheckout() {
  const agent = await requireAgent()
  const workspace = await workspacePlan(agent)
  if (workspace.plan === 'PRO') throw new Error('This workspace is already on Pro')
  if (!workspace.isManager) throw new Error('Only the member who manages billing can subscribe')

  const client = stripe()
  const [price] = (await client.prices.list({ lookup_keys: [PRO_PRICE_LOOKUP_KEY], active: true })).data
  if (!price) throw new Error(`No active Stripe price ${PRO_PRICE_LOOKUP_KEY}; run pnpm billing:setup`)
  const seats = agent.teamId ? await db.stakeholder.count({ where: { teamId: agent.teamId } }) : 1
  const base = await origin()
  // Resubscribing reuses the agent's own customer, so their invoices stay in one place.
  // A customer someone else paid through is theirs, card and invoices, and is never reused.
  const previous = workspace.subscription
  const customer = previous?.managedById === agent.id ? (previous.stripeCustomerId ?? undefined) : undefined

  const session = await client.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: price.id, quantity: seats }],
    customer,
    customer_email: customer ? undefined : (agent.email ?? undefined),
    client_reference_id: agent.id,
    subscription_data: {
      // The same key `workspaceKey` gives, which is how the row is found again.
      metadata: { [agent.teamId ? 'teamId' : 'stakeholderId']: agent.teamId ?? agent.id, managedById: agent.id },
    },
    success_url: `${base}/account?checkout={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/account`,
    integration_identifier: 'kivilo_pro_upgrade_qzmtrwkd',
  })
  redirect(session.url!)
}

/// Stripe's Customer Portal, for seats, cancelling, the card and invoices. It shows the
/// payer's card and billing details, so only the member who manages the plan may open it,
/// strictly: unlike checkout, nobody else may when the manager has gone. To anyone else
/// it does not exist.
export async function openBillingPortal() {
  const agent = await requireAgent()
  const { subscription } = await workspacePlan(agent)
  if (!subscription?.stripeCustomerId || subscription.managedById !== agent.id) {
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
    return_url: `${await origin()}/account?billing=returned`,
  })
  redirect(session.url)
}
