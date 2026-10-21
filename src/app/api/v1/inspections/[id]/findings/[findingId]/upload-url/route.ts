import { requestFindingPhotoUpload } from '@/lib/finding-photos'
import { authed } from '@/lib/api/route'

export const dynamic = 'force-dynamic'

export const POST = authed(async (_agent, { id, findingId }: { id: string; findingId: string }, request) =>
  requestFindingPhotoUpload(findingId, id, await request.json()))
