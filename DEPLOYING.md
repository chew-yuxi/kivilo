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
   it to the redirect allow list. Raise the storage file size limit first (see the
   upload cap note below), otherwise step 2 fails. Sign-in is an emailed six digit code, so in Auth →
   Email Templates change **Magic Link** to show `{{ .Token }}` (the default body is a
   `{{ .ConfirmationURL }}` link, which the app cannot use), and configure a real SMTP
   sender; the default Supabase mailer is rate limited and not for production.
4. **Environment.** Set every variable in `.env.example`. `SUPABASE_SERVICE_ROLE_KEY`
   is server only and must not be exposed to the browser. Never set
   `KIVILO_FAKE_EXTRACTION`; it is the e2e suite's stand-in for Gemini and the app
   refuses it on Vercel anyway.
5. **Deploy**, then sign in once and confirm you land on an empty inspection list rather
   than someone else's.

## Where it is (2026-08-20)

- Live at https://kivilo-one.vercel.app (Vercel project `chewyuxis-projects/kivilo`,
  auto-deploys from `main` on github.com/chew-yuxi/kivilo).
- Supabase project `kivilo`, ref `ezisetpbwmentmdqvdjz`, **Singapore**, org
  `chew-yuxi's Org`. Replaces `dksfpjcmfrqztqgnwgbm`, which was deleted 2026-08-19.
  Migrated (4 migrations), private `captures` bucket created, site URL and allow list
  set to the Vercel origin, OTP length 6, and the Magic Link template rewritten to show
  `{{ .Token }}`. The database password was reset when the project was handed over, so
  `~/.kivilo-db-password` and `.env.deploy` hold the current one.
- Production env: everything in `.env.example` except `ANTHROPIC_API_KEY`, which is not
  set anywhere yet. Values live in the untracked `.env.deploy` locally; the database
  password is in `~/.kivilo-db-password`.

Still open, and each one bites before the first real inspection:

- **Upload cap, mostly solved.** A new project starts with a project-wide 50 MB limit,
  and `scripts/setup-storage.ts` fails with `EntityTooLarge` because it asks for a 2 GB
  bucket. The dashboard gates raising that behind Pro, but the management API does not:

  ```bash
  curl -X PATCH -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
    -H 'content-type: application/json' -d '{"fileSizeLimit":2147483648}' \
    https://api.supabase.com/v1/projects/<ref>/config/storage
  ```

  Run that *before* `pnpm setup:storage`. Verified on 2026-08-20 by uploading a 60 MB
  object to the live bucket and deleting it again, so the cap is not re-enforced at
  upload time. What the free plan still limits is **total** storage (1 GB), which a
  handful of real walkthroughs will exhaust. That, not the per-file cap, is the reason
  to go Pro.
- **Auth email.** Codes still go out through Supabase's built-in mailer, which is capped
  at **two messages an hour, project wide** (`rate_limit_email_sent = 2`). That is the
  single thing that makes the app hard to demo, and it is not a deliverability problem
  you can tune around. The code to replace it is written and merged but **not switched
  on**; finish it as follows, in this order, because enabling the hook before Resend can
  send would break sign-in outright:

  1. Verify a sender domain in Resend and create an API key.
  2. Set `RESEND_API_KEY` and `RESEND_FROM_EMAIL` on Vercel and redeploy, so the route
     can actually send before anything calls it.
  3. Enable the hook, pointing it at the deployed route and reusing the secret already
     set as `SEND_EMAIL_HOOK_SECRET` on Vercel (also in `.env.deploy`):

     ```bash
     curl -X PATCH -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
       -H 'content-type: application/json' \
       -d '{"hook_send_email_enabled":true,
            "hook_send_email_uri":"https://kivilo-one.vercel.app/api/auth/send-email",
            "hook_send_email_secrets":"<the same v1,whsec_... value>"}' \
       https://api.supabase.com/v1/projects/<ref>/config/auth
     ```

  4. Raise `rate_limit_email_sent`, which does **not** lift itself when the hook takes
     over sending.
  5. Sign in once and confirm the email is the Resend one, not Supabase's.

  Leave the hook off locally. The built-in mailer keeps delivering to mailpit, which is
  where `pnpm test:e2e` reads the code from.
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
