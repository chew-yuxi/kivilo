import { authed } from '@/lib/api/route'
import { annotateMaintenanceEvidence } from '@/lib/maintenance'

export const PATCH = authed(async (stakeholder, { caseId, evidenceId }: { caseId: string; evidenceId: string }, request) =>
  annotateMaintenanceEvidence(caseId, evidenceId, stakeholder.id, await request.json()))
