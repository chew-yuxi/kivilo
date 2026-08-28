# Converting Kivilo to Flutter

Decided 2026-08-28. Yuxi asked to convert the inspector app to Flutter, overriding the
earlier "stay on the PWA" call recorded in `capture-ux-diagnosis.md`. The reason is the
one thing the web genuinely cannot do: a camera shutter that stays open, with no OS
round trip per photo. Publishing and store accounts are Yuxi's, not this plan's.

Written by a design panel that scored three architectures against each other and had each
critiqued; the spine chosen is **api-first**, one backend with two clients.

## Already done, 2026-08-28

Ahead of the plan below, because they de-risk the rest and are additive:

- **The auth bridge is proven, not assumed.** `supabase.auth.getUser(jwt)` in the
  installed auth-js 2.112.3 issues a real `GET /user` to the auth server, so a bearer
  token is verified exactly as strongly as a cookie. A full local run confirmed it: OTP
  sign-in with no cookies, the server resolving the bearer to the right agent, and a
  tampered token rejected on signature. `agentFromBearer` and `resolveAgent` in
  `src/lib/auth.ts` are the whole change, and every existing check below them is
  untouched. This is what makes the migration a client port rather than a rewrite of the
  security boundary.
- **Three read endpoints exist**: `GET /api/v1/me`, `/api/v1/inspections`,
  `/api/v1/inspections/[id]`, through `authed()` in `src/lib/api/route.ts`, which is
  transport only and holds no authorization logic. Pinned by `e2e/api.spec.ts`, which
  signs in with no browser and asserts that another agent's inspection is byte-identical
  to one that never existed.
- **`mobile/` exists** and runs: six digit sign-in, the inspection list, and one
  inspection's rooms, read only. `flutter analyze` is clean.

Then, same day:

- **The seam actually works for writes.** The first cut could not have: every write
  endpoint delegates to a server action, and the actions resolve the agent through
  `requireAgent`, which reads a cookie. Fixed in one place, `currentAgent`, which now
  takes a bearer token from the Authorization header when there is one. So a server
  action serves either client unchanged and there is still one boundary.
- **The capture path is open**: create an inspection, add a room, take a signed upload
  credential, PUT bytes straight to storage, register the capture with marks, finish the
  room. `e2e/api.spec.ts` walks all of it with no browser at all.
- **The session moved to the Keychain**, off the default plaintext store.
- **`lib/services/capture_queue.dart`**, drift-backed, with 9 tests pinning the
  invariant: nothing discarded however often it fails, failures sorted to the back of the
  line, a lease so two isolates cannot claim one row, no re-upload once the server has the
  bytes, and `take` reporting the record atomically so a note typed mid-flight is not lost.

Known gaps: no camera UI yet, so nothing fills the queue; no uploader draining it; review
and signing are still web-only.

# THE PLAN: Kivilo on Flutter

Spine: **api-first** (one backend, two clients, a thin JSON layer under `/api/v1` that delegates to the existing 21 server actions and reuses `src/lib/auth.ts` verbatim). Grafted from **strangler**: the falsification spike first, capture-first milestone order, native signature pad, TestFlight/Play internal as the distribution path. Rejected outright: **supabase-native** (RLS/PostgREST as the boundary) and the strangler's webview shell. Reasons in "What I would not do".

## The shape

One Next.js app on Vercel (`sin1`) keeps every line of server logic it has today: Prisma against the Singapore transaction pooler, `src/lib/auth.ts` as the single authorization boundary, Gemini extraction, the Claude diff, the Resend send-email hook, the landing page, and the landlord's report at `/reports/[token]`. Beside the server actions it grows a second front door: about 19 route handlers under `src/app/api/v1/` that are pure transport, each parsing params, calling the same function the PWA calls, and returning JSON. `currentAgent()` gains one branch so a `Authorization: Bearer <supabase access_token>` resolves the same `Stakeholder` row a cookie does; everything below that line (`inspectionScope`, `authorizeInspection`, `authorizeRoom`) is untouched and remains the only path to the database. A Flutter inspector app in `mobile/` becomes the thing an agent holds: native OTP sign-in, native room list, a **live camera preview with a shutter that stays open**, a drift/SQLite queue with bytes on disk and `background_downloader` draining it while the phone is in a pocket, a native mark editor writing byte-identical geometry into the same `Capture.annotations` column, and a native signature pad. The PWA inspector stays live the whole time as the rollback path and as the thing `pnpm test:e2e` drives, and is deleted on a date you set, not when Flutter "feels done".

