import { authed } from '@/lib/api/route'
import { publishMoveInDefect } from '@/lib/move-in-defects'

export const POST = authed(async (stakeholder, { caseId }: { caseId: string }, request) =>
  publishMoveInDefect(caseId, stakeholder.id, await request.json()))
