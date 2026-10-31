import { z } from 'zod'
import { authed } from '@/lib/api/route'
import { homeTasks } from '@/lib/home-tasks'
import { clientChecksLeft } from '@/lib/plan'
import { caseCounts } from '@/lib/cdd/cases'

export const dynamic = 'force-dynamic'

/// The app's Home: every outstanding task in one scoped read, for the chosen context.
export const GET = authed(async (stakeholder, _params, request) => {
  const query = z.object({
    context: z.enum(['work', 'landlord', 'tenant']).default('work'),
    agencyId: z.string().min(1).optional(),
    personal: z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
  }).parse(Object.fromEntries(new URL(request.url).searchParams))
  const tasks = await homeTasks(stakeholder.id, query.context === 'work'
    ? { kind: 'WORK', agencyId: query.agencyId, personal: query.personal }
    : { kind: query.context === 'landlord' ? 'LANDLORD' : 'TENANT' })
  // Client checks (CEA due diligence) are agents' work, offered from the work context only.
  if (query.context !== 'work') return { ...tasks, dueDiligence: false }
  // A separate field, since released builds read `dueDiligence` as a Boolean.
  const [counts, freeLeft] = await Promise.all([caseCounts(stakeholder.id), clientChecksLeft(stakeholder, query.agencyId)])
  return { ...tasks, dueDiligence: true, dueDiligenceCounts: { ...counts, freeLeft } }
})
