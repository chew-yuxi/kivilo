import { startCheckOut } from '@/lib/actions'
import { authed } from '@/lib/api/route'

export const dynamic = 'force-dynamic'

export const POST = authed(async (_agent, { id }: { id: string }) => ({
  id: await startCheckOut(id),
}))
