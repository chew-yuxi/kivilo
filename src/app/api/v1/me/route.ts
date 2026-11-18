import { authed } from '@/lib/api/route'
import { accountProfile } from '@/lib/account-profile'

export const dynamic = 'force-dynamic'

/// The native client calls this once after sign-in to confirm the token resolves to a
/// Stakeholder, which is also what creates one on a first-ever sign-in.
export const GET = authed(accountProfile)
