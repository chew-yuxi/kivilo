import { authed } from '@/lib/api/route'
import { recordClientErrors } from '@/lib/errors'

/// Errors an agent's browser saw and the server did not. Signed in only: the reporter
/// mounts in the (app) layout, and an open endpoint would be a free write to our database.
export const POST = authed(async (agent, _params, request) => ({
  recorded: await recordClientErrors(agent.id, await request.json(), request.headers.get('user-agent')),
}))
