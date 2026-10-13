import { authorizeInspection } from '@/lib/auth'
import { authed } from '@/lib/api/route'
import { reportPdfUrl } from '@/lib/report-pdf/render'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/// The agent's own copy of a signed report, which needs no share link to exist.
export const POST = authed(async (agent, { id }: { id: string }) => {
  await authorizeInspection(id, agent.id)
  const url = await reportPdfUrl(id)
  if (!url) throw new Error('Only a countersigned report can be downloaded')
  return { url }
})
