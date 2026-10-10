import { authed } from '@/lib/api/route'
import { addMaintenanceComment } from '@/lib/maintenance'

export const POST = authed(async (stakeholder, { caseId }: { caseId: string }, request) =>
  addMaintenanceComment(caseId, stakeholder.id, await request.json()))
