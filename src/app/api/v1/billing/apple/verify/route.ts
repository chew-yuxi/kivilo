import { z } from 'zod'
import { authed } from '@/lib/api/route'
import { verifyApplePurchase } from '@/lib/apple-billing'

export const runtime = 'nodejs'
export const maxDuration = 60
const input = z.object({ signedTransaction: z.string().min(1).max(40000) })
export const POST = authed(async (_agent, _params, request) => {
  const { signedTransaction } = input.parse(await request.json())
  return verifyApplePurchase(signedTransaction)
}, { pinOwner: true })
