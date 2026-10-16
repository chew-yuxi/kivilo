import { publishAddendum } from '@/lib/addendum-actions'
import { authed } from '@/lib/api/route'

export const dynamic = 'force-dynamic'

/// Freezes the draft and asks the landlord and tenant to acknowledge it.
export const POST = authed(async (_agent, { id }: { id: string }) => publishAddendum(id))
