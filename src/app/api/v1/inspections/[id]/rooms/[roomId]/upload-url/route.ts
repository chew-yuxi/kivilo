import { z } from 'zod'
import { requestUploadUrl } from '@/lib/actions'
import { authed } from '@/lib/api/route'

export const dynamic = 'force-dynamic'

const body = z.object({ filename: z.string().min(1).max(200) })

/// The device uploads its own bytes straight to storage with this credential. A
/// walkthrough is far past any serverless body cap, and routing evidence through a
/// function would be slower and no safer.
export const POST = authed(
  async (_agent, { id, roomId }: { id: string; roomId: string }, request) => {
    const { filename } = body.parse(await request.json())
    const { storagePath, signedUrl, token } = await requestUploadUrl(roomId, id, filename)
    return { storagePath, signedUrl, token }
  },
)
