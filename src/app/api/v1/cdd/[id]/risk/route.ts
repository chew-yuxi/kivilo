import { authed } from '@/lib/api/route'
import { assessRisk } from '@/lib/cdd/review'
import { riskAnswersInput } from '@/lib/cdd/risk'

export const dynamic = 'force-dynamic'

/// The agent's answers to the risk checklist the case read returned.
export const POST = authed(async (agent, { id }: { id: string }, request) => {
  const { answers, sourceOfFunds } = riskAnswersInput.parse(await request.json())
  await assessRisk(id, agent.id, answers, sourceOfFunds)
  return { ok: true }
})
