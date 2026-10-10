import { markRoomReviewed } from '@/lib/actions'
import { authed } from '@/lib/api/route'

export const dynamic = 'force-dynamic'

export const POST = authed(async (_agent, { id, roomId }: { id: string; roomId: string }) => {
  await markRoomReviewed(roomId, id)
  return { ok: true }
})
