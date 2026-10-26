import { z } from 'zod'
import { authed } from '@/lib/api/route'
import { verifyPlayPurchase } from '@/lib/play-billing'

const input = z.object({ purchaseToken: z.string().min(1).max(4096) })
export const POST = authed(async (_agent, _params, request) => {
  const { purchaseToken } = input.parse(await request.json())
  return verifyPlayPurchase(purchaseToken)
})
