import { authed } from '@/lib/api/route'
import { completeCase } from '@/lib/cdd/review'

export const dynamic = 'force-dynamic'

/// Locks the case and returns its fingerprint.
export const POST = authed(async (agent, { id }: { id: string }) => completeCase(id, agent.id))
