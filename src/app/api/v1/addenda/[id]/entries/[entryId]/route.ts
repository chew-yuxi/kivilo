import { deleteAddendumEntry, updateAddendumEntry } from '@/lib/addendum-actions'
import { authed } from '@/lib/api/route'

export const dynamic = 'force-dynamic'

type Params = { id: string; entryId: string }

export const PATCH = authed(async (_agent, { id, entryId }: Params, request) => {
  await updateAddendumEntry(entryId, id, await request.json())
  return { ok: true }
})

export const DELETE = authed(async (_agent, { id, entryId }: Params) => {
  await deleteAddendumEntry(entryId, id)
  return { ok: true }
})
