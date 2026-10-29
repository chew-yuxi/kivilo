import { authed } from '@/lib/api/route'
import { rescreen } from '@/lib/cdd/cases'

export const dynamic = 'force-dynamic'

/// Screens the client again: after a failed run, or before a renewal.
export const POST = authed(async (agent, { id }: { id: string }) => {
  await rescreen(id, agent.id)
  return { ok: true }
})
