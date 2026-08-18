# kivilo: M4 check-in / check-out

Installable PWA for AI-drafted property condition reports. The inspector walks a unit
room by room, narrating a video and photographing labels; each room's captures become a
draft inventory. At end of tenancy the check-out is diffed against the check-in and the
damage-versus-fair-wear assessment is drafted for an agent to review.

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

**AI is the scribe, not the witness.** The timestamped video is the evidence. Every
model-authored row carries a `confidence`, and `editedByHuman` flips the moment a person
touches it. Nothing reaches a signature until a human has passed through review. Do not
add a path that writes model output straight to a signed report.

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

**Rooms are independent.** Extraction is scoped to one room (`processRoom`), so
re-shooting the kitchen cannot touch a bedroom someone already reviewed. Anything that
deletes across an inspection rather than a room is a bug. The `deleteMany` in
`processRoom` is deliberately keyed on `roomId`, and there is a regression risk here
worth guarding whenever that function changes.

## Stack

- Next.js 16 App Router (Turbopack), React 19, TypeScript 5.9, Tailwind v4
- Postgres via local Supabase, Prisma 7 with the `@prisma/adapter-pg` driver adapter
- Supabase Storage for captures: **private bucket, signed URLs only**
- Gemini (`@ai-sdk/google`) reads each room's video, audio, and photos in one pass;
  Claude (`@ai-sdk/anthropic`, `claude-opus-5`) does the check-out diff
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

`.env` needs `GOOGLE_GENERATIVE_AI_API_KEY` (extraction) and `ANTHROPIC_API_KEY` (diff).

## Verification, run before claiming done

- `pnpm typecheck`: `prisma generate && next typegen && tsc --noEmit`. The typegen step
  is required: `PageProps` / `LayoutProps` are generated, so a bare `tsc` fails.
- `pnpm lint`: ESLint, zero warnings tolerated
- `pnpm build`: production build
- `pnpm test`: Vitest, hermetic and fast
- `pnpm test:integration`: Vitest against the local Postgres. Needs `supabase start`.
  Kept separate so a stopped stack does not look like a broken build.
- `pnpm test:e2e`: Playwright, the whole check-in on a phone viewport: sign in with the
  emailed code (read back from mailpit), create the deal, capture, extraction, review,
  send for signature, both signatures, share link with no session, revoke, and a
  second agent getting 404. Needs `supabase start`; starts its own dev server on port
  3111 with `KIVILO_FAKE_EXTRACTION=1`, which swaps Gemini for a canned inventory
  (`fakeExtraction` in `src/lib/inspection/extract.ts`) and is refused on Vercel.
  Everything else in the run is the real path. First run: `pnpm exec playwright
  install chromium`.

## Auth

Supabase Auth, emailed six digit code rather than a magic link: a link opens the phone's
default browser, so an installed PWA would send the agent to Safari with no session in
the app. On first sign-in an agent claims an existing Stakeholder with the same verified
address, or gets a new one, so someone already named on a deal keeps their tenancies
instead of becoming a duplicate.

Locally the code arrives in mailpit on port 56324; the message body is readable through
its API at `/api/v1/messages`.

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

Video sent to the model is downsampled hard, roughly a frame a second and resized, so a
serial plate or meter dial is unreadable in it. Identifiers come from deliberate stills
instead, which is why `Capture.kind` exists and why the extraction prompt tells the model
to read text only from photos. This is a capture-quality problem, not a model problem;
swapping in a dedicated OCR engine on the same video would fail the same way.

## Dev scripts

The capture flow expects a phone. To exercise one room's pipeline without one:

```bash
pnpm exec tsx scripts/dev-run-room.ts "Kitchen" walkthrough.mp4 label.jpg
```

Files ending `.jpg`/`.png` are registered as PHOTO captures, everything else as VIDEO.

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
- Video never goes through a server action or route handler. The browser uploads
  straight to Supabase Storage with a signed URL. A 10-minute walkthrough is far past
  the serverless body cap.
