import { authed } from '@/lib/api/route'
import { dueRenewals } from '@/lib/renewals'

export const dynamic = 'force-dynamic'
export const GET = authed(async (agent) => dueRenewals(agent.id))
