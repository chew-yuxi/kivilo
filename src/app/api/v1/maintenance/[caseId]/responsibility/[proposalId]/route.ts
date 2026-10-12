import { authed } from '@/lib/api/route'
import { answerResponsibility } from '@/lib/maintenance'

export const POST = authed(async (
  stakeholder,
  { caseId, proposalId }: { caseId: string; proposalId: string },
  request,
) => {
  await answerResponsibility(caseId, proposalId, stakeholder.id, await request.json())
  return { ok: true }
})
