import { authed } from '@/lib/api/route'
import { playAgencyContext, playBillingStatus } from '@/lib/play-billing'

export const dynamic = 'force-dynamic'
export const GET = authed(async (agent, _params, request) => {
  const value = new URL(request.url).searchParams.get('agencyId')
  return playBillingStatus(agent, playAgencyContext(value ?? undefined))
})
