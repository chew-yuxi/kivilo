import { z } from 'zod'
import { authed } from '@/lib/api/route'
import { appleAgencyContext, prepareApplePurchase } from '@/lib/apple-billing'

const input = z.object({ productId: z.string().min(1).max(100), agencyId: z.string().min(1).max(100).optional() })
export const POST = authed(async (_agent, _params, request) => {
  const { productId, agencyId } = input.parse(await request.json())
  return prepareApplePurchase(productId, appleAgencyContext(agencyId))
}, { pinOwner: true })
