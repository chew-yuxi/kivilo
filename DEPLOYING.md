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
   it to the redirect allow list. Sign-in is an emailed six digit code, so configure a
   real SMTP sender; the default Supabase mailer is rate limited and not for production.
4. **Environment.** Set every variable in `.env.example`. `SUPABASE_SERVICE_ROLE_KEY`
   is server only and must not be exposed to the browser. Never set
   `KIVILO_FAKE_EXTRACTION`; it is the e2e suite's stand-in for Gemini and the app
   refuses it on Vercel anyway.
5. **Deploy**, then sign in once and confirm you land on an empty inspection list rather
   than someone else's.

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
