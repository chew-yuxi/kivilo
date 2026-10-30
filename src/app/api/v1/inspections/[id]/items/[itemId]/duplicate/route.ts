import { duplicateItem } from '@/lib/actions'
import { authed } from '@/lib/api/route'

export const dynamic = 'force-dynamic'

export const POST = authed(async (_agent, { id, itemId }: { id: string; itemId: string }) => ({
  id: await duplicateItem(itemId, id),
}))
