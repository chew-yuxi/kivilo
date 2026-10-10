import { z } from 'zod'
import { authed } from '@/lib/api/route'
import { grantAiConsent } from '@/lib/ai-consent'

export const POST = authed(async (_agent, { id }: { id: string }, request) => {
  z.object({ consent: z.literal(true) }).parse(await request.json())
  return grantAiConsent(id)
})
