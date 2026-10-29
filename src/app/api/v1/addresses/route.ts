import { authed } from '@/lib/api/route'
import { searchAddresses } from '@/lib/address-lookup'

export const dynamic = 'force-dynamic'

/// New check-in's address search: `?q=` a postal code, building or street.
export const GET = authed(async (agent, _params, request) =>
  searchAddresses(agent.id, new URL(request.url).searchParams.get('q') ?? ''))
