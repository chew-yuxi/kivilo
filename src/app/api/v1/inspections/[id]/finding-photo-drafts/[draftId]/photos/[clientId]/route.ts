import { authed } from '@/lib/api/route'
import { deleteFindingPhoto, editFindingPhoto } from '@/lib/finding-photos'

export const PATCH = authed(async (agent, { id, draftId, clientId }: { id: string; draftId: string; clientId: string }, request) => {
  await editFindingPhoto(id, agent.id, clientId, { draftId }, await request.json())
  return { ok: true }
})
export const DELETE = authed(async (agent, { id, draftId, clientId }: { id: string; draftId: string; clientId: string }) => {
  await deleteFindingPhoto(id, agent.id, clientId, { draftId })
  return { ok: true }
})
