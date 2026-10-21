import { authed } from '@/lib/api/route'
import { tenancyAccess } from '@/lib/tenancy-access'
import { addTenancyCollaborator } from '@/lib/tenancy-access-actions'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

export const GET = authed(async (agent, { id }: { id: string }) =>
  tenancyAccess(id, agent.id))

export const POST = authed(async (_agent, { id }: { id: string }, request) => {
  const input = z.object({ email: z.string() }).parse(await request.json())
  return addTenancyCollaborator(id, input.email)
})
