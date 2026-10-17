import { authed } from '@/lib/api/route'
import { recordProductEvents } from '@/lib/product-events'

export const POST = authed(async (agent, _params, request) => {
  // An older tab may still hold another account's queue after a sign-in elsewhere.
  // This is a precondition only; identity always comes from the verified session.
  const owner = request.headers.get('x-kivilo-owner')
  if (owner && owner !== agent.id) throw new Error('Event account not found')
  return { recorded: await recordProductEvents(agent.id, await request.json()) }
})
