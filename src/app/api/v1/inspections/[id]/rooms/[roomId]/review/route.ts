import { z } from 'zod'
import { markRoomReviewed } from '@/lib/actions'
import { authed } from '@/lib/api/route'

export const dynamic = 'force-dynamic'

// Released builds post no body at all, so for them an empty room is still refused.
const reviewInput = z.object({ nothingToRecord: z.boolean().optional() })

export const POST = authed(async (_agent, { id, roomId }: { id: string; roomId: string }, request) => {
  const body = await request.text()
  await markRoomReviewed(roomId, id, reviewInput.parse(body ? JSON.parse(body) : {}))
  return { ok: true }
})
