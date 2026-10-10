import { authed } from '@/lib/api/route'
import { verifyMaintenanceVisit } from '@/lib/maintenance'

export const POST = authed(async (
  stakeholder,
  { caseId, visitId }: { caseId: string; visitId: string },
  request,
) => verifyMaintenanceVisit(caseId, visitId, stakeholder.id, await request.json()))
