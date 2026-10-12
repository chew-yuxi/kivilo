import { z } from 'zod'
import { deleteFinding, updateFinding } from '@/lib/actions'
import { authed } from '@/lib/api/route'
import { CHANGE_TYPES, VERDICTS } from '@/lib/inspection/schema'

export const dynamic = 'force-dynamic'

const body = z.object({
  changeType: z.enum(CHANGE_TYPES).optional(),
  verdict: z.enum(VERDICTS).optional(),
  rationale: z.string().trim().min(1).max(10000).optional(),
  estimatedCost: z.string().regex(/^\d{1,8}(\.\d{1,2})?$/).nullable().optional(),
  maintenanceCaseId: z.string().min(1).nullable().optional(),
}).strict().refine((value) => Object.keys(value).length > 0)

export const PATCH = authed(
  async (_agent, { id, findingId }: { id: string; findingId: string }, request) => {
    await updateFinding(findingId, id, body.parse(await request.json()))
    return { ok: true }
  },
)

export const DELETE = authed(
  async (_agent, { id, findingId }: { id: string; findingId: string }) => {
    await deleteFinding(findingId, id)
    return { ok: true }
  },
)
