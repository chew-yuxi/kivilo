import { authed } from '@/lib/api/route'
import { listServiceProviders } from '@/lib/maintenance'

export const dynamic = 'force-dynamic'

export const GET = authed(async (_stakeholder, _params, request) => {
  const url = new URL(request.url)
  return listServiceProviders(
    url.searchParams.get('category') ?? undefined,
    url.searchParams.get('postalSector') ?? undefined,
  )
})
