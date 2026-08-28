# Deploying Kivilo

M4 (check-in / check-out) only. There is no billing, no team accounts, and no admin
surface yet; anyone who can sign in becomes an agent and sees the deals they are on.

## What you need

- A Supabase project, in the Singapore region. The captures are video of people's homes
  and the stakeholder records carry NRIC and FIN numbers, so data residency is a real
  decision rather than a default.
- A Vercel project (or any Node host) for the app. `vercel.json` pins functions to
  `sin1` so they sit next to the database; leave that in place.
- A Google Generative AI key for extraction and an Anthropic key for the check-out diff.

## First deploy

1. **Database.** Point `DATABASE_URL` at Supabase's **transaction** pooler, port
   `6543`, and `DIRECT_URL` at the **session** pooler, port `5432`. The session pooler
   pins a Postgres backend per client and caps the project at 15 of them, which warm
   Vercel instances exhaust between them; the transaction pooler admits ~200. Migrations
   are the exception, since they take advisory locks a transaction pooler will not hold,
   which is why `prisma.config.ts` reads `DIRECT_URL`. Run `pnpm exec prisma migrate
   deploy`. Do not run `migrate dev` against a deployed database; it is interactive and
   can reset.
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

- Live at **https://kivilo.nottoosweetlabs.com** (Vercel project
  `chewyuxis-projects/kivilo`, auto-deploys from `main` on github.com/chew-yuxi/kivilo).
  `kivilo-one.vercel.app` still resolves and stays in the auth allow list. The custom
  domain needed a `_vercel.nottoosweetlabs.com` TXT record plus an explicit verify call,
  since the apex is not a domain in this Vercel team; DNS is at Cloudflare and the
  subdomain must stay grey-cloud, because proxying it would hide Vercel's IPs and break
  certificate issuance.
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
- **Auth email: done, 2026-08-23.** Sign-in codes go out through Resend, not Supabase's
  built-in mailer. Supabase's Send Email Hook POSTs the code to
  `https://kivilo.nottoosweetlabs.com/api/auth/send-email`, which verifies the webhook
  signature and sends via Resend from `Kivilo <noreply@kivilo.nottoosweetlabs.com>`.
  `rate_limit_email_sent` is raised from 2 to 100; it does **not** lift itself when the
  hook takes over. Verified end to end: a real code was delivered to a Gmail address.

  Order matters if this is ever rebuilt. The hook *replaces* the built-in mailer, so any
  misconfiguration is total sign-in failure rather than a degraded path. Deploy the
  route and set `RESEND_API_KEY` / `RESEND_FROM_EMAIL` **first**, and only then enable
  the hook.

- **`ANTHROPIC_API_KEY`** is unset, so the check-out diff cannot run.
- **Domain.** Settled as `kivilo.nottoosweetlabs.com` on 2026-08-23; the Supabase auth
  site URL and allow list already point at it. kivilo.io was still unregistered that day
  if a standalone name is ever wanted.

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

## Reading Supabase hook failures

The auth API reports a broken Send Email Hook as a generic 500, and the message is the
only clue. Two that cost real time:

- `"Unexpected status code returned from hook: 404"` means the URI is wrong. A trailing
  dot pasted into the dashboard field does exactly this.
- `"Hook requires authorization token"` does **not** mean a token is missing from the
  request. It is how Supabase surfaces a **401 from your own route**, which in practice
  means the secret on Supabase and the one in `SEND_EMAIL_HOOK_SECRET` disagree.

Do not try to compare the two by reading the secret back. `GET /config/auth` returns
`hook_send_email_secrets` as an opaque hex value that does not change to match whatever
you PATCH in, so it looks like the write silently failed when it did not. The write is
validated (a wrong format is rejected with a clear error), so if the PATCH returns no
error, it took. The way to resolve a suspected mismatch is to set a **fresh** secret on
both sides at once and redeploy, never to reverse engineer the displayed value.
