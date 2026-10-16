import { requestAddendumPhotoUpload } from '@/lib/addendum-actions'
import { authed } from '@/lib/api/route'

export const dynamic = 'force-dynamic'

/// A one-shot signed URL the app PUTs the photo to, straight to storage, as the web does.
/// `signedUrl` is null once the object is already there.
export const POST = authed(async (_agent, { id, entryId }: { id: string; entryId: string }, request) =>
  requestAddendumPhotoUpload(entryId, id, await request.json()))
