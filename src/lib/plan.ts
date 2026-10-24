import { db } from '@/lib/db'
import type { Prisma, Stakeholder } from '@/generated/prisma'
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

/// The key a workspace's Subscription row is stored under.
export function workspaceKey(agent: Pick<Stakeholder, 'id' | 'teamId'>) {
  return agent.teamId ? { teamId: agent.teamId } : { stakeholderId: agent.id }
}

/// Count ownership in the billing workspace independently of visibility. Private deals
/// count toward their lead's workspace; sharing never charges the collaborator's plan.
function activeTenancy(agent: Pick<Stakeholder, 'id' | 'teamId'>): Prisma.TenancyWhereInput {
  return {
    AND: [
      agent.teamId ? { agent: { teamId: agent.teamId } } : { agentId: agent.id },
      { endDate: { gte: new Date() } },
      { property: { trashedAt: null } },
      { inspections: { none: { kind: 'CHECK_OUT', status: 'COMPLETED' } } },
    ],
  }
}

export async function workspacePlan(agent: Pick<Stakeholder, 'id' | 'teamId'>) {
  const [subscription, active, team] = await Promise.all([
    db.subscription.findUnique({
      where: workspaceKey(agent),
      include: { managedBy: { select: { id: true, name: true } } },
    }),
    db.property.count({ where: { tenancies: { some: activeTenancy(agent) } } }),
    agent.teamId
      ? db.team.findUniqueOrThrow({ where: { id: agent.teamId }, select: { name: true } })
      : null,
  ])

  const pro = subscription !== null && isLive(subscription.status)
  return {
    plan: pro ? ('PRO' as const) : ('FREE' as const),
    seats: pro ? subscription.seats : 1,
    limit: pro ? subscription.seats * PRO_ACTIVE_PROPERTIES_PER_SEAT : FREE_ACTIVE_PROPERTIES,
    active,
    team,
    /// The row even when it is no longer live, so a canceled plan can still be managed
    /// (invoices, resubscribing) by whoever managed it.
    subscription,
    /// Who may open checkout or the billing portal for this workspace: the member who
    /// manages it, or anyone when nobody does (no row yet, or the manager has left).
    isManager: !subscription?.managedById || subscription.managedById === agent.id,
  }
}

/// Called before anything that creates a property. Count-then-create without a lock,
/// so two simultaneous creates can overshoot by one, which costs nothing worth a lock.
export async function assertCanAddProperty(agent: Pick<Stakeholder, 'id' | 'teamId'>) {
  const { active, limit } = await workspacePlan(agent)
  if (active >= limit) throw new Error('Plan limit reached')
}
