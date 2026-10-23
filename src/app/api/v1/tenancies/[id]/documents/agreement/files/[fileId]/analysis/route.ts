import { authed } from '@/lib/api/route'
import { analyzeTenancyAgreement } from '@/lib/supporting-documents'

export const dynamic = 'force-dynamic'
export const GET = authed(async (actor, { id, fileId }: { id: string; fileId: string }) =>
  analyzeTenancyAgreement(id, fileId, actor.id), { pinOwner: true })
