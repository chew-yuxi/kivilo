import { authed } from '@/lib/api/route'
import { appleAgencyContext, appleBillingStatus } from '@/lib/apple-billing'

export const dynamic = 'force-dynamic'
export const GET = authed(async (agent, _params, request) =>
  appleBillingStatus(agent, appleAgencyContext(new URL(request.url).searchParams.get('agencyId') ?? undefined)))
