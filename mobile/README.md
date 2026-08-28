# Kivilo, the inspector app

The native client for the inspector. It talks to the same Next.js backend the web app
runs on, over HTTP with a Supabase access token where the browser sends a cookie, so both
clients resolve to the same `Stakeholder` and go through the same authorization boundary
in `src/lib/auth.ts`. There is deliberately no second boundary here.

The landlord's report at `/reports/[token]` is not in this app and never will be. A
landlord has no account and no reason to install anything; asking them to would cost the
acquisition channel the report exists to feed.

## Running it

Configuration arrives at build time, so nothing is committed:

```bash
cp env.example.json env.json     # then fill it in
flutter run --dart-define-from-file=env.json
```

`API_BASE` on the Android emulator is `http://10.0.2.2:3000`, which is how the emulator
reaches the host's `pnpm dev`. On a physical phone use the machine's LAN address, and on
the iOS simulator `http://localhost:3000`. Point it at the deployed origin to run against
production.

Local `SUPABASE_URL` and the publishable key come from `supabase status` in the repo root.

## Verification

```bash
flutter analyze     # zero issues expected
flutter test
```

The server half of this seam is covered from the repo root by `e2e/api.spec.ts`, which
signs in exactly as this app does, with no browser and no cookie, and asserts that another
agent's inspection is indistinguishable from one that never existed.

## What is here so far

Sign in with the emailed six digit code, the inspection list, and one inspection's rooms,
read only. Capture, review and signing are still the web app's job. The order of work,
and what each milestone unblocks, is in `plans/flutter-migration.md`.
