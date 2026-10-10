import { z } from 'zod'
import { signInspection } from '@/lib/actions'
import { authed } from '@/lib/api/route'

export const dynamic = 'force-dynamic'

const body = z.object({
  stakeholderId: z.string().min(1),
  imageData: z.string().startsWith('data:image/png;base64,').max(2_000_000),
}).strict()

export const POST = authed(async (_agent, { id }: { id: string }, request) => {
  const { stakeholderId, imageData } = body.parse(await request.json())
  await signInspection(id, stakeholderId, imageData)
  return { ok: true }
})
