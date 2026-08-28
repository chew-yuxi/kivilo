import { finishRoomCapture } from '@/lib/actions'
import { authed } from '@/lib/api/route'

export const dynamic = 'force-dynamic'

/// Hands the room to extraction. The client must have drained its queue for this room
/// first, or the draft is read from a partial set of captures.
export const POST = authed(async (_agent, { id, roomId }: { id: string; roomId: string }) => {
  await finishRoomCapture(roomId, id)
  return { ok: true }
})
