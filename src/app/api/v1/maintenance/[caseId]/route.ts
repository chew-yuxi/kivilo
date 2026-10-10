import { authed } from '@/lib/api/route'
import { maintenanceCaseDetail, updateMaintenanceCase } from '@/lib/maintenance'

export const dynamic = 'force-dynamic'

export const GET = authed(async (stakeholder, { caseId }: { caseId: string }) =>
  maintenanceCaseDetail(caseId, stakeholder.id))

export const PATCH = authed(async (stakeholder, { caseId }: { caseId: string }, request) => {
  await updateMaintenanceCase(caseId, stakeholder.id, await request.json())
  return { ok: true }
})
