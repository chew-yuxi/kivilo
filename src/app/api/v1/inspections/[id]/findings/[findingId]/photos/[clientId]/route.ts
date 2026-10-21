import { authed } from '@/lib/api/route'
import { deleteFindingPhoto, editFindingPhoto } from '@/lib/finding-photos'

export const PATCH = authed(async (agent, { id, findingId, clientId }: { id: string; findingId: string; clientId: string }, request) => {
  await editFindingPhoto(id, agent.id, clientId, { findingId }, await request.json())
  return { ok: true }
})
export const DELETE = authed(async (agent, { id, findingId, clientId }: { id: string; findingId: string; clientId: string }) => {
  await deleteFindingPhoto(id, agent.id, clientId, { findingId })
  return { ok: true }
})
