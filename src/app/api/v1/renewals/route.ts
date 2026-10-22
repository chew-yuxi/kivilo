import { authed } from '@/lib/api/route'
import { dueRenewals } from '@/lib/renewals'
import { z } from 'zod'

export const dynamic = 'force-dynamic'
export const GET = authed(async (agent, _params, request) => {
  const filters = z.object({
    agencyId: z.string().min(1).optional(),
    personal: z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
    mine: z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
  }).parse(Object.fromEntries(new URL(request.url).searchParams))
  return dueRenewals(agent.id, new Date(), filters)
})
