import { z } from 'zod'
import { authed } from '@/lib/api/route'
import { agencyList } from '@/lib/agency'
import { createAgency } from '@/lib/agency-actions'

export const GET = authed(async (agent) => agencyList(agent.id))
export const POST = authed(async (_agent, _params, request) => {
  const { name } = z.object({ name: z.string() }).parse(await request.json())
  return createAgency(name)
})
