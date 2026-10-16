import { db } from '@/lib/db'
import { addendumReadScope } from '@/lib/auth'
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
