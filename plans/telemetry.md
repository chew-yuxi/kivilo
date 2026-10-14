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

## Phase 2: usage

`ProductEvent` table with an allowlist of event names and property keys (Teasa's
`packages/contracts/src/product-event-keys.ts` is the model), the funnel read from
existing timestamps (inspection created, captured, reviewed, sent, countersigned) rather
than duplicated into events, and an `/admin` page behind an `ADMIN_EMAILS` allowlist.

## Phase 3: Flutter errors

`FlutterError.onError` and `PlatformDispatcher.instance.onError` posting to
`/api/v1/errors` with a platform field. Ships in a store build.
