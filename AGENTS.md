# kivilo: M4 check-in / check-out

Installable PWA for property condition reports. The inspector walks a unit room by room,
narrating a video and photographing labels, and writes each room's inventory against that
evidence. At end of tenancy the agent records each change between the signed check-in and
check-out, with a damage-versus-fair-wear verdict, and publishes it as a dated assessment.

There is no AI in the product. Gemini drafting of room inventories and of the check-out
comparison was removed on 2026-10-12: agents need accuracy and are used to writing the
inventory themselves. The AI-era columns (`InspectionItem.confidence`, `Capture.transcript`,
`Room.processing*`, `Inspection.summary`/`aiConsentAt`, `Finding.confidence`) and the
`PROCESSING`/`FAILED` room statuses are left in the schema unused, pending a cleanup
migration; rows written by the old pipeline still carry them.

Product context: `plans/product-spec.md`. Build plan for this module: `plans/m4-check-in-out.md`.

The product is **Kivilo**. The directory, this repo's Supabase `project_id`, and the
`otter-context` notes file are all still called `mobility`, which was the working name.
That is deliberate: `project_id` names the local Docker containers, so changing it spins
up a fresh stack and orphans the current database and storage. Rename all three together
when someone is ready to re-migrate and re-seed.

## Core principles

1. **Simplicity first.** No premature abstractions, no helpers wrapping a single call site.
2. **Root causes only.** No `try/catch` that swallows errors, no `?? []` patches on symptoms.
3. **Minimal impact.** Touch only what the task requires.

## Four invariants

