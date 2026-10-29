import { authed } from '@/lib/api/route'
import { caseForAgent } from '@/lib/cdd/cases'

export const dynamic = 'force-dynamic'

/// One case as the agent sees it: particulars with the ID number masked, every screening
/// run with its list versions, and each possible match with its decision.
export const GET = authed(async (agent, { id }: { id: string }) => caseForAgent(id, agent.id))
