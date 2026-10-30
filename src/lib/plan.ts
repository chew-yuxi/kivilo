import { db } from '@/lib/db'
import type { Prisma, Stakeholder, Subscription } from '@/generated/prisma'
import { FREE_ACTIVE_PROPERTIES, PRO_ACTIVE_PROPERTIES_PER_SEAT } from '@/lib/plan-limits'
export { FREE_ACTIVE_PROPERTIES, PRO_ACTIVE_PROPERTIES_PER_SEAT } from '@/lib/plan-limits'

/// What a plan allows, decided here and nowhere else. A plan belongs to a workspace: the
/// agent's team, or the agent alone when they are on none. The Subscription row records
/// what was bought; this file decides what that means.
///
/// The limit is on active properties, not on everything ever made, so an agent is not
/// punished for their history: a property stops counting once its tenancy has ended or
/// its check-out is complete. Nothing is ever locked when a workspace is over its limit,
/// which happens on a downgrade; it only cannot add another property.

/// Stripe keeps a subscription `past_due` while it retries the card, and the agent keeps
/// Pro through those retries. `comped` is ours, for a plan set by `pnpm plan:set`.
const LIVE_STATUSES = ['active', 'trialing', 'past_due', 'comped']

export function isLive(status: string) {
  return LIVE_STATUSES.includes(status)
}

type SubscriptionState = Pick<Subscription, 'status' | 'googlePlayPurchaseId' | 'currentPeriodEnd'> & Partial<Pick<Subscription, 'applePurchaseId'>>

