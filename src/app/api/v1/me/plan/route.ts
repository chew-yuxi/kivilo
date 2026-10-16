import { authed } from '@/lib/api/route'
import { workspacePlan } from '@/lib/plan'

export const dynamic = 'force-dynamic'

/// The workspace's plan and how much of it is in use. No price and no way to buy: the
/// app shows what the plan is, and a plan is bought on the web.
export const GET = authed(async (stakeholder) => {
  const workspace = await workspacePlan(stakeholder)
  return {
    plan: workspace.plan,
    activeProperties: workspace.active,
    limit: workspace.limit,
    seats: workspace.seats,
    team: workspace.team?.name ?? null,
  }
})
