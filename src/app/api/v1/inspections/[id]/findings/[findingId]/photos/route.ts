import { findingPhotos, registerFindingPhoto } from '@/lib/finding-photos'
import { authed } from '@/lib/api/route'

export const dynamic = 'force-dynamic'

export const GET = authed(async (_agent, { id, findingId }: { id: string; findingId: string }) =>
  findingPhotos(findingId, id))

export const POST = authed(async (_agent, { id, findingId }: { id: string; findingId: string }, request) =>
  registerFindingPhoto(findingId, id, await request.json()))
