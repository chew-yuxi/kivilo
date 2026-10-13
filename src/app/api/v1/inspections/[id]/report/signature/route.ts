import { z } from 'zod'
import { signOwnReport } from '@/lib/actions'
import { authed } from '@/lib/api/route'

export const dynamic = 'force-dynamic'

const body = z.object({
  imageData: z.string().startsWith('data:image/png;base64,').max(2_000_000),
}).strict()

/// The signed-in landlord or tenant signs their own report. There is no stakeholder id in
/// the body: the signer is whoever holds the token.
export const POST = authed(async (_signer, { id }: { id: string }, request) => {
  const { imageData } = body.parse(await request.json())
  await signOwnReport(id, imageData)
  return { ok: true }
})