/// Google cancellation preserves the paid period; expiry is enforced locally even if
/// a notification is delayed. Grace gives access, account hold and pause do not.
export function subscriptionIsLive(subscription: SubscriptionState, now = new Date()) {
  if (subscription.applePurchaseId) return ['APPLE_ACTIVE', 'APPLE_CANCELED', 'APPLE_GRACE_PERIOD', 'APPLE_RETIRED'].includes(subscription.status) &&
    !!subscription.currentPeriodEnd && subscription.currentPeriodEnd > now
  if (!subscription.googlePlayPurchaseId) return isLive(subscription.status)
  return ['SUBSCRIPTION_STATE_ACTIVE', 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD', 'SUBSCRIPTION_STATE_CANCELED']
    .includes(subscription.status) && !!subscription.currentPeriodEnd && subscription.currentPeriodEnd > now
}

/// A suspended/paused Play subscription can resume billing without another purchase.
/// Keep it with its provider until Google confirms it has ended.
export function subscriptionCanResume(subscription: SubscriptionState, now = new Date()) {
  if (subscription.applePurchaseId) return ['APPLE_CANCELED', 'APPLE_RETIRED'].includes(subscription.status)
    ? !!subscription.currentPeriodEnd && subscription.currentPeriodEnd > now
    : ['APPLE_ACTIVE', 'APPLE_GRACE_PERIOD', 'APPLE_BILLING_RETRY'].includes(subscription.status)
  if (!subscription.googlePlayPurchaseId) return isLive(subscription.status)
  if (['SUBSCRIPTION_STATE_EXPIRED', 'SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED'].includes(subscription.status)) return false
  if (subscription.status === 'SUBSCRIPTION_STATE_CANCELED') return !!subscription.currentPeriodEnd && subscription.currentPeriodEnd > now
  return true
}

/// An explicit team is an operational Agency. Omitted context retains the response
/// older app builds expect; explicit null is the Personal view in current clients.
export function workspaceKey(agent: Pick<Stakeholder, 'id' | 'teamId'>, agencyId?: string | null) {
  return agencyId ? { agencyId } : agent.teamId ? { teamId: agent.teamId } : { stakeholderId: agent.id }
}

export async function resolveBillingWorkspace(
  agent: Pick<Stakeholder, 'id' | 'teamId'>,
  agencyId?: string | null,
  client: Prisma.TransactionClient = db,
) {
  if (agencyId) {
    const membership = await client.agencyMembership.findFirst({
      where: { agencyId, stakeholderId: agent.id, status: 'ACTIVE' },
      include: { agency: { select: { name: true, _count: { select: { members: { where: { status: 'ACTIVE' } } } } } } },
    })
    if (!membership) throw new Error('Team not found')
    return {
      where: { agencyId }, kind: 'agency' as const, id: agencyId,
      workspaceKey: `agency:${agencyId}`, lockKey: `billing:agency:${agencyId}`,
      canManage: membership.role !== 'AGENT', seatsNeeded: membership.agency._count.members,
      teamName: membership.agency.name,
    }
  }
  if (agent.teamId) {
    const team = await client.team.findUniqueOrThrow({
      where: { id: agent.teamId }, select: { name: true, _count: { select: { members: true } } },
    })
    return {
      where: { teamId: agent.teamId }, kind: 'team' as const, id: agent.teamId,
      workspaceKey: `team:${agent.teamId}`, lockKey: `billing:team:${agent.teamId}`,
      canManage: true, seatsNeeded: team._count.members, teamName: team.name,
    }
  }
  return {
    where: { stakeholderId: agent.id }, kind: 'stakeholder' as const, id: agent.id,
    workspaceKey: `stakeholder:${agent.id}`, lockKey: `billing:stakeholder:${agent.id}`,
    canManage: true, seatsNeeded: 1, teamName: null,
  }
}

/// Team work belongs to the team's pool regardless of who leads it. Personal work
/// belongs to its lead's personal or legacy billing-group pool. Sharing never charges
/// a collaborator's plan. Old unfiltered clients keep their aggregate usage response.
function activeTenancy(agent: Pick<Stakeholder, 'id' | 'teamId'>, agencyId?: string | null): Prisma.TenancyWhereInput {
  return {
    AND: [
      agencyId ? { agencyId } : {
        ...(agencyId === null && { agencyId: null }),
        ...(agent.teamId ? { agent: { teamId: agent.teamId } } : { agentId: agent.id }),
      },
      { endDate: { gte: new Date() } },
      { property: { trashedAt: null } },
      { inspections: { none: { kind: 'CHECK_OUT', status: 'COMPLETED' } } },
    ],
  }
}

export async function workspacePlan(
  agent: Pick<Stakeholder, 'id' | 'teamId'>,
  agencyId?: string | null,
  client: Prisma.TransactionClient = db,
) {
  const target = await resolveBillingWorkspace(agent, agencyId, client)
  const [subscription, active] = await Promise.all([
    client.subscription.findUnique({
      where: target.where,
      include: { managedBy: { select: { id: true, name: true } } },
    }),
    client.property.count({ where: { tenancies: { some: activeTenancy(agent, agencyId) } } }),
  ])

  const pro = subscription !== null && subscriptionIsLive(subscription)
  return {
    plan: pro ? ('PRO' as const) : ('FREE' as const),
    seats: pro ? subscription.seats : 1,
    limit: pro ? subscription.seats * PRO_ACTIVE_PROPERTIES_PER_SEAT : FREE_ACTIVE_PROPERTIES,
    active,
    team: target.teamName ? { name: target.teamName } : null,
    workspace: { kind: target.kind, id: target.id, name: target.teamName ?? 'Personal' },
    agencyId: agencyId ?? null,
    seatsNeeded: target.seatsNeeded,
    needsMoreSeats: pro && target.kind === 'agency' && target.seatsNeeded > subscription.seats,
    // Retain an ended subscription so its payer can still manage invoices or renew.
    subscription,
    isManager: target.canManage && (!subscription?.managedById || subscription.managedById === agent.id),
  }
}

export async function assertCanAddProperty(
  agent: Pick<Stakeholder, 'id' | 'teamId'>,
  agencyId: string | null = null,
  client: Prisma.TransactionClient = db,
  existingPropertyId?: string,
) {
  // A renewal or assignment can reuse a property already in this pool. Only an
  // increase in active properties consumes another place.
  if (existingPropertyId && await client.property.findFirst({
    where: { id: existingPropertyId, tenancies: { some: activeTenancy(agent, agencyId) } }, select: { id: true },
  })) return
  const { active, limit, needsMoreSeats } = await workspacePlan(agent, agencyId, client)
  if (active >= limit || needsMoreSeats) throw new Error('Plan limit reached')
}
