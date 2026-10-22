import { z } from 'zod'
import { authed } from '@/lib/api/route'
import { assignTenancy } from '@/lib/agency-actions'

export const PATCH = authed(async (_agent, { id }: { id: string }, request) => {
  const input = z.object({ agencyId: z.string().optional(), leadAgentId: z.string().optional(), memberIds: z.array(z.string()).optional() }).strict().parse(await request.json())
  return assignTenancy(id, input)
})
