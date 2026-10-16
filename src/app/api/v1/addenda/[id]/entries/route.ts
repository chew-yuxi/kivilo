import { addAddendumEntry } from '@/lib/addendum-actions'
import { authed } from '@/lib/api/route'

export const dynamic = 'force-dynamic'

/// One change on the draft: an added, replaced or removed line.
export const POST = authed(async (_agent, { id }: { id: string }, request) =>
  ({ id: await addAddendumEntry(id, await request.json()) }))
