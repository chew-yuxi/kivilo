import { authed } from '@/lib/api/route'
import { propertyHistory } from '@/lib/property-history'

export const dynamic = 'force-dynamic'

export const GET = authed(async (stakeholder, { id }: { id: string }, request) => {
  const filter = new URL(request.url).searchParams.get('filter') === 'deletions' ? 'deletions' : 'all'
  return propertyHistory(id, stakeholder.id, filter)
})
