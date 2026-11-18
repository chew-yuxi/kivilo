import { z } from 'zod'
import { authed } from '@/lib/api/route'
import { accountProfile } from '@/lib/account-profile'
import { setAgentCountry } from '@/lib/account-actions'

export const dynamic = 'force-dynamic'

/// Sets where the account works, from the app's first-run question or Settings, and
/// answers with the profile `GET /api/v1/me` gives, which the app saves.
export const PUT = authed(async (_stakeholder, _params, request) => {
  const { country } = z.object({ country: z.enum(['SG', 'MY']) }).strict().parse(await request.json())
  return accountProfile(await setAgentCountry(country))
})