**A person writes every line.** The timestamped video is the evidence, and the inventory
is the inspector's reading of it. A new room starts with the standard rows in
`src/lib/room-templates.ts`, made as `addItem` makes a line, which the inspector edits or
removes like any other; a check-out starts from the signed check-in's room and item state,
which the inspector edits to record what they find on the new visit. A room
reaches `REVIEWED` only through `markRoomReviewed`, which needs at least one item or the
inspector's explicit confirmation that there is nothing to record (`{ nothingToRecord:
true }`, which the report then states), and stamps `Capture.processedAt` on every capture
the room was reviewed with. That stamp is what the shared report filters photos on, so a
capture that lands after Send never joins what was agreed, and `completeReview` refuses
while any capture is unstamped.

**A capture is never lost.** Media is written to IndexedDB (`src/lib/offline-queue.ts`)
the instant it is taken and only leaves the queue once storage confirms it; a failed
upload increments `attempts` and is retried, never discarded. Inspectors work where the
signal is worst, and losing a walkthrough is the failure that loses you the agent.

**Authorization lives in the data layer, not the proxy.** `src/proxy.ts` refreshes the
session and redirects signed-out visitors, and Next's own docs say proxy must not be
used as an authorization solution. The boundary is `src/lib/auth.ts`: every server
action calls `requireAgent()` then `authorizeInspection` / `authorizeRoom`, and every
page query is filtered by `inspectionScope`. Server actions are public HTTP endpoints
and every id they take is attacker-controlled, so none of them may trust one. A refusal
returns the same error as a missing row, so the API cannot be used to enumerate ids.
Agents on one `Team` (set with `pnpm team:set`) work each other's deals as the deal's
agent would; that rule lives only in `actsAsAgent`, so no other file decides who an
agent is. Landlords and tenants read a report through `authorizeReport`, never through
the agent rules.

**Rooms are independent.** Finishing, reviewing and re-shooting are all scoped to one
room, so re-shooting the kitchen cannot touch a bedroom someone already reviewed. A new
capture sends only its own room back to `REVIEW`. Anything that deletes or resets across
an inspection rather than a room is a bug.

## Stack

- Next.js 16 App Router (Turbopack), React 19, TypeScript 5.9, Tailwind v4
- Postgres via local Supabase, Prisma 7 with the `@prisma/adapter-pg` driver adapter
- Supabase Storage for captures: **private bucket, signed URLs only**
- PWA: `src/app/manifest.ts`, `public/sw.js` (network-first pages, cache-first build
  assets), IndexedDB upload queue read through `useSyncExternalStore`
- Vitest for unit tests

## Local setup

```bash
supabase start          # ports remapped to 563xx (543xx/553xx are other projects)
pnpm setup:storage      # creates the private `captures` bucket (idempotent)
pnpm db:migrate
pnpm db:seed
pnpm dev
```

## Verification, run before claiming done

- `pnpm typecheck`: `prisma generate && next typegen && tsc --noEmit`. The typegen step
  is required: `PageProps` / `LayoutProps` are generated, so a bare `tsc` fails.
- `pnpm lint`: ESLint, zero warnings tolerated
- `pnpm build`: production build
- `pnpm test`: Vitest, hermetic and fast
- `pnpm test:integration`: Vitest against the local Postgres. Needs `supabase start`.
  Kept separate so a stopped stack does not look like a broken build.
- `pnpm test:e2e`: Playwright, the whole check-in on a phone viewport: sign in with the
  emailed code (read back from mailpit), create the deal, capture, write the inventory,
  review, send for signature, both signatures, share link with no session, revoke, and
  a second agent getting 404. Needs `supabase start`; starts its own dev server on port
  3111. Everything in the run is the real path. First run: `pnpm exec playwright
  install chromium`.

## Auth

Supabase Auth, emailed six digit code rather than a magic link: a link opens the phone's
default browser, so an installed PWA would send the agent to Safari with no session in
the app. On first sign-in an agent claims an existing Stakeholder with the same verified
address, or gets a new one, so someone already named on a deal keeps their tenancies
instead of becoming a duplicate. That only works if there is one row to claim, so
`Stakeholder.email` is unique and stored lowercase, and `createInspection` reuses the
person on file rather than creating another (pinned by `deal-parties.integration.test.ts`).

Locally the code arrives in mailpit on port 56324; the message body is readable through
its API at `/api/v1/messages`.

**Who sends that email depends on the environment.** Supabase's built-in mailer is capped
at two messages an hour project wide, which is unusable for a demo, so in production a
Send Email Hook POSTs the code to `src/app/api/auth/send-email/route.ts` and we deliver it
through Resend, with the wording in `src/lib/email.ts`. Supabase still mints the code,
sets its expiry, validates it on `verifyOtp`, and rate limits it, so the hook is a mail
transport and not an authorization boundary; `signInWithOtp` in the login form is
unchanged. The hook is deliberately left **off locally**, so the built-in mailer keeps
delivering to mailpit and `pnpm test:e2e` reads the code back exactly as before. That is
also why there is no environment branch in the sending code.

The hook request carries no session, so `SEND_EMAIL_HOOK_SECRET` is the only thing
separating Supabase from anyone who finds the URL. Verify it before reading the payload,
and keep `src/proxy.ts` off `/api/**`: a webhook has no cookie and would be redirected to
`/login`.

## Layout split

`src/app/(app)/` is everything an inspector sees and carries the header, the upload
queue, and the service worker. `src/app/reports/[token]/` sits outside that group so a
shared report renders as a clean document. A landlord following a link is not a user of
this app and should never meet an install prompt. The root layout is deliberately bare
for the same reason.

Server actions live in `src/lib/actions.ts` rather than a route folder, since components
across several routes import them.

`/` is the public landing page, static and outside `(app)`; the inspector's list is at
`/inspections`. `/login` and `/offline` also sit outside `(app)` and are static. `/offline` in particular must
render identically with or without a session, because it is what the service worker
caches at install and serves when a navigation fails.

## Sharing a report

`shareToken` on Inspection is an unguessable bearer credential (32 random bytes,
base64url) and the only thing guarding a document naming both parties and their unit.
The report page is `noindex`, and an unknown or revoked token 404s exactly like a report
that never existed. Signed storage URLs are minted per render, so links keep working
without any object becoming public.

## Why photos as well as video

A phone video is compressed hard enough that a serial plate or meter dial is unreadable
in a frame of it. Identifiers come from deliberate stills instead, which is why
`Capture.kind` exists and why the capture screens lead with photos.

## Two clients, one boundary

The inspector exists twice: the PWA under `src/app/(app)`, and a Flutter app in
`mobile/`. They share a backend, and more importantly they share the *authorization*
boundary, because a second one would have to be kept correct forever.

`currentAgent()` in `src/lib/auth.ts` is where that happens. A browser sends a session
cookie; the app sends its Supabase access token in an `Authorization` header. Both are
verified against the auth server (`getUser(jwt)` is a real `GET /user`, not a local
decode) and both resolve to the same `Stakeholder`, so **every server action works
unchanged from either transport** and nothing below that line knows which client it is
serving. It is memoized with React `cache()` per request, because a render resolves the
agent in the layout and again in the page.

A header cannot be used to escalate: holding a valid token for a user is what being that
user means. `src/lib/api/route.ts` is transport only, holds no authorization logic, and
returns the same 404 body for a refusal and a missing row so the API cannot enumerate ids.
The endpoints under `src/app/api/v1/` are thin delegations to the same functions the PWA
calls. `e2e/api.spec.ts` drives them with no browser and no cookie at all.

Keep `src/proxy.ts` off `/api/**`, which it already is: a request with a bearer and no
cookie would otherwise be redirected to `/login`.

## A signed report stops moving

Sending for signature is the moment the report stops being a working document and becomes
the thing two people are agreeing to. `/reports/[token]` renders rooms, items and photo
captures at `AWAITING_SIGNATURE` and `COMPLETED`, so every action that changes what it
says calls `assertOpen` and refuses from that point: rooms, items, captions, marks,
deletes, and `finishRoomCapture` and `markRoomReviewed`, which move a room's status. The capture page's status filter is a convenience, not the control; a server
action is a public HTTP endpoint and the guard has to be in the action.

New bytes are the one exception, via `assertNotCountersigned`. A capture taken before the
agent tapped Send may still be draining out of the phone's queue, and refusing it would
strand it there forever, which is exactly what the capture invariant forbids. So
`requestUploadUrl` and `registerCapture` are allowed until countersignature and refused
after it. Signing, findings and sharing are deliberately not guarded, since they are what
happens *after* the freeze. Pinned by `src/lib/signature-freeze.integration.test.ts`.

## Marking up a photo

The inspector can circle a chip or point an arrow at a crack, on the phone, in the
capture Viewer. **The marks are data beside the photograph, never painted into it.** The
capture is the evidence, and a report whose photographs have been rewritten is worth less
than one whose photographs have not; the report footer says so, because that is what makes
the mark admissible rather than suspicious.

Geometry is normalized 0..1 against the image's upright intrinsic box, stored with that
box's size on `Capture.annotations` (`src/lib/annotations.ts`). Everything renders it
through `MarkOverlay`: an `<svg viewBox="0 0 w h" preserveAspectRatio="xMidYMid meet">`
occupying the same CSS box as the `<img>`. `xMidYMid meet` **is** `object-fit: contain`
with centred position, so the browser does the identical letterbox arithmetic for the
picture and for the marks and they cannot drift apart. Two rules follow: the `<img>` under
an overlay must be `object-contain` or unconstrained, never `object-cover`, and the
positioned box must wrap the image alone, never the image plus its caption, and never a
box that can grow past it. Two ways it grows: a flex or grid item stretches to its row
(the evidence strip needs `self-start`), and `max-h-full max-w-full` does not scale an
image up, so a picture smaller than its container leaves the element shrunk while the
overlay still spans the box. Both were measured at over 100px of drift before they were
fixed, and both are guarded by the alignment assertions in `e2e/check-in.spec.ts`.

Drawing reads pointer positions through `svg.getScreenCTM().inverse()`, not
`getBoundingClientRect()` as `signature-pad.tsx` does. The rect is the element's box, but
the picture inside it is letterboxed, so the rect puts every mark in the wrong place on any
photo whose aspect does not match its container.

Marks stop once the inspection is `AWAITING_SIGNATURE`: a red ring is a stronger claim
than a caption, and the report is the artefact both parties are signing.

## Error tracking

Errors go to our own `ErrorEvent` table, not a third-party tool (`plans/telemetry.md`).
The server records what it throws through `onRequestError` in `src/instrumentation.ts`,
plus `authed`'s own 500s, which Next never sees. An agent's browser posts the rest to
`/api/v1/errors` from `src/lib/error-reporter.ts`, holding them in `localStorage` until
the server confirms. The browser skips anything with a `digest`, because the server already
recorded it under that digest, and the digest is the "Reference" an agent sees on screen.
The app does the same from `mobile/lib/services/error_reporter.dart`, with its bearer and a
file in place of `localStorage`: Flutter's and the platform's uncaught errors, and whatever
`plainError` turns into "Something went wrong". It never reports an `ApiFailure`, a
`DioException` or a lost connection, because the server records its own failures and no
signal is not a bug. Signed storage URLs quote their token as a JWT, so `redactSecrets`
cuts JWTs from every message and stack before they are stored or mailed.
Every 15 minutes `/api/internal/errors` emails `ERROR_ALERT_TO` once per new fingerprint,
then deletes anything over 90 days, as the privacy page promises. Never store a
`/reports/[token]` path unredacted: `redactPath` is the guard.

## Dev scripts

Image generation goes through Based AI (`src/lib/based-ai.ts`, OpenAI-compatible
`ai.based.one/v1`, needs `BASED_AI_API_KEY`). Nothing in the product calls it yet; try it with:

```bash
pnpm exec tsx scripts/dev-generate-image.ts "a tidy studio flat, wide angle" out.png
```

`scripts/dev-seed-report.ts <manifest.json>` seeds a countersigned check-in on the local
stack from a folder of photos (shape in the file), for working on the report and its PDF
against something the size of a real one. It refuses any non-local database.

## The report PDF

The bar is a real agency report (`plans/report-pdf.md`): photos three across, a header
and "Page X of Y" on every page, the room heading on every page, red defect captions. The
web page cannot meet it when printed, so the PDF is its own A4 document drawn with
`@react-pdf/renderer` (`src/lib/report-pdf/`): `model.ts` turns the database rows into
plain data, `document.tsx` draws it, `render.tsx` fetches the photos and stores the file.
It shares the evidence rules with the page, not the markup: only `COMPLETED` reports, only
photos stamped `processedAt`, marks drawn as vectors over an untouched photograph with the
same `markPath`, and no URL anywhere in the document, since the URL is the credential.

Photos are downloaded and shrunk with `sharp`, `.rotate()` first so EXIF orientation is
applied before the marks, which are stored against the upright picture, are drawn. The
file is far past the 4.5 MB a function may return, so it is written to
`reports/<inspectionId>/<hash>.pdf` and handed out as a 10-minute signed URL. The hash
covers everything drawn plus `RENDER_VERSION`, so a stored copy is correct by
construction; **bump `RENDER_VERSION` whenever the layout changes**, or every report
keeps serving its old drawing. Revoking a share link deletes the prefix.

Two ways in: `GET /reports/[token]/pdf` for anyone holding the link, and `POST
/api/v1/inspections/[id]/pdf` for the agent, which needs no link to exist (the web
inspection page and the app both use it). The header is the tenancy agent's
`AgentBranding` (agency name, licence, CEA number, phone, logo); with none set the report
reads as Kivilo's. Logos are stored as PNG whatever arrives, since the PDF draws only PNG
and JPEG, and the agent can set the name printed beside them.

## Plans and billing

A plan belongs to a workspace: the agent's team, or the agent alone (`plans/billing.md`).
Free holds 1 active property; Pro is per seat with 25 each, pooled. **`src/lib/plan.ts`
is the only place a limit is decided**, and `createInspection`, the only place a property
is made, calls its guard; the API answers 403 `plan_limit`. An active property is one
whose tenancy runs and whose check-out is not signed, counted through `agentTenancies` so
there is still one rule for who an agent is. Nothing is locked over the limit. The app
shows the plan and never a price or a way to buy, because store rules forbid steering to
an outside purchase. Comps go through `pnpm plan:set`. Stripe checkout is not wired yet.

## Lessons

- Prisma 7 dropped `url` from the `datasource` block. The connection string lives in
  `prisma.config.ts`, and `PrismaClient` needs an explicit `PrismaPg` adapter. `@prisma/client-runtime-utils`
  is a peer the generated client imports. It is not installed transitively, and the
  build fails with 21 module-not-found errors until you add it.
- Lint the generated client out (`src/generated/**` in `eslint.config.mjs`) or ESLint
  reports ~400 errors in code nobody wrote.
- Restart `next dev` after a migration. The running server holds the previously
  generated Prisma client, so a new field fails with "Unknown field … for include
  statement" even though `prisma generate` has run.
- Prisma 7 rejects a nested `select` inside an `include` (`rooms: { include: { items:
  { select: … } } }`). Use `_count`, or include the relation whole.
- `prisma migrate reset` has no `--skip-seed` flag in Prisma 7. Passing it silently
  prints help instead of running. It also refuses to run for an agent without
  `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION`; ask the user rather than routing around it.
- Vitest 4 fails a test when a module mock is left with a persistently throwing
  `mockImplementation`, even if the code under test catches it. Use
  `mockImplementationOnce` to scope the throw to the call it is meant for.
- `prisma migrate dev` aborts non-interactively whenever it has a warning to confirm,
  such as adding a unique index. Hand-write the migration SQL and `prisma migrate deploy`.
- Turbopack caches Tailwind's generated CSS in `.next` in a way that survives a dev
  server restart. If a class you just wrote has no effect, `rm -rf .next` before
  debugging the config; check a production build first, which regenerates from scratch.
- Next sets its own `Cache-Control` on dynamic routes and it overrides both
  `next.config.ts` headers and anything the proxy sets.
- Supabase's session pooler (port 5432) caps the whole project at 15 clients, and a
  Fluid Compute instance holds its own pg pool, so a couple of warm instances take every
  slot and pages start failing with a digest and no stack. Runtime belongs on the
  transaction pooler (6543). It shows up on the heaviest page first, because Prisma
  issues a query per relation: `/inspections` fires 4, `/inspections/[id]` fires 16.
- Vercel's default function region is `iad1` (Virginia) and the database is in
  Singapore, so without `vercel.json` pinning `regions` to `sin1` every server action
  and every dynamic render crosses the Pacific twice; `/inspections/[id]` at 16 queries
  a render cost 3 to 4 s of pure latency. Check with the `x-vercel-id` response header
  on a dynamic route: it reads `edge::function`, and the function half must be `sin1`.
- A server action that calls `revalidatePath` returns the current page's fresh RSC
  payload in its own response, whatever path it revalidated. That is why the review
  editor and the capture grid update without a `router.refresh()`; add one only for
  changes that never went through an action, such as a queue write on the phone.
- A nullable Prisma `Json?` column needs `Prisma.DbNull` to write SQL NULL. Plain `null`
  is a type error, and `Prisma.JsonNull` writes a JSON null that reads back as a row of
  the wrong shape. `Prisma` has to be a value import, not a type-only one.
- EXIF orientation is applied by both Chromium and WebKit everywhere it could matter:
  `<img>` layout, `naturalWidth`/`naturalHeight`, `drawImage`, and `createImageBitmap`
  in either `imageOrientation` mode. So a canvas re-encode outputs an upright, tagless
  image and no rotation compensation belongs anywhere in this codebase. Verified with a
  probe, not assumed. The gap: `downscale()` returns null for a photo already under
  2048px, so that one goes up with its EXIF intact. Harmless while every consumer is a
  browser; it must lose that early return before anything ever flattens server side.
- Video never goes through a server action or route handler. The browser uploads
  straight to Supabase Storage with a signed URL. A 10-minute walkthrough is far past
  the serverless body cap.
- Released app builds read `/api/v1` responses with required casts (`as int`, `as bool`),
  so removing a response field crashes every installed build that reads it, including
  the ones sitting in store review. Removing AI dropped `newSinceDraft` and an item's
  `editedByHuman` and broke builds 12 to 19 until they were restored. Before removing or
  renaming any response field or route, check the model in the oldest build still on a
  track (`git show <source>:mobile/lib/models/...`, sources are in `mobile/RELEASE.md`)
  and keep a constant in its place until that build is retired.
- The Vercel git integration can stop deploying silently: after `4fb1b31` errored with
  no build log, later pushes to `main` produced no deployment at all. After pushing,
  confirm with `vercel ls` and, if nothing appeared, deploy from a clean `git worktree`
  of the commit with `vercel deploy --prod` (a plain deploy from the repo would upload
  the untracked `.claude/` worktrees).
- The `captures` bucket enforces an allowed MIME list, and `pnpm setup:storage` used to
  return early on an existing bucket, so types added later never reached it: WebP and
  PDF maintenance evidence the app offered were refused by storage with a 415. The script
  now updates an existing bucket. Adding a stored file type means adding it there and
  running it once per environment, production included.
- `@react-pdf/renderer` 4.9 has two silent failure modes, both pinned by
  `src/lib/report-pdf/document.test.tsx`. A `lineHeight` on a page style stops every
  `render` text (page numbers, "continued") and every bottom-anchored fixed element from
  drawing at all. And a component returning a fragment of fixed elements draws only the
  first, which is why the running header and footer are separate components.
- `@react-pdf/hyphenate` ships an ESM-only entry, so anything loading the renderer as
  CommonJS (a plain `tsx` script, Playwright's spec loader) fails with
  `ERR_PACKAGE_PATH_NOT_EXPORTED`. Next and Vitest load it as ESM and are fine; probe the
  document through a Vitest test, not a script.
- Supabase Storage encodes a signed URL's `download` file name twice in
  `Content-Disposition`, so a `#` or `,` reaches the reader's disk as `%23` or `%2C`.
  Report file names are letters, digits, spaces, dots and hyphens only.
- The first PDF drawn in production failed with `Cannot find module .../pdfkit/js/standard-fonts/Helvetica.cjs`.
  pdfkit loads its built-in fonts through its package's `#standard-fonts/*` import alias,
  which Vercel's file tracing cannot follow, and nothing local catches it because local
  runs read `node_modules` directly. Both PDF routes now list the fonts in
  `outputFileTracingIncludes`, as `standard-fonts/**` because every font requires a
  shared chunk in a subfolder (the first fix missed it and failed the same way); a new
  route that draws a PDF needs the same entry. Included files are not traced in turn,
  so to prove a fix, copy only the files in the route's
  `.next/server/app/<route>/route.js.nft.json` to a temp tree and render from there.
- A Shorebird patch compiles the working tree as it is at that moment, not a commit.
  Editing files during a patch build, or another session merging into the shared
  checkout, ships that code to phones. Build patches from a `git worktree` pinned to the
  commit; `mobile/RELEASE.md` has the commands.
- `prisma format` and `dart format` rewrite the whole file, so running either on a file
  with a small edit buries it in hundreds of lines of realignment nobody asked for. Format
  only the lines you wrote, or check `git diff --stat` and redo the edit on a clean copy.
