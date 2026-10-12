import { authed } from '@/lib/api/route'
import { propertyTimeline } from '@/lib/property-timeline'

export const dynamic = 'force-dynamic'

export const GET = authed(async (stakeholder, { id }: { id: string }) =>
  propertyTimeline(id, stakeholder.id))
