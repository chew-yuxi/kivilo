import { authed } from '@/lib/api/route'
import { listTenancies } from '@/lib/maintenance'

export const dynamic = 'force-dynamic'

export const GET = authed(async (stakeholder) => listTenancies(stakeholder.id))
