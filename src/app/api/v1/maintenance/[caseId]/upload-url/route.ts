import { authed } from '@/lib/api/route'
import { requestMaintenanceEvidenceUpload } from '@/lib/maintenance'

export const POST = authed(async (stakeholder, { caseId }: { caseId: string }, request) =>
  requestMaintenanceEvidenceUpload(caseId, stakeholder.id, await request.json()))
