import { z } from 'zod'
import { updateCaptureNote, deleteCapture } from '@/lib/actions'
import { authed } from '@/lib/api/route'

export const dynamic = 'force-dynamic'

const note = z.object({ note: z.string().nullable() })

export const PATCH = authed(
  async (_agent, { id, captureId }: { id: string; captureId: string }, request) => {
    await updateCaptureNote(captureId, id, note.parse(await request.json()).note)
    return { ok: true }
  },
)

export const DELETE = authed(
  async (_agent, { id, captureId }: { id: string; captureId: string }) => {
    await deleteCapture(captureId, id)
    return { ok: true }
  },
)
