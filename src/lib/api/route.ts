import { after } from 'next/server'
import { currentStakeholder } from '@/lib/auth'
import { recordServerError } from '@/lib/errors'
import type { Stakeholder } from '@/generated/prisma'
import { ZodError } from 'zod'
import { MoveInDefectStaleTargetError } from '@/lib/move-in-defects'
import { AgencyActionError } from '@/lib/agency-errors'
import { PropertyLifecycleError } from '@/lib/property-errors'
import { SupportingDocumentError } from '@/lib/supporting-documents-errors'

/// Transport for the native client. These handlers are deliberately thin: they resolve
/// the agent, call the same function the web app calls, and serialise the result. No
/// authorization logic lives here, because a second place to get it right is a second
/// place to get it wrong, which is exactly what the data-layer invariant forbids.
///
/// The proxy does not cover /api, so nothing redirects a request with no cookie; the
/// bearer check below is what refuses it.
export function authed<P>(
  handler: (agent: Stakeholder, params: P, request: Request) => Promise<unknown>,
  options: { pinOwner?: boolean } = {},
) {
  return async (request: Request, context: { params: Promise<P> }) => {
    // Resolves the same way the action inside will, and is memoized per request, so the
    // token is verified once however many times it is asked for.
    const stakeholder = await currentStakeholder()
    if (!stakeholder) {
      return Response.json({ error: 'unauthorized' }, { status: 401 })
    }
    if (options.pinOwner && request.headers.has('x-kivilo-owner') && request.headers.get('x-kivilo-owner') !== stakeholder.id) {
      return Response.json({ error: 'unauthorized' }, { status: 401 })
    }

    try {
      return Response.json(await handler(stakeholder, await context.params, request))
    } catch (error) {
      // A refusal and a missing row are the same 404 with the same body, so the API
      // cannot be used to discover which ids are real. Nothing else is echoed back: the
      // thrown message can carry a Prisma model name or a driver error.
      const message = error instanceof Error ? error.message : ''
      if (error instanceof SupportingDocumentError) {
        return Response.json({ error: error.code, message: error.message }, { status: error.code === 'invalid_document' ? 400 : 409 })
      }
      if (error instanceof PropertyLifecycleError) {
        return Response.json({ error: error.code, message: error.message }, { status: 409 })
      }
      if (/not found/i.test(message)) {
        return Response.json({ error: 'not_found' }, { status: 404 })
      }
      if (error instanceof AgencyActionError) {
        return Response.json({ error: 'agency_conflict', message: error.message }, { status: 409 })
      }
      if (error instanceof ZodError || error instanceof SyntaxError ||
          /^(Invalid signature image|Invalid capture client id|Unsupported capture file type|Capture path|Photo path|Unsupported logo|The landlord and tenant need different email addresses)/.test(message)) {
        return Response.json({ error: 'invalid_request' }, { status: 400 })
      }
      if (/^Plan limit reached/.test(message)) {
        return Response.json({ error: 'plan_limit' }, { status: 403 })
      }
      if (/no longer be changed/i.test(message)) {
        return Response.json({ error: 'report_frozen' }, { status: 409 })
      }
      if (/Capture has not reached storage|Photo has not reached storage/i.test(message)) {
        return Response.json({ error: 'capture_missing' }, { status: 409 })
      }
      if (/Maintenance evidence has not reached storage/i.test(message)) {
        return Response.json({ error: 'evidence_missing' }, { status: 409 })
      }
      if (/Finding photos are still uploading|finding photo draft is closed/i.test(message)) {
        return Response.json({ error: 'finding_photos_pending' }, { status: 409 })
      }
      if (/Restore the room first/.test(message)) {
        return Response.json({ error: 'restore_room_first', message }, { status: 409 })
      }
      if (/^Finding save conflict/.test(message)) {
        return Response.json({ error: 'finding_save_conflict' }, { status: 409 })
      }
      if (/rooms? still need review|Add and review at least one room|Review every room with new captures|Finish capturing this room|Add at least one item/i.test(message)) {
        return Response.json({ error: 'review_incomplete' }, { status: 409 })
      }
      if (/Review every finding before publishing/i.test(message)) {
        return Response.json({ error: 'assessment_review_incomplete' }, { status: 409 })
      }
      if (/A revised statement has been published|already been answered/i.test(message)) {
        return Response.json({ error: 'statement_changed' }, { status: 409 })
      }
      if (/Confirm that no damage was found/i.test(message)) {
        return Response.json({ error: 'no_damage_unconfirmed' }, { status: 409 })
      }
      if (/Capture client id already registered|Capture is already registered with different media|Capture was deleted/i.test(message)) {
        return Response.json({ error: 'capture_conflict' }, { status: 409 })
      }
      if (/Maintenance .* conflict|already verified/i.test(message)) {
        return Response.json({ error: 'maintenance_conflict' }, { status: 409 })
      }
      if (/Renewal dates must follow|Invalid maintenance status transition|Closing without action requires a reason|Only a completed visit can be verified|After evidence requires a completed visit|Only a human-reviewed inspection item can be linked/i.test(message)) {
        return Response.json({ error: 'invalid_state' }, { status: 409 })
      }
      if (/Only a countersigned check-in can be updated|Only a resolved repair|Give the update a title|Add at least one change|Each item can change only once|no longer in the report/i.test(message)) {
        return Response.json({ error: 'invalid_state' }, { status: 409 })
      }
      if (error instanceof MoveInDefectStaleTargetError) {
        return Response.json({ error: 'move_in_defect_stale_target' }, { status: 409 })
      }
      if (/move-in (?:defect window|notice|notices|defect)|repair was not recorded as a move-in/i.test(message)) {
        return Response.json({ error: 'invalid_state' }, { status: 409 })
      }
      if (/not awaiting signature|already countersigned|already signed|no email on file|Only a completed check-in|Only a countersigned report|Findings require a reviewed|Share link changed|Save your agency name/i.test(message)) {
        return Response.json({ error: 'invalid_state' }, { status: 409 })
      }
      console.error('API route failed:', error)
      // Caught here, so Next never sees it and onRequestError never fires. Recorded after
      // the response, because the app reads this JSON body and a database too broken to
      // record the error must not also turn it into a different response.
      after(() => recordServerError(error, {
        context: 'api',
        path: new URL(request.url).pathname,
        userAgent: request.headers.get('user-agent'),
        stakeholderId: stakeholder.id,
      }))
      return Response.json({ error: 'server_error' }, { status: 500 })
    }
  }
}
