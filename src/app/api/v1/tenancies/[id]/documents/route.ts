import { authed } from '@/lib/api/route'
import { requestSupportingDocument, supportingDocumentsWorkspace } from '@/lib/supporting-documents'

export const dynamic = 'force-dynamic'
export const GET = authed(async (actor, { id }: { id: string }) =>
  supportingDocumentsWorkspace(id, actor.id), { pinOwner: true })
export const POST = authed(async (actor, { id }: { id: string }, request) =>
  requestSupportingDocument(id, actor.id, await request.json()), { pinOwner: true })
