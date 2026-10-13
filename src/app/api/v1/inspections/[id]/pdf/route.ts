import { authed } from '@/lib/api/route'
import { reportPdfUrl } from '@/lib/report-pdf'

export const dynamic = 'force-dynamic'
// Launching Chromium and loading every photo takes seconds, not milliseconds.
export const maxDuration = 60

export const POST = authed(async (_agent, { id }: { id: string }, request) =>
  reportPdfUrl(id, new URL(request.url).origin))
