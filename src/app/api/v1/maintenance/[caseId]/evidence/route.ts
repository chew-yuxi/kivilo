import { authed } from '@/lib/api/route'
import { registerMaintenanceEvidence } from '@/lib/maintenance'

export const POST = authed(async (stakeholder, { caseId }: { caseId: string }, request) =>
  registerMaintenanceEvidence(caseId, stakeholder.id, await request.json()))
