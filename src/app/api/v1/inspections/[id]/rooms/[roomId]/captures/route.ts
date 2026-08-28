import { z } from 'zod'
import { registerCapture } from '@/lib/actions'
import { annotationInputSchema } from '@/lib/annotations'
import { authed } from '@/lib/api/route'

export const dynamic = 'force-dynamic'

const body = z.object({
  kind: z.enum(['PHOTO', 'VIDEO']),
  storagePath: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
  durationSec: z.number().int().nonnegative().nullable().default(null),
  note: z.string().nullable().default(null),
  annotations: annotationInputSchema.nullable().default(null),
})

/// Called once storage has the bytes. Until this returns, the capture belongs to the
/// phone and stays in its queue.
export const POST = authed(
  async (_agent, { id, roomId }: { id: string; roomId: string }, request) => {
    const input = body.parse(await request.json())
    return {
      id: await registerCapture({
        roomId,
        inspectionId: id,
        kind: input.kind,
        storagePath: input.storagePath,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        durationSec: input.durationSec,
        note: input.note,
        annotations: input.annotations ?? undefined,
      }),
    }
  },
)
