import { currentAgent } from '@/lib/auth'
import type { Stakeholder } from '@/generated/prisma'

/// Transport for the native client. These handlers are deliberately thin: they resolve
/// the agent, call the same function the web app calls, and serialise the result. No
/// authorization logic lives here, because a second place to get it right is a second
/// place to get it wrong, which is exactly what the data-layer invariant forbids.
///
/// The proxy does not cover /api, so nothing redirects a request with no cookie; the
/// bearer check below is what refuses it.
export function authed<P>(
  handler: (agent: Stakeholder, params: P, request: Request) => Promise<unknown>,
) {
  return async (request: Request, context: { params: Promise<P> }) => {
    // Resolves the same way the action inside will, and is memoized per request, so the
    // token is verified once however many times it is asked for.
    const agent = await currentAgent()
    if (!agent) {
      return Response.json({ error: 'unauthorized' }, { status: 401 })
    }

    try {
      return Response.json(await handler(agent, await context.params, request))
    } catch (error) {
      // A refusal and a missing row are the same 404 with the same body, so the API
      // cannot be used to discover which ids are real. Nothing else is echoed back: the
      // thrown message can carry a Prisma model name or a driver error.
      const message = error instanceof Error ? error.message : ''
      if (/not found/i.test(message)) {
        return Response.json({ error: 'not_found' }, { status: 404 })
      }
      if (/no longer be changed/i.test(message)) {
        return Response.json({ error: 'report_frozen' }, { status: 409 })
      }
      console.error('API route failed:', error)
      return Response.json({ error: 'server_error' }, { status: 500 })
    }
  }
}
