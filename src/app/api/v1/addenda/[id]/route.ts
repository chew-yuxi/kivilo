import { db } from '@/lib/db'
import { addendumReadScope } from '@/lib/auth'
import { discardAddendum, updateAddendum } from '@/lib/addendum-actions'
import { authed } from '@/lib/api/route'

export const dynamic = 'force-dynamic'

/// Where a published update lives, so the app can open the report a "report was updated"
/// notification points at (its href is `/updates/<id>`). The update itself is read from
/// the report, which carries every update with its acknowledgements.
export const GET = authed(async (stakeholder, { id }: { id: string }) => {
  const addendum = await db.reportAddendum.findFirst({
    where: { AND: [{ id }, addendumReadScope(stakeholder.id)] },
    select: { inspectionId: true },
  })
  if (!addendum) throw new Error('Addendum not found')
  return addendum
})

/// The draft's title, reason and date of the change.
export const PATCH = authed(async (_agent, { id }: { id: string }, request) => {
  await updateAddendum(id, await request.json())
  return { ok: true }
})

/// Discards the draft and the photos uploaded to it.
export const DELETE = authed(async (_agent, { id }: { id: string }) => {
  await discardAddendum(id)
  return { ok: true }
})
