import { authed } from '@/lib/api/route'
import { inspectionHandover } from '@/lib/handover'

export const dynamic = 'force-dynamic'

export const GET = authed(async (stakeholder, { id }: { id: string }) =>
  inspectionHandover(id, stakeholder.id))
