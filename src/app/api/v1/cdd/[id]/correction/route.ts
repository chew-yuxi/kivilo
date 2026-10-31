import { z } from 'zod'
import { authed } from '@/lib/api/route'
import { requestCorrection } from '@/lib/cdd/review'

export const dynamic = 'force-dynamic'

/// Sets the particulars aside and waits for corrected ones; a reason is needed unless they
/// fail a rule. The app then emails the client through `/request`.
export const POST = authed(async (agent, { id }: { id: string }, request) => {
  const { reason } = z.object({ reason: z.string().max(1000).nullable().optional() }).strict().parse(await request.json())
  return requestCorrection(id, agent.id, reason)
})
