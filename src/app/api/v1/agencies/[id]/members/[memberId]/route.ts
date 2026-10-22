import { z } from 'zod'
import { authed } from '@/lib/api/route'
import { changeAgencyMember } from '@/lib/agency-actions'

export const PATCH = authed(async (_agent, { id, memberId }: { id: string; memberId: string }, request) => {
  const input = z.object({ role: z.enum(['OWNER', 'MANAGER', 'AGENT']).optional(), action: z.enum(['remove', 'revoke', 'resend']).optional(), reassignToId: z.string().optional() }).strict().parse(await request.json())
  return changeAgencyMember(id, memberId, input)
})
