import { z } from 'zod'
import { authed } from '@/lib/api/route'
import { agencyDetail } from '@/lib/agency'
import { renameAgency } from '@/lib/agency-actions'

export const GET = authed(async (agent, { id }: { id: string }) => agencyDetail(id, agent.id))
export const PATCH = authed(async (_agent, { id }: { id: string }, request) => {
  const { name } = z.object({ name: z.string() }).parse(await request.json())
  return renameAgency(id, name)
})
