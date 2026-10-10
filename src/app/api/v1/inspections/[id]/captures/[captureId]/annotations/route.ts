import { z } from 'zod'
import { annotateCapture } from '@/lib/actions'
import { annotationInputSchema } from '@/lib/annotations'
import { authed } from '@/lib/api/route'

export const dynamic = 'force-dynamic'

/// PUT rather than PATCH: the marks on a photo are replaced wholesale, and null clears
/// them. Both clients write this same column, so the payload is the shared schema.
const body = z.object({ annotations: annotationInputSchema.nullable() })

export const PUT = authed(
  async (_agent, { id, captureId }: { id: string; captureId: string }, request) => {
    await annotateCapture(captureId, id, body.parse(await request.json()).annotations)
    return { ok: true }
  },
)
