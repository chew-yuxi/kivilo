import { authed } from '@/lib/api/route'
import { proposeResponsibility } from '@/lib/maintenance'

export const POST = authed(async (stakeholder, { caseId }: { caseId: string }, request) =>
  proposeResponsibility(caseId, stakeholder.id, await request.json()))
