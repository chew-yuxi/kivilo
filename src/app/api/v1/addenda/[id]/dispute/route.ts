import { authed } from '@/lib/api/route'
import { disputeMoveInDefect } from '@/lib/move-in-defects'

export const POST = authed(async (stakeholder, { id }: { id: string }, request) => {
  await disputeMoveInDefect(id, stakeholder.id, await request.json())
  return { ok: true }
})
