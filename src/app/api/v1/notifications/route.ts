import { authed } from '@/lib/api/route'
import { listNotifications } from '@/lib/maintenance'

export const dynamic = 'force-dynamic'

export const GET = authed(async (stakeholder) => listNotifications(stakeholder.id))
