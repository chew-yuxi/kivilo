# Deploying Kivilo

M4 (check-in / check-out) only. There is no billing, no team accounts, and no admin
surface yet; anyone who can sign in becomes an agent and sees the deals they are on.

## What you need

- A Supabase project, in the Singapore region. The captures are video of people's homes
  and the stakeholder records carry NRIC and FIN numbers, so data residency is a real
  decision rather than a default.
- A Vercel project (or any Node host) for the app.
- A Google Generative AI key for extraction and an Anthropic key for the check-out diff.

## First deploy

1. **Database.** Point `DATABASE_URL` at the Supabase Postgres and run
   `pnpm exec prisma migrate deploy`. Do not run `migrate dev` against a deployed
   database; it is interactive and can reset.
2. **Storage.** `pnpm setup:storage` creates the private `captures` bucket. It is
   idempotent, so it is safe to re-run. Confirm in the Supabase dashboard that the
   bucket is **not** public: every read goes through a signed URL minted server side.
3. **Auth.** In Supabase Auth settings, set the site URL to the deployed origin and add
   it to the redirect allow list. Sign-in is an emailed six digit code, so in Auth →
   Email Templates change **Magic Link** to show `{{ .Token }}` (the default body is a
   `{{ .ConfirmationURL }}` link, which the app cannot use), and configure a real SMTP
   sender; the default Supabase mailer is rate limited and not for production.
4. **Environment.** Set every variable in `.env.example`. `SUPABASE_SERVICE_ROLE_KEY`
   is server only and must not be exposed to the browser. Never set
   `KIVILO_FAKE_EXTRACTION`; it is the e2e suite's stand-in for Gemini and the app
   refuses it on Vercel anyway.
5. **Deploy**, then sign in once and confirm you land on an empty inspection list rather
   than someone else's.

## Where it is (2026-08-18)

- Live at https://kivilo-one.vercel.app (Vercel project `chewyuxis-projects/kivilo`,
  auto-deploys from `main` on github.com/chew-yuxi/kivilo).
- **No Supabase project right now.** `dksfpjcmfrqztqgnwgbm` (Singapore) was deleted on
  2026-08-19 to recreate Kivilo under an account that will carry Pro. The Vercel env
  still points at it, so the deploy is down until steps 1 to 4 are redone against the
  new project. When redoing step 3, also set the **Magic Link email template** to
  contain `{{ .Token }}`; the dashboard default is a confirmation link, which is what
  the first smoke test received instead of a code.
- Production env: everything in `.env.example` except `ANTHROPIC_API_KEY`, which is not
  set anywhere yet. Values live in the untracked `.env.deploy` locally; the database
  password is in `~/.kivilo-db-password`.

Still open, and each one bites before the first real inspection:

- **Upload cap.** The Supabase free plan caps every upload at 50 MB, project wide, so the
  bucket could not be created with the 2 GB per-file limit `scripts/setup-storage.ts`
  asks for and inherits the 50 MB cap. A phone walkthrough is far past that. Upgrade the
  project to Pro and raise the global file size limit, then re-run `pnpm setup:storage`
  after deleting the bucket, or set the bucket limit in the dashboard.
- **Auth email.** No custom SMTP yet, so codes go out through Supabase's default mailer,
  which is rate limited to a handful an hour and lands in spam. Fine for the first
  sign-in, not for agents.
- **`ANTHROPIC_API_KEY`** is unset, so the check-out diff cannot run.
- **Domain.** kivilo.io / kivilo.sg were free on 2026-08-14. Once bought, add it to
  Vercel and update the Supabase auth site URL and allow list.

## Before real agents use it

These are known gaps, not oversights. Decide each one deliberately.

- **Retention.** Nothing deletes captures. A walkthrough video of an occupied home is
  personal data under the PDPA and should have a stated retention period, most likely
  tied to the end of the tenancy plus a dispute window. This needs a policy decision and
  then a scheduled job.
- **The check-out diff has never run against a funded Anthropic key.** The request shape
  is verified and the prompt and persistence were exercised end to end using Gemini in
  its place, but the Claude call itself has only ever returned a billing error here.
  Run one real check-out before demoing that half.
- **Extraction failures are only visible in the app.** A room that fails parks as FAILED
  with the reason on the row, which an agent sees, but nothing pages anyone. Wire the
  `console.error` in `src/lib/actions.ts` to whatever you use for alerting.
- **No rate limiting on sign-in.** Supabase applies its own, but there is nothing
  application side.
- **Report links do not expire.** They are revocable by hand and unguessable, but a link
  shared once works forever until revoked. An expiry column is a small change if you
  want one.

## Rolling back

Migrations are additive so far, so redeploying an older build is safe. The one thing
that is not reversible is a `prisma migrate reset`, which drops everything; it exists
for local development and should never be run against a deployed database.
