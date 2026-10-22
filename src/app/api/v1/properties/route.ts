import { z } from 'zod'
import { authed } from '@/lib/api/route'
import { managedProperties } from '@/lib/property-management'

export const dynamic = 'force-dynamic'
export const GET = authed(async (actor, _params, request) => {
  const state = z.enum(['active', 'archived', 'trash']).parse(new URL(request.url).searchParams.get('state') ?? 'active')
  return managedProperties(actor.id, state)
})
