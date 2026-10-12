import { z } from 'zod'
import { authed } from '@/lib/api/route'
import { publishAssessment } from '@/lib/assessment-actions'

// Builds 12 to 20 post an empty body, so they can never confirm a no-damage assessment.
const publishInput = z.object({ noFindings: z.boolean().optional() })

export const POST = authed(async (_agent, { id }: { id: string }, request) =>
  publishAssessment(id, publishInput.parse(await request.json())))
