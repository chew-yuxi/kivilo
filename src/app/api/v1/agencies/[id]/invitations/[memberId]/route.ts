import { z } from 'zod'
import { authed } from '@/lib/api/route'
import { respondAgencyInvitation } from '@/lib/agency-actions'

export const POST = authed(async (_agent, { id, memberId }: { id: string; memberId: string }, request) => {
  const { action } = z.object({ action: z.enum(['accept', 'decline']) }).parse(await request.json())
  return respondAgencyInvitation(id, memberId, action)
})
