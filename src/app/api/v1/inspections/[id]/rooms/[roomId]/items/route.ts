import { addItem } from '@/lib/actions'
import { authed } from '@/lib/api/route'

export const dynamic = 'force-dynamic'

export const POST = authed(async (_agent, { id, roomId }: { id: string; roomId: string }) => ({
  id: await addItem(roomId, id),
}))
