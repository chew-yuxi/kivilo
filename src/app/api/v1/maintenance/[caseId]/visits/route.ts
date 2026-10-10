import { authed } from '@/lib/api/route'
import { addMaintenanceVisit } from '@/lib/maintenance'

export const POST = authed(async (stakeholder, { caseId }: { caseId: string }, request) =>
  addMaintenanceVisit(caseId, stakeholder.id, await request.json()))