## What ships on 2026-09-13

**The PWA, unchanged.** Nothing in this plan is on `main` under `src/` before go-live. Full stop.

What genuinely does not ship on 09-13: any Flutter build, any `/api/v1` endpoint, the continuous shutter, background upload. The first thing a real agent could hold that is better than the PWA is a TestFlight/Play-internal build with native capture only, and that is **late October at the earliest**, mid-November realistically.

Two things that belong to 09-13 and are not Flutter's problem, but will be blamed on it if they are still open in November: `ANTHROPIC_API_KEY` is unset in production (`DEPLOYING.md:89`), so the check-out diff has never returned a real Claude response, and a room that parks as `FAILED` pages nobody (`DEPLOYING.md:106`). Close both before the Flutter findings screen is built, or M6 is written against an unverified contract.

The one legitimate pre-09-13 activity: the M0 spike, which creates no file under `src/`, and a dated note on `plans/capture-ux-diagnosis.md` recording that its "stay on the PWA" decision was revisited on 2026-08-28. Do that only if the go-live checklist is otherwise clear. The quiet way to miss 09-13 is to spend the last fortnight on Flutter instead of on the capture-sheet fixes that document actually calls for.

## Backend

**All 21 server actions stay in `src/lib/actions.ts` with their `'use server'` directive.** A `'use server'` export is an ordinary async function to server code that imports it, so a route handler is a five-line delegation and there is exactly one implementation of every mutation. That is the whole reason to pick this spine: a Flutter bug can be a rendering bug or a queue bug, it cannot be a "the mobile endpoint forgot `authorizeRoom`" bug.

But the api-first design's central claim, "nothing in `actions.ts` changes", is **false as written**, and the critique proved it. Four changes to shipping server code are required, all landing in M1 with `pnpm test:e2e` green:

1. **A status gate that today lives in a page, not an action.** `src/app/(app)/inspections/[id]/rooms/[roomId]/capture/page.tsx:22-33` filters to `status in ['DRAFT','CAPTURING','PROCESSING','REVIEW','FAILED']`. That page query is the *only* thing stopping a capture being added to a countersigned report: `requestUploadUrl` (`actions.ts:174`) calls `authorizeRoom` and nothing else, and `registerCapture` deliberately never rejects on status. Fix: `requestUploadUrl` refuses at `AWAITING_SIGNATURE` and `COMPLETED` (no new bytes can reach storage for a document that has been sent out), and `registerCapture` refuses at `COMPLETED` only (a capture already in flight when the agent tapped Send must still land, which is the invariant that comment is protecting). This closes a hole that exists in production today.
2. **Typed errors.** Every refusal is a bare `new Error('Inspection not found')`, and `PrismaClientKnownRequestError` and `ZodError` are also `instanceof Error`. Server actions redact thrown messages before the browser sees them; a JSON API does not. Without a type to switch on, the wrapper degenerates into matching message strings and leaks Prisma model names on a pool failure. Add an `AppError` with a code union (`not_found` | `invalid` | `conflict`) thrown from `auth.ts` and `actions.ts`; anything else is a bare 500 with no body.
3. **Capture idempotency.** Today: `requestUploadUrl` mints a fresh random `storagePath` every call, then `uploadToSignedUrl`, then `registerCapture`, then `patch(id, {uploadedId})`. Drop the connection between the server committing `registerCapture` and the response landing and the next pass re-uploads the bytes to a new path and creates a **second** `Capture` row: duplicate evidence, duplicate photos into `processRoom` so the drafted inventory doubles, orphaned objects in a 1 GB bucket. One photo at a time through an OS camera intent makes this rare; a twelve-shot burst in a lift lobby makes it routine. Fix: the client mints the capture id, a migration adds the unique index, `registerCapture` upserts. This is a migration plus an `actions.ts` change and it is not optional once the shutter is continuous.
4. **`src/lib/queries.ts`.** The read endpoints are the part of this spine that is genuinely new authorization code, not transport, and the room GET mints a signed download URL per capture, so a scoping slip hands out another agent's evidence. Extract the four page queries into functions called by both the page and the handler. Keep the capture context and the review context **separate**: the review page has no status filter, the capture page does, and `next` means different things (capture: `rooms[index+1]`, the literal next room in the walk; review: the next room that still needs review).

