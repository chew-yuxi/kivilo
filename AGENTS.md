# mobility — M4 check-in / check-out

Next.js 16 app for AI-drafted property condition reports. A narrated walkthrough video
becomes a room-by-room inventory; at end of tenancy the check-out is diffed against the
check-in and the damage-versus-fair-wear assessment is drafted for an agent to review.

Product context: `plans/product-spec.md`. Build plan for this module: `plans/m4-check-in-out.md`.

## Core principles

1. **Simplicity first.** No premature abstractions, no helpers wrapping a single call site.
2. **Root causes only.** No `try/catch` that swallows errors, no `?? []` patches on symptoms.
3. **Minimal impact.** Touch only what the task requires.

## The invariant

**AI is the scribe, not the witness.** The timestamped video is the evidence. Every
model-authored row carries a `confidence`, and `editedByHuman` flips the moment a person
touches it. Nothing reaches a signature until a human has passed through review. Do not
add a path that writes model output straight to a signed report.

## Stack

- Next.js 16 App Router (Turbopack), React 19, TypeScript 5.9, Tailwind v4
- Postgres via local Supabase, Prisma 7 with the `@prisma/adapter-pg` driver adapter
- Supabase Storage for captures — **private bucket, signed URLs only**
- Gemini (`@ai-sdk/google`) reads the video and its audio in one pass; Claude
  (`@ai-sdk/anthropic`, `claude-opus-5`) does the check-out diff
- Vitest for unit tests

## Local setup

```bash
supabase start          # ports remapped to 563xx — 543xx/553xx are other projects
pnpm setup:storage      # creates the private `captures` bucket (idempotent)
pnpm db:migrate
pnpm db:seed
pnpm dev
```

`.env` needs `GOOGLE_GENERATIVE_AI_API_KEY` (extraction) and `ANTHROPIC_API_KEY` (diff).

## Verification — run before claiming done

- `pnpm typecheck` — `prisma generate && next typegen && tsc --noEmit`. The typegen step
  is required: `PageProps` / `LayoutProps` are generated, so a bare `tsc` fails.
- `pnpm lint` — ESLint, zero warnings tolerated
- `pnpm build` — production build
- `pnpm test` — Vitest

## Dev scripts

The capture flow expects a phone. To exercise the pipeline without one:

- `pnpm exec tsx scripts/try-extract.ts <video>` — extraction only, prints JSON, no DB
- `pnpm exec tsx scripts/dev-run-pipeline.ts <video>` — check-in through to REVIEW
- `pnpm exec tsx scripts/dev-run-checkout.ts <video>` — check-out plus the baseline diff

## Lessons

- Prisma 7 dropped `url` from the `datasource` block. The connection string lives in
  `prisma.config.ts`, and `PrismaClient` needs an explicit `PrismaPg` adapter. `@prisma/client-runtime-utils`
  is a peer the generated client imports — it is not installed transitively, and the
  build fails with 21 module-not-found errors until you add it.
- Lint the generated client out (`src/generated/**` in `eslint.config.mjs`) or ESLint
  reports ~400 errors in code nobody wrote.
- Video never goes through a server action or route handler — the browser uploads
  straight to Supabase Storage with a signed URL. A 10-minute walkthrough is far past
  the serverless body cap.
