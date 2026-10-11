import { currentStakeholder } from '@/lib/auth'
import type { Stakeholder } from '@/generated/prisma'
import { ZodError } from 'zod'

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
    const stakeholder = await currentStakeholder()
    if (!stakeholder) {
      return Response.json({ error: 'unauthorized' }, { status: 401 })
    }

    try {
      return Response.json(await handler(stakeholder, await context.params, request))
    } catch (error) {
      // A refusal and a missing row are the same 404 with the same body, so the API
      // cannot be used to discover which ids are real. Nothing else is echoed back: the
      // thrown message can carry a Prisma model name or a driver error.
      const message = error instanceof Error ? error.message : ''
      if (/\bmodel\b.*\b(no longer available|not available|does not exist|not found|unsupported)\b/i.test(message)) {
        return Response.json({ error: 'ai_unavailable' }, { status: 503 })
      }
      if (/not found/i.test(message)) {
        return Response.json({ error: 'not_found' }, { status: 404 })
      }
      if (error instanceof ZodError || error instanceof SyntaxError ||
          /^(Invalid signature image|Invalid capture client id|Unsupported capture file type|Capture path)/.test(message)) {
        return Response.json({ error: 'invalid_request' }, { status: 400 })
      }
      if (/no longer be changed/i.test(message)) {
        return Response.json({ error: 'report_frozen' }, { status: 409 })
      }
      if (/AI processing consent is required/i.test(message)) {
        return Response.json({ error: 'consent_required' }, { status: 409 })
      }
      if (/Capture has not reached storage/i.test(message)) {
        return Response.json({ error: 'capture_missing' }, { status: 409 })
      }
      if (/Maintenance evidence has not reached storage/i.test(message)) {
        return Response.json({ error: 'evidence_missing' }, { status: 409 })
      }
      if (/rooms? still need review|Add and review at least one room|Room must be processed before review|Process all new captures/i.test(message)) {
        return Response.json({ error: 'review_incomplete' }, { status: 409 })
      }
      if (/Review every finding before publishing/i.test(message)) {
        return Response.json({ error: 'assessment_review_incomplete' }, { status: 409 })
      }
      if (/Capture client id already registered|Capture is already registered with different media|Capture was deleted/i.test(message)) {
        return Response.json({ error: 'capture_conflict' }, { status: 409 })
      }
      if (/Maintenance .* conflict|already verified/i.test(message)) {
        return Response.json({ error: 'maintenance_conflict' }, { status: 409 })
      }
      if (/Invalid maintenance status transition|Closing without action requires a reason|Only a completed visit can be verified|After evidence requires a completed visit|Only a human-reviewed inspection item can be linked/i.test(message)) {
        return Response.json({ error: 'invalid_state' }, { status: 409 })
      }
      if (/not awaiting signature|already countersigned|Only a completed check-in|Only a countersigned report|Findings require a reviewed|Share link changed/i.test(message)) {
        return Response.json({ error: 'invalid_state' }, { status: 409 })
      }
      console.error('API route failed:', error)
      return Response.json({ error: 'server_error' }, { status: 500 })
    }
  }
}
