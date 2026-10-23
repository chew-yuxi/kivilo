import { authed } from '@/lib/api/route'
import { prepareTenancyAgreement } from '@/lib/supporting-documents'

export const dynamic = 'force-dynamic'
export const POST = authed(async (actor, { id }: { id: string }) =>
  prepareTenancyAgreement(id, actor.id), { pinOwner: true })
