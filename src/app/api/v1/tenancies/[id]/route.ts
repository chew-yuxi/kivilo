import { authed } from '@/lib/api/route'
import { tenancyDetail, updateTenancyTerms } from '@/lib/maintenance'

export const dynamic = 'force-dynamic'

export const GET = authed(async (stakeholder, { id }: { id: string }) =>
  tenancyDetail(id, stakeholder.id))

export const PATCH = authed(async (stakeholder, { id }: { id: string }, request) => {
  await updateTenancyTerms(id, stakeholder.id, await request.json())
  return { ok: true }
})
