import { runFindings } from '@/lib/actions'
import { authed } from '@/lib/api/route'

export const dynamic = 'force-dynamic'

export const POST = authed(async (_agent, { id }: { id: string }) => {
  await runFindings(id)
  return { ok: true }
})
