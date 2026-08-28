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
read only. The session is kept in the Keychain, not the default plaintext store, because
the refresh token opens an account holding photographs of people's homes.

`lib/services/capture_queue.dart` is the durable capture queue, ahead of the camera UI
that will fill it, because it is the piece that carries the never-lose-a-capture
invariant and it is the piece that can be tested without a phone. It mirrors
`src/lib/offline-queue.ts` deliberately: same ordering, same hand-over rules, no maximum
attempt count. Two things it has that the web client does not need: a `claimedAt` lease,
because a background transfer runs in its own isolate with its own database handle and an
in-memory guard would not be seen across that boundary, and a relative file path, because
iOS moves the app container between launches.

Capture, review and signing are still the web app's job. The order of work,
and what each milestone unblocks, is in `plans/flutter-migration.md`.
