import { authed } from '@/lib/api/route'
import { casesForAgent, startDeal } from '@/lib/cdd/cases'
import { startDealInput } from '@/lib/cdd/input'

export const dynamic = 'force-dynamic'

/// The agent's due-diligence cases, those needing them first (plans/compliance-pack.md).
export const GET = authed(async (agent) => ({ cases: await casesForAgent(agent.id) }))

/// Start a deal: due diligence for one client, before any lease or check-in exists.
export const POST = authed(async (agent, _params, request) => {
  const created = await startDeal(agent.id, startDealInput.parse(await request.json()))
  return { id: created.id }
})
