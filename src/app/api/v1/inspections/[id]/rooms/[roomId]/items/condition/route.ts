import { z } from 'zod'
import { setItemsCondition } from '@/lib/actions'
import { authed } from '@/lib/api/route'

export const dynamic = 'force-dynamic'

const input = z.object({
  itemIds: z.array(z.string().min(1)).min(1).max(200),
  condition: z.enum(['NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED']),
}).strict()

export const POST = authed(async (_agent, { id, roomId }: { id: string; roomId: string }, request) => {
  const { itemIds, condition } = input.parse(await request.json())
  await setItemsCondition(roomId, id, itemIds, condition)
  return { ok: true }
})
