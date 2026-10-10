import { authed } from '@/lib/api/route'
import { tenancyDetail } from '@/lib/maintenance'

export const dynamic = 'force-dynamic'

export const GET = authed(async (stakeholder, { id }: { id: string }) =>
  tenancyDetail(id, stakeholder.id))
