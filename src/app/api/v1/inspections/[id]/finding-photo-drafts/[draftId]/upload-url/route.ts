import { authed } from '@/lib/api/route'
import { requestFindingPhotoUpload } from '@/lib/finding-photos'

export const POST = authed(async (agent, { id, draftId }: { id: string; draftId: string }, request) => requestFindingPhotoUpload(id, draftId, agent.id, await request.json()))
