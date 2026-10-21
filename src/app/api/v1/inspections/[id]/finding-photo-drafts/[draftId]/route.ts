import { authed } from '@/lib/api/route'
import { discardFindingPhotoDraft, findingPhotoDraft } from '@/lib/finding-photos'

export const GET = authed(async (agent, { id, draftId }: { id: string; draftId: string }) => findingPhotoDraft(id, draftId, agent.id))
export const DELETE = authed(async (agent, { id, draftId }: { id: string; draftId: string }) => {
  await discardFindingPhotoDraft(id, draftId, agent.id)
  return { ok: true }
})
