import { authed } from '@/lib/api/route'
import { workspacePlan } from '@/lib/plan'

export const dynamic = 'force-dynamic'

/// Current clients select a billing workspace. Omission preserves older clients'
/// aggregate usage response; the selected team is always authorized in the data layer.
export const GET = authed(async (stakeholder, _params, request) => {
  const selected = new URL(request.url).searchParams.get('agencyId')
  const agencyId = selected === null ? undefined : selected === 'personal' ? null : selected
  const workspace = await workspacePlan(stakeholder, agencyId)
  return {
    plan: workspace.plan,
    activeProperties: workspace.active,
    limit: workspace.limit,
    seats: workspace.seats,
    team: workspace.team?.name ?? null,
    workspace: workspace.workspace,
    agencyId: workspace.agencyId,
    isManager: workspace.isManager,
    canManageBilling: workspace.isManager,
    seatsNeeded: workspace.seatsNeeded,
    provider: workspace.subscription?.googlePlayPurchaseId ? 'google_play'
      : workspace.subscription?.stripeSubscriptionId ? 'stripe'
        : workspace.subscription?.status === 'comped' ? 'comped' : null,
    subscriptionStatus: workspace.subscription?.status ?? null,
    currentPeriodEnd: workspace.subscription?.currentPeriodEnd ?? null,
    cancelAtPeriodEnd: workspace.subscription?.cancelAtPeriodEnd ?? false,
  }
})
