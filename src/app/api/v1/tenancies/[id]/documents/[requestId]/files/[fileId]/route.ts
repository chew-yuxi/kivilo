import { authed } from '@/lib/api/route'
import { supportingDocumentDownload } from '@/lib/supporting-documents'

export const dynamic = 'force-dynamic'
export const GET = authed(async (actor, { id, requestId, fileId }: { id: string; requestId: string; fileId: string }) =>
  supportingDocumentDownload(id, requestId, fileId, actor.id), { pinOwner: true })
