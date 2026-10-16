import { z } from 'zod'
import { emailSigningLink } from '@/lib/actions'
import { authed } from '@/lib/api/route'

export const dynamic = 'force-dynamic'

const body = z.object({ stakeholderId: z.string().min(1) }).strict()

/// The agent emails the landlord or tenant the link to sign, again or for the first time.
export const POST = authed(async (_agent, { id }: { id: string }, request) => {
  const { stakeholderId } = body.parse(await request.json())
  await emailSigningLink(id, stakeholderId)
  return { ok: true }
})
