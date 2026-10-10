import { revokeReportLink, shareReport } from '@/lib/actions'
import { authed } from '@/lib/api/route'

export const dynamic = 'force-dynamic'

export const POST = authed(async (_agent, { id }: { id: string }, request) => {
  const token = await shareReport(id)
  return { token, shareUrl: new URL(`/reports/${token}`, request.url).toString() }
})

export const DELETE = authed(async (_agent, { id }: { id: string }) => {
  await revokeReportLink(id)
  return { ok: true }
})
