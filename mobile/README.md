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

## Inspector workflow

The app supports emailed-code sign-in and a password option for provisioned review
accounts. An agent can create a check-in, add and manage rooms, record narrated video and
photos, caption and mark photos, draft one room's inventory with AI consent, review and
edit items, send the inventory for signature, capture both parties' signatures, share or
revoke the report, and open a check-out. The check-out comparison remains a private draft
until the agent publishes a dated assessment version after countersignature. The signed
inventory is frozen independently of assessment edits.

Camera media is copied into app support storage and a Drift queue before capture is
acknowledged. Uploads use signed private-storage URLs, retry without an attempt limit,
and resume when the app starts or returns to the foreground. Inspection and room metadata
previously loaded for the same signed-in account are cached for offline navigation.
The session is kept in the Keychain or encrypted Android preferences.

The Settings screen records an account-deletion request and its due date. The public
request entry point is `/delete-account` on the web origin. AI consent is recorded per
inspection before room drafting or check-out comparison.

`flutter analyze`, `flutter test`, and the server checks verify source and backend
behavior. `test/native_flow_test.dart` runs the complete native API sequence against a
stateful fake transport, including consent, review, signatures, sharing, check-out,
assessment publication, and account deletion; it does not exercise the physical camera
or the remote services. The Android debug APK and iOS simulator app build successfully
from this workspace; iOS now targets 15.0 or newer. A physical iPhone and Android test
with long videos, poor connectivity, backgrounding, and force-quit is still required
before store submission. Store signing,
account enrollment, listing assets, and review submission also require the company's
developer accounts; none of those gates is implied by a passing local build.
