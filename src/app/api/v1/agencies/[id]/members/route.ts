import { z } from 'zod'
import { authed } from '@/lib/api/route'
import { inviteAgencyMember } from '@/lib/agency-actions'

export const POST = authed(async (_agent, { id }: { id: string }, request) => {
  const input = z.object({ email: z.string(), role: z.enum(['MANAGER', 'AGENT']).optional() }).parse(await request.json())
  return inviteAgencyMember(id, input)
})
