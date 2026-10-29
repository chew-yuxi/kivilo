import { authed } from '@/lib/api/route'
import { decideCandidate } from '@/lib/cdd/cases'
import { decisionInput } from '@/lib/cdd/input'

export const dynamic = 'force-dynamic'

/// The agent's final, reasoned decision on one possible match.
export const POST = authed(async (agent, { id }: { id: string }, request) => {
  const { decision, reason } = decisionInput.parse(await request.json())
  await decideCandidate(id, agent.id, decision, reason)
  return { ok: true }
})
