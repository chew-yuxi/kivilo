import { authed } from '@/lib/api/route'
import { cddRecordPdfUrl } from '@/lib/cdd/record-pdf'

export const dynamic = 'force-dynamic'

/// The receipt of a completed case, as a PDF behind a ten-minute link.
export const POST = authed(async (agent, { id }: { id: string }) => cddRecordPdfUrl(id, agent.id))
