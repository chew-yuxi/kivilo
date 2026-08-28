import { z } from 'zod'
import { addRoom } from '@/lib/actions'
import { authed } from '@/lib/api/route'

export const dynamic = 'force-dynamic'

const body = z.object({ name: z.string().trim().min(1).max(80) })

export const POST = authed(async (_agent, { id }: { id: string }, request) => {
  const { name } = body.parse(await request.json())
  return { id: await addRoom(id, name) }
})
