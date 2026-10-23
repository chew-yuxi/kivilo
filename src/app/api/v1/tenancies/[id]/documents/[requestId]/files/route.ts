import { authed } from '@/lib/api/route'
import { registerSupportingDocumentFile } from '@/lib/supporting-documents'

export const dynamic = 'force-dynamic'
export const POST = authed(async (actor, { id, requestId }: { id: string; requestId: string }, request) =>
  ({ id: await registerSupportingDocumentFile(id, requestId, actor.id, await request.json()) }), { pinOwner: true })
