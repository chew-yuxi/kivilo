import { registerAddendumPhoto } from '@/lib/addendum-actions'
import { authed } from '@/lib/api/route'

export const dynamic = 'force-dynamic'

/// Registers a photo once it is in storage. Idempotent on its path, so a retry after a
/// lost response returns the same photo.
export const POST = authed(async (_agent, { id, entryId }: { id: string; entryId: string }, request) =>
  ({ id: await registerAddendumPhoto(entryId, id, await request.json()) }))
