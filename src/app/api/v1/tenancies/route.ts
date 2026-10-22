import { authed } from '@/lib/api/route'
import { listTenancies } from '@/lib/maintenance'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

export const GET = authed(async (stakeholder, _params, request) => {
  const filters = z.object({
    agencyId: z.string().min(1).optional(),
    personal: z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
  }).parse(Object.fromEntries(new URL(request.url).searchParams))
  return listTenancies(stakeholder.id, filters)
})