**Endpoints** (18 files, 22 routes). Reads: `GET /api/v1/me`, `/inspections`, `/inspections/[id]`, `/inspections/[id]/rooms/[roomId]` (capture context, with signed URLs and parsed annotations), plus a cheap `GET /inspections/[id]/status` for the processing poll, because polling the full detail endpoint is N storage round trips a tick from a phone on bad signal. Writes, 1:1 with the actions: `POST /inspections`, `POST|PATCH|DELETE /inspections/[id]/rooms[/[roomId]]`, `.../reviewed`, `.../finish`, `.../upload-url`, `.../captures`, `.../items`, `PATCH|DELETE /inspections/[id]/captures/[captureId]`, `PUT /inspections/[id]/captures/[captureId]/annotations`, `PATCH|DELETE /inspections/[id]/items/[itemId]`, `POST /inspections/[id]/complete-review`, `/signatures`, `/findings`, `PATCH /findings/[findingId]`, `POST|DELETE /inspections/[id]/share`, `POST /inspections/[id]/check-out`. The inspection id stays in the path everywhere, because `registerCapture` and `annotateCapture` already use it as a cross-check.

**Auth reuse.** Refactor `currentAgent()` so the Supabase user is a parameter: `resolveAgent(user)` holds the claim-an-existing-Stakeholder logic and the P2002 race handler, and is called by both a cookie caller and a bearer caller. Two real call sites, so this is not a helper wrapping one. Verify with `supabase.auth.getUser(jwt)` (a real round trip to the auth server, which preserves the posture the header comment in `auth.ts` states); move to local JWKS verification only if you measure it hurting, and note that switching to asymmetric signing keys is a project-level change affecting the web path too, so it is not a Flutter-only decision.

Five rules the wrapper enforces, each of which is a silent regression if missed:

- **Bearer only on `/api/v1`. No cookie fallback.** Route handlers get none of the Origin/Host check server actions get for free; a cookie fallback would put `POST .../finish` (a status flip plus a paid Gemini run) behind a cross-site `fetch(..., {credentials:'include'})`.
- **Same status and body for missing and for forbidden.** `authorizeInspection` returns the identical error for both so the API cannot enumerate ids. A mechanical port that maps not-found to 404 and not-yours to 403 reintroduces exactly the oracle. This is the single most likely regression in the whole port; it gets its own contract tests.
- **Re-throw Next's control-flow errors.** `redirect()` and `notFound()` throw digest-carrying errors that a catch-all would swallow. Also add `requireAgentApi()` that 401s instead of `redirect('/login')`, since a 307 to an HTML page is a parse error to a Dart client.
- **`export const dynamic = 'force-dynamic'` and no-store on every route**, since Next overrides `next.config.ts` headers on dynamic routes.
- **Return the updated entity, not void.** `revalidatePath` does nothing for a Flutter caller.

`src/proxy.ts:47` matches only `/inspections/:path*`, so `/api` is already outside it and `public/sw.js:47` already returns early on `/api/`. Neither needs a change. Add a one-line test asserting the matcher never grows to include `/api`, because that regression breaks the send-email hook and every mobile request at once, in production, presenting as "sign-in stopped working".

`AGENTS.md` is edited in the same PR. It currently documents a web-only product ("server actions live in `src/lib/actions.ts` rather than a route folder"); the next session will otherwise re-derive the wrong boundary. Write in the same edit that Flutter must never get direct Supabase data access via RLS, and why.

