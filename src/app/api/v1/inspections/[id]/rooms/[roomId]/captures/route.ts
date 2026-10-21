import { z } from 'zod'
import { isDeepStrictEqual } from 'node:util'
import { registerCapture } from '@/lib/actions'
import { annotationInputSchema, toAnnotations } from '@/lib/annotations'
import { authed } from '@/lib/api/route'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

const body = z.object({
  clientId: z.uuid().optional(),
  itemId: z.string().min(1).optional(),
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
    const captureId = await registerCapture({
      roomId,
      inspectionId: id,
      clientId: input.clientId,
      itemId: input.itemId,
      kind: input.kind,
      storagePath: input.storagePath,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      durationSec: input.durationSec,
      note: input.note,
      annotations: input.annotations ?? undefined,
    })
    const persisted = await db.capture.findUniqueOrThrow({
      where: { id: captureId },
      select: {
        annotations: true,
        itemEvidence: { where: { itemId: input.itemId }, select: { itemId: true }, take: 1 },
      },
    })
    const stored = toAnnotations(persisted.annotations)
    return {
      id: captureId,
      itemApplied: !input.itemId || persisted.itemEvidence.some(({ itemId }) => itemId === input.itemId),
      annotationsApplied: !input.annotations || !!stored && isDeepStrictEqual(
        { w: stored.w, h: stored.h, marks: stored.marks },
        input.annotations,
      ),
    }
  },
)
