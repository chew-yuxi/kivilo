import { authed } from '@/lib/api/route'
import { confirmTenancyAgreementTerms } from '@/lib/supporting-documents'

export const dynamic = 'force-dynamic'
export const POST = authed(async (actor, { id }: { id: string }, request) =>
  confirmTenancyAgreementTerms(id, actor.id, await request.json()), { pinOwner: true })
