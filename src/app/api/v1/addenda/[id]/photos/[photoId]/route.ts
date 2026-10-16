import { deleteAddendumPhoto } from '@/lib/addendum-actions'
import { authed } from '@/lib/api/route'

export const dynamic = 'force-dynamic'

export const DELETE = authed(async (_agent, { id, photoId }: { id: string; photoId: string }) => {
  await deleteAddendumPhoto(photoId, id)
  return { ok: true }
})
