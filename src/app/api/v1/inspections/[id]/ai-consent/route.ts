import { z } from 'zod'
import { authorizeInspection } from '@/lib/auth'
import { authed } from '@/lib/api/route'

/// Kept for installed app builds up to 19, which ask for AI consent before finishing a
/// room and stop if this fails. Nothing is sent to an AI provider any more, so there is
/// nothing to consent to and nothing is recorded. Delete once no such build is in use.
export const POST = authed(async (agent, { id }: { id: string }, request) => {
  z.object({ consent: z.literal(true) }).parse(await request.json())
  await authorizeInspection(id, agent.id)
  return { consentedAt: new Date() }
})
