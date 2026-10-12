import { z } from 'zod'
import { createFinding } from '@/lib/actions'
import { authed } from '@/lib/api/route'
import { CHANGE_TYPES, VERDICTS } from '@/lib/inspection/schema'

export const dynamic = 'force-dynamic'

const body = z.object({
  itemId: z.string().min(1).nullable(),
  baselineItemId: z.string().min(1).nullable(),
  changeType: z.enum(CHANGE_TYPES),
  verdict: z.enum(VERDICTS),
  rationale: z.string().trim().min(1).max(10000),
  estimatedCost: z.string().regex(/^\d{1,8}(\.\d{1,2})?$/).nullable(),
}).strict()

export const POST = authed(async (_agent, { id }: { id: string }, request) => {
  return { id: await createFinding(id, body.parse(await request.json())) }
})