## Milestones

Nothing from M1 onward exists on `main` before 2026-09-13.

**M0. Falsify it cheaply. 3 days. Can start today; touches no file under `src/`.**
Deliverable: `mobile/` scaffold on Flutter 3.47 (research wins over both designs here: your machine has 3.44.0, upgrade before debugging against a superseded toolchain), proving three things on the actual Android phone the agent uses and against the live Supabase project. (a) `signInWithOtp` + `verifyOtp(type: OtpType.email)` with **no `emailRedirectTo`**, confirming code-only flow skips all deep-link and Associated Domains setup. (b) 30 sequential `takePicture()` calls without leaving the screen, logging per-shot latency, files landing in `getApplicationSupportDirectory()`. (c) `background_downloader` doing a binary **PUT** to a real Supabase signed upload URL (`UploadTask(httpRequestMethod: 'PUT', post: 'binary')`, `Content-Disposition: ''`, `apikey` and `Authorization` headers). Research is explicit that (c) is inference from `validHttpMethods` in the plugin source and appears nowhere in its docs; both designs assumed a transport that works. This is the load-bearing unknown.
Gate: if the shutter does not feel different in the hand, stop the project and spend the days on `plans/capture-ux-diagnosis.md` instead. Unblocks: the decision itself.

**M1. The backend seam. 6 days. Starts 2026-09-15.**
Deliverable: `src/lib/queries.ts`, `AppError`, `resolveAgent(user)` + the bearer branch, `src/lib/api/handler.ts`, 18 route files, the `requestUploadUrl`/`registerCapture` status gate, the client-minted-id migration and upsert, and a Vitest integration contract suite that signs in against local Supabase and walks the same path `pnpm test:e2e` walks but over HTTP with a bearer, asserting the refusals as hard as the successes (another agent's inspection id returns the same 404 on every route, a room id paired with the wrong inspection id returns 404, annotations refused at `AWAITING_SIGNATURE`, upload-url refused at `COMPLETED`). Existing Playwright and `auth.integration.test.ts` pass unchanged, which is the proof the PWA is unaffected. Verify `x-vercel-id` on an `/api/v1` route reads `sin1` on the function half.
Unblocks: everything. This work is worth doing even if Flutter never ships, and it is the part that can silently break the third invariant if rushed.

**M2. Flutter shell. 4 days.** `supabase_flutter` 2.17.2 with a `flutter_secure_storage`-backed `LocalStorage`, an `onAuthStateChange` **`onError` handler** (research: without it, an offline token refresh is an unhandled zone exception that crashes the app, and for this product an offline refresh is Tuesday), `dio` with one interceptor attaching the access token and one retrying after `refreshSession()` on a 401, `freezed` + `json_serializable` models for the four read shapes, inspections list and detail, read only. Unblocks: a phone talking to production.

**M3. Capture and the queue. 8 days.** The largest item and correctly so. Continuous shutter, `flutter_image_compress` at the same `MAX_PHOTO_EDGE = 2048` and quality `0.85` with `autoCorrectionAngle` so orientation is baked into pixels, **drift** (research wins over both designs' sqflite: `select(pending).watch()` is the exact analogue of the `useSyncExternalStore` trio in `offline-queue.ts` and is less code), bytes as files in app support with a **relative** path stored, `background_downloader`, and the room screen rendering local rows and server captures as one list. Gate: 30 photos and a 10-minute video, throttled connection, app backgrounded then force-quit mid-upload, zero losses.

**M4. Annotation. 5 days.** Detailed below. Unblocks: parity on the one column two clients write.

**M5. Review and items. 4 days.** Port `review-editor.tsx`, the evidence strip, mark room reviewed, next-room navigation.

**M6. Finish the loop. 5 days.** `signature` 6.4.0 padded to the report's fixed 520x140 box (research: the package exports only the drawn area, so unpadded signatures from the two clients look inconsistent on the one artefact both parties signed), complete review, share and revoke via `share_plus`, report opened with `url_launcher` in the **system browser**, start check-out, findings editor.

**M7. The screens nobody remembers to budget. 3 days.** New inspection (`new-inspection-form.tsx` is 160 lines: property type, tenancy dates, rent, deposit, two stakeholders, client validation), room add/rename/delete, the processing poller. All three appear in no milestone in any of the three designs.

**M8. Hardening. 5 days.** Offline read cache of the four GETs with a visible "last synced HH:MM", thumbnail cache with refetch on 400 **and** 403 (signed URLs expire in 3600s, `storage.ts:29`), Sentry on both sides into one project, a server-driven minimum-version gate, a full check-in on a real unit end to end.

**M9. Distribution. 4 days plus calendar.** Play internal testing (USD 25, no review, live in minutes) and TestFlight internal (up to 100 App Store Connect role holders, no Beta App Review). Neither needs store review, which is why the pilot must not depend on a listing. Before any external or public listing: a demo account App Review can actually sign into (a six-digit code to a mailbox they do not control blocks them cold), and **in-app account deletion**, which guideline 5.1.1(v) requires of any app that creates accounts. Kivilo creates a `Stakeholder` on first OTP sign-in and there is no delete path among the 21 actions; deciding what happens to inspections they conducted, `Signature` rows and share tokens is a genuine data-model decision, not a screen. Budget it separately when you decide to list publicly.

**Total 47 engineering days, honest range 42 to 52.** At 4 productive days a week (the PWA will generate support work in its first month, and that assumption held in none of the three designs' calendars), that is 11 to 13 calendar weeks from 2026-09-15: first agent-usable capture build **late October**, full inspector **December 2026**.

**M10, dated not conditional: delete the PWA inspector.** Only after ten real inspections on Flutter *and* a Flutter integration-test harness that can seed captures for the web suite (see below). Not before February 2027.

## The hard parts

**Capture and the offline queue.** Six semantics port verbatim from `upload-queue.tsx` and `offline-queue.ts`, and each is a bug if dropped: bytes durable on disk before the queue row exists; the tile rendered from the local row before any network (this is root cause 1 in the diagnosis, "the sheet shows server state, not device state", and the Flutter version must not reintroduce it); sort by `attempts ASC, createdAt ASC` so a repeatedly failing capture goes to the back of the line; **no MAX_ATTEMPTS discard, ever**; resume via the stored server id without re-sending bytes; local file deleted last. Write the Dart tests for these before any capture UI.

Two things are genuinely new and neither design got both right:

- **Isolate race.** `background_downloader` and any WorkManager wake-up run in a **separate Dart isolate with its own drift handle**. The web queue's re-entrancy guard is a `useRef`, which does not cross isolates. Two uploaders can pick the same row, and worse, the hand-over logic infers intent from row absence (`take(id)` returning null means "the inspector deleted this, so delete the server row"), so uploader A can delete a capture uploader B just successfully stored. That is the never-lose-a-capture invariant failing, caused by the port's own headline feature, reproducing only on a real phone on a bad connection. Fix: a `claimedAt` lease column written inside a drift transaction, and an explicit `deletedAt` tombstone instead of inferring deletion from absence.
- **"Survives the app being closed" is half true.** iOS background transfers must complete within 4 hours of enqueue, Android caps at about 9 minutes without pause/resume or a foreground service, and a user swiping the app away in the iOS App Switcher kills scheduled transfers silently. Research wins over the strangler design here, which sold background upload as a headline benefit on an in-process `uploadToSignedUrl`, and over api-first, which put it last as "least likely to be wrong". `background_downloader` shrinks the loss window; the invariant still rests on the drift row and the retry loop, and the copy must say "keep the app open until this finishes" on iOS rather than promising otherwise.

Also: signed upload URLs are minted per attempt today, which is what makes a capture that sat in IndexedDB for six hours upload with a fresh credential. Keep that. A queued row requests a new upload URL at flush time, never at enqueue time, and the background task must be able to re-enqueue with fresh headers after a 401.

**Annotation geometry.** The contract is fixed by `src/lib/annotations.ts` and cannot move, because the same JSON renders in three places and the one that matters legally, `/reports/[token]`, is rendered by the web `MarkOverlay`.

Construction (research wins over both designs, which proposed computing the contain rect by hand inside a painter):

```dart
Center(child: FittedBox(fit: BoxFit.contain, alignment: Alignment.center,
  child: SizedBox(width: w, height: h,             // this IS the viewBox
    child: Stack(children: [
      Positioned.fill(child: Image(image: p, fit: BoxFit.fill)),
      Positioned.fill(child: CustomPaint(painter: MarkPainter(marks, w, h))),
      Positioned.fill(child: Listener(onPointerDown: ..., onPointerMove: ...)),
    ]))))
```

`SizedBox(w, h)` is the `viewBox`; `FittedBox(contain, center)` is `preserveAspectRatio="xMidYMid meet"`; Flutter inverts that transform during hit testing, so `event.localPosition` is **already in intrinsic image pixels**, which is a literal one-to-one with `svg.getScreenCTM().inverse()` and means you write zero coordinate math. The `getBoundingClientRect()` bug `mark-editor.tsx:22-27` warns about cannot be expressed in this construction, and neither can the two measured 100px+ drifts (`room-capture-screen.tsx:92-97`). Use `applyBoxFit` (in `package:flutter/painting.dart`, not `dart:ui`) only as the fallback when the widget cannot be given its own box.

Four correctness details:

- **`toUnit` ports literally, clamp after round.** Research checked the one place JS and Dart could diverge: `Math.round(-0.5)` is `-0`, `(-0.5).round()` is `-1`, both clamp to `0`. No observable divergence. Reordering to "clamp then round" for tidiness would introduce one.
- **Do not port `markPath`'s SVG string.** Build a `ui.Path` (`addOval(Rect.fromCenter(...))` with the `max(..., 1)` degenerate guard kept; arrow with `atan2`, `head = strokeWidth * 4`, `spread = 0.45`). A Dart function that emits SVG strings to satisfy a fixture is not the function that draws. So the shared fixture asserts **sampled points from `Path.computeMetrics`**, not path strings.
- **Halo ordering.** All halos white at `stroke * 2` in one pass, then all reds `#dc2626` at `stroke`, round cap and join. `mark-overlay.tsx` does this deliberately so a later mark's halo cannot cut an earlier one; per-mark halo-then-red pairs look different.
- **The gesture math is not in `annotations.ts`.** `TAP_SLOP = 12`, `TAP_RADIUS = 0.09` of the short edge (normalized per axis so it renders circular), the `1.15` ring inflation, head-at-touch-down arrows: all in `mark-editor.tsx`. Extract them into the shared module in M4 so Dart ports one source of truth. Both the api-first design and its critique missed this in opposite directions.

**Proving parity, three layers.** (1) `e2e/fixtures/marks.json`: `(mark, w, h)` inputs plus expected sampled points, asserted by `src/lib/annotations.test.ts` and by a Dart test. (2) Flutter goldens at three box aspect ratios, which only prove Flutter agrees with itself. (3) The one that actually protects the product, and it stays a blocking manual step per release: shoot a **portrait** photo in Flutter, ring a specific feature, let it upload, open `/reports/<token>` in a desktop browser, confirm the ring is on the same feature.

**EXIF is the failure mode all three designs half-missed.** Today the browser applies EXIF before `naturalWidth/naturalHeight` are read (`room-capture-screen.tsx:61-65`), so stored `w`/`h` are upright. But `downscale()` returns `null` when the photo is already under 2048px or fails to decode, and the **original file with EXIF intact** is then uploaded. So there are two distinct hazards: Flutter's own photos (fixed by `autoCorrectionAngle` at compress time, then assert the decoded dimensions equal the `w`/`h` being sent), and the entire PWA back-catalogue from 09-13 onwards (fixed only by applying EXIF **on read** in Dart). Put an `Orientation=6` JPEG in the fixture set. Every other check in this section passes while a portrait mark is 90 degrees off.

**The test-coverage cliff.** `e2e/check-in.spec.ts` drives the whole product through the web capture screen: `input[type=file][accept="image/*"]` at line 31, the `Photo 1` tile, `Done with Kitchen` at line 69. Everything downstream (extraction, review, `editedByHuman`, both signatures, the share link with no session, revoke, second agent 404) has no other entry point, and lines 83 to 87 are the only automated mark-alignment assertion in the repo. So the web capture route is not just a rollback path, it is the test harness. Deleting it (which the strangler design schedules) removes the definition of done for the whole check-in. Either it survives until a Flutter `integration_test` harness can seed captures for the web suite, or M10 costs an extra week building that harness. Decide this before writing Dart, not after; `AGENTS.md` currently defines done as `pnpm test:e2e` and needs `flutter test` plus `integration_test` added.

## What stays on the web, forever

- `/reports/[token]`, unchanged: server-rendered, `noindex`, signed URLs minted per render, 404 on unknown or revoked, `MarkOverlay` in the HTML so it survives JS off and a print. Flutter opens it with `url_launcher` in the **system browser**, never an in-app WebView, because a WebView puts a bearer credential for a document naming both parties and their unit into the inspector app's cookie jar and screenshot cache. Never add `printing` + `pdf` on the Flutter side: two renderers of the same legal document is how the app and the report end up disagreeing about what was signed.
- `/` (landing), `/login`, `/api/auth/send-email`. The send-email hook is client agnostic, so Flutter inherits correct six-digit behaviour with zero server change and the mailpit path for `pnpm test:e2e` is untouched.
- The entire server: Prisma, `auth.ts`, `actions.ts`, `src/lib/inspection/*`, storage with the service role. The half of this system that carries legal weight never moves.
- The PWA inspector, until M10. Rollback is a URL: an agent whose Flutter build breaks mid-walkthrough opens the site on the same phone, signs in with the same code, and finishes against the same rows.

## First commit

Today, about four hours, nothing under `src/`:

1. `flutter upgrade` to 3.47 stable (you are on 3.44.0). Read `/Users/liguro/projects/contraction-timer/mobile` first for whatever toolchain shape is already settled there.
2. `flutter create --org one.kivilo --platforms android,ios mobile` inside this repo. In-repo, not a separate one, so the endpoint list, `e2e/fixtures/marks.json` and `AGENTS.md` stay adjacent to the code they constrain. Add `mobile/build/`, `mobile/.dart_tool/`, `mobile/ios/Pods/` to `.gitignore`.
3. `pubspec.yaml`: `supabase_flutter: ^2.17.2`, `camera: ^0.12.0+2`, `path_provider: ^2.1.6`, `flutter_secure_storage`, `background_downloader: ^9.5.8`, `drift`, `dio`.
4. `mobile/lib/spike/otp_screen.dart`: `signInWithOtp(email: ...)` with **no** `emailRedirectTo`, then `verifyOtp(type: OtpType.email)`, against the live project. Match `shouldCreateUser: true` from `login-form.tsx:26` exactly. Wire the `onAuthStateChange` `onError` handler on day one so it is never absent. Confirm no iOS URL scheme and no Android intent filter are needed.
5. `mobile/lib/spike/burst_screen.dart`: `CameraController` preview, a shutter that stays on screen, 30 `takePicture()` calls, each renamed into `getApplicationSupportDirectory()`, logging per-shot latency. Add `NSCameraUsageDescription` and `NSMicrophoneUsageDescription`, and `CAMERA` / `RECORD_AUDIO`.
6. `mobile/lib/spike/put_screen.dart`: paste a signed upload URL minted by `pnpm exec tsx` and do the `background_downloader` binary PUT. This is the unknown that decides M3's shape.
7. Docs only, safe before go-live: a dated note at the top of `plans/capture-ux-diagnosis.md` recording that its "Decision taken on the day: stay on the PWA" was revisited on 2026-08-28, and why (continuous shutter and background upload, not the three complaints that document diagnosed). Otherwise it reads as authoritative to the next session and to you in three weeks.

The first code that lands under `src/` is M1's route layer, on 2026-09-15, not a line of Dart.

## What I would not do

- **Give Flutter direct Supabase data access via RLS and PostgREST** (the whole supabase-native spine). The ownership graph you authorize against lives in Prisma-modelled tables; re-expressing it as policies creates a second boundary that must be kept in sync with `auth.ts` forever, which is what the third invariant exists to forbid. Prisma also connects as an owner with `rolbypassrls`, so the two halves would enforce different rules. It requires `GRANT USAGE ON SCHEMA public TO authenticated`, which removes the only thing currently standing between the internet and every table, plus ten tables of hand-written column grants, plus `Stakeholder` policies over a table holding NRIC/FIN, plus an oracle for nine tables' reachability that today lives in scattered inline checks. That is a rewrite of the security boundary, not a client port.
- **Delete `requestUploadUrl` and let the device upload with its own JWT.** Same reason, plus a bucket UPDATE policy (which the SDK's upsert path pushes you toward) lets a client replace the pixels under a mark both parties already signed.
- **Call server actions from Dart.** The `Next-Action` id is a build-time hash that changes across deploys and the response is an RSC flight stream with no stability contract. Settled.
- **A webview shell for the desk screens** (the strangler spine). Passing the Dart client's refresh token to a cookie-minting endpoint makes the server rotate it, so "re-mint on every webview open" repeatedly invalidates a token the native client still holds, and the symptom is being signed out on the *capture* screen after visiting review, which is the screen holding queued bytes. It is also a guideline 4.2 rejection risk. During the gap before M5 to M7 land, an agent uses the phone browser for review and new-inspection and signs in there once. That is honest friction, not an architecture.
- **`image_picker` as the first step.** It reproduces today's behaviour including its worst bug: its own docs say Android may terminate the app during selection and you must call `retrieveLostData()` at startup. It ports the problem instead of fixing it.
- **`camerawesome`** (14 months stale, hands you a UI you then fight), **`hive`** (stable is four years old), **`isar`** (stable is three years old, `4.0.0-dev.14` never landed). Use the official `camera` and `drift`.
- **`workmanager` as the upload transport.** Its own page says tasks do not run after quit and iOS gives no timing guarantee. At most a belt-and-braces wake-up calling `FileDownloader().start()`.
- **Compositing marks onto the JPEG before upload.** It breaks the scribe-not-witness invariant, degrades the evidence, and feeds a red ring to Gemini, which then either lists it as an item or covers the serial the prompt demands be transcribed.
- **Retrofit or OpenAPI codegen.** Next route handlers emit no OpenAPI document, so you would hand-write a spec in order to generate a client from it. `freezed` + `json_serializable` for the models is the codegen that pays.
- **Supabase Edge Functions for extraction.** 150s wall clock against a 10-minute walkthrough, and a Deno port would throw away 600 working lines of Node, Prisma and AI SDK for no product gain.
- **The Apple Developer Enterprise Program.** It is for your own employees; a letting agency's agents are not, and Apple enforces it. It is the most common wrong answer to "how do I ship without review".

## Open questions for Yuxi

1. **Which legal entity holds the store accounts, and does any agent outside your own devices need iOS?** If it is an organisation, **start the D-U-N-S lookup today**: it is a week or more of pure waiting with nothing to parallelise, and it is the only thing here that cannot be compressed by working harder. If the pilot agents can hold App Store Connect roles, TestFlight internal skips Apple review entirely and the public listing (and therefore the account-deletion work) leaves the critical path.
2. **Between late October and December, is it acceptable for an agent to capture natively and then finish the inspection in the phone browser** (one extra sign-in, same six-digit code)? If yes, capture ships alone in October and the rest lands incrementally. If the app must cover the whole flow before any agent touches it, the first usable build is December and there is no early feedback on the shutter.
3. **Does the PWA inspector stay as the rollback path and test harness through Q1 2027?** Keeping it means every inspector bug is fixed twice and every new inspector feature costs two implementations, so from the day M2 starts the PWA inspector must be bug-fix-only. Deleting it earlier means budgeting a week for a Flutter harness that can seed captures for `e2e/check-in.spec.ts`, because that suite is currently the only end-to-end definition of done in the repo.