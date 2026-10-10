import { completeReview } from '@/lib/actions'
import { authed } from '@/lib/api/route'

export const dynamic = 'force-dynamic'

export const POST = authed(async (_agent, { id }: { id: string }) => {
  await completeReview(id)
  return { ok: true }
})
