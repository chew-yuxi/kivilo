import { z } from 'zod'
import { authed } from '@/lib/api/route'
import { propertyWork } from '@/lib/property-work'

export const dynamic = 'force-dynamic'

/// One row per property, for the app's Properties tab. Same filters and scope as
/// GET /api/v1/inspections, which stays unchanged for released builds.
export const GET = authed(async (agent, _params, request) => {
  const filters = z.object({
    agencyId: z.string().min(1).optional(),
    personal: z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
    assigneeId: z.string().min(1).optional(),
    mine: z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
    state: z.enum(['active', 'archived', 'trash']).optional(),
  }).parse(Object.fromEntries(new URL(request.url).searchParams))
  return propertyWork(agent.id, filters)
})
