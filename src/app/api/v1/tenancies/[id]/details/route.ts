import { authed } from '@/lib/api/route'
import { updateTenancyDetails } from '@/lib/tenancy-details'

export const dynamic = 'force-dynamic'

export const PATCH = authed(async (actor, { id }: { id: string }, request) => {
  await updateTenancyDetails(id, actor.id, await request.json())
  return { ok: true }
})
