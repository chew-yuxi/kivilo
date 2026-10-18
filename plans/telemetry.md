# Telemetry: errors first, then usage

Track bugs and usage in our own Postgres, without a third-party analytics tool. The shape is
borrowed from Teasa (`~/projects/teasa`, `product_events` plus allowlists, client UUIDs,
server-stamped identity) with its weakest part fixed: Teasa's web app records no client
errors at all.

## Phase 1: errors (this change)

1. **`ErrorEvent` table.** One row per occurrence, grouped on read by `fingerprint`:
   a hash of source, name, and the message and path with ids and numbers normalized out,
   so the same bug on two inspections is one problem. No IP. `stakeholderId` cascades.
2. **Server capture.** `src/instrumentation.ts` `onRequestError` records every failing
   render, server action and route handler, with the digest React sends the browser.
   `authed` in `src/lib/api/route.ts` catches its own 500s, so it records them itself,
   with the agent it already resolved.
3. **Web capture.** `<ErrorReporter />` in the `(app)` layout listens for `error` and
   `unhandledrejection`; `(app)/error.tsx` reports what the boundary caught. Anything
   carrying a digest came from the server and is already recorded with its real message,
   so the browser skips it. Reports wait in `localStorage` (cap 20) until
   `POST /api/v1/errors` confirms them, because errors cluster where the signal is worst.
   The ingest goes through `authed`, so the Flutter app can use it later with its bearer.
4. **Alerting.** `/api/internal/errors`, every 15 minutes: emails `ERROR_ALERT_TO`
   through Resend for each fingerprint never alerted before, stamps `notifiedAt`, and
   deletes events older than 90 days. One email per new kind of error, never per
   occurrence.
5. **Privacy.** The privacy page names error reports, their 90-day retention, and that
   account deletion removes them; `scripts/fulfill-account-deletion.ts` deletes them.

Not covered in phase 1: errors on `/login`, `/` and `/reports/[token]` in the browser
(the reporter only mounts for signed-in agents), cron job failures (they already return
503 and show in Vercel), and attributing server render errors to an agent.

Deploy needs: migration `20261013190000_error_events`, `ERROR_ALERT_TO` in Vercel
production env, then push (the cron is in `vercel.json`).

## Phase 2: usage (built 2026-10-17)

`ProductEvent` stores strictly allowlisted `screen_viewed` events with a screen category,
client UUID, source, release and server-stamped account. No paths, free text, query
strings or report tokens. The web reporter bounds its per-account offline queue at 20;
unavailable browser storage falls back to memory. `POST /api/v1/events` accepts the same
batch from web and native clients, and checks the web queue's owner precondition against
the verified session to prevent a stale tab attributing events to a different account.

`/admin` is guarded in the data layer by a comma-separated `ADMIN_EMAILS` allowlist
(empty denies everyone). It shows 30-day active accounts, screen views, frequent
errors, and the saved inspection funnel across both clients, using inspection, room and
capture state rather than duplicating workflow transitions as events. Native screen
instrumentation was added on 18 October 2026 (details below). Events expire after 90 days through the existing
errors cron and are removed on account deletion. The privacy page describes this.

Deploy: migration `20261017120000_product_events`, set `ADMIN_EMAILS`, then deploy.

## Phase 3: Flutter errors (built 2026-10-14)

`mobile/lib/services/error_reporter.dart`: `FlutterError.onError`,
`PlatformDispatcher.instance.onError` and `plainError`'s fallback post to `/api/v1/errors`
with `source` ANDROID or IOS and the build and Shorebird patch as `release`, buffered in a
file under the app support directory (cap 20). Server and network failures are never
reported. An upload that loses signal now raises `ApiFailure.noConnection` instead of a
`StateError`, so the pending card says "No connection" and it is not reported.
Server: migration `20261014090000_error_source_app` adds the two sources, and
`redactSecrets` cuts JWTs (signed storage tokens) from messages and stacks.

Ships as a Shorebird patch on `1.0.0+22`: pure Dart, no new plugin, no new icon. The
server half must be deployed first, or the app's batches are refused with a 400 and
dropped. Build 13 on Play production cannot be patched.

## Native screen usage (18 October 2026)

`mobile/lib/services/product_events.dart` records the same nine allowlisted screen
categories as the web ingest accepts, with IOS/ANDROID source and the installed build
and Shorebird patch. It records route visibility and selected tabs, not widget rebuilds
or hidden tabs. It sends no route, tenancy id, report token or free text.

Events wait in a file-backed queue (20 per account, at most three recent accounts) and
flush on screen visits, sign-in and foregrounding. The queue is partitioned by Supabase
auth user id. Before sending, the reporter resolves the corresponding Stakeholder using
a verified `/api/v1/me` request and supplies `x-kivilo-owner`; the bearer is pinned to
that account on every request. Signing out or switching accounts leaves the old queue
for its owner and cannot attribute it to the next account. Delivery uses client UUIDs,
so retries after an interrupted response deduplicate on the server.

This needs no migration or plugin beyond phase 2 and can ship as a Dart patch to the
current native releases. `/admin` already aggregates all three sources.
