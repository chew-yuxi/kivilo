import { z } from 'zod'
import { updateFinding } from '@/lib/actions'
import { authed } from '@/lib/api/route'

export const dynamic = 'force-dynamic'

const body = z.object({
  verdict: z.enum(['TENANT_LIABLE', 'FAIR_WEAR', 'DISPUTED', 'UNDECIDED']).optional(),
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
