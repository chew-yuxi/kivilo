import { authed } from '@/lib/api/route'
import { confirmIdSighted } from '@/lib/cdd/review'

export const dynamic = 'force-dynamic'

/// The agent saw the client's original ID, in person or on a video call.
export const POST = authed(async (agent, { id }: { id: string }) => {
  await confirmIdSighted(id, agent.id)
  return { ok: true }
})
