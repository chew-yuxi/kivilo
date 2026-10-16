import { acknowledgeAddendum } from '@/lib/addendum-actions'
import { authed } from '@/lib/api/route'

export const dynamic = 'force-dynamic'

/// The signed-in landlord or tenant acknowledges a published update to their report.
/// There is no stakeholder id in the request: the party is whoever holds the token.
export const POST = authed(async (_party, { id }: { id: string }) => {
  await acknowledgeAddendum(id)
  return { ok: true }
})
