import { authed } from '@/lib/api/route'
import { registerFindingPhoto } from '@/lib/finding-photos'

export const POST = authed(async (agent, { id, draftId }: { id: string; draftId: string }, request) => registerFindingPhoto(id, draftId, agent.id, await request.json()))
