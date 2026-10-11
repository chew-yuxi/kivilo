# Kivilo mobile release

The first listing is the complete inspector app, for Singapore, in English. Its bundle
and application ID is `one.kivilo.kivilo`. The web inspector remains available while
the native app is piloted. Build only against the production API and Supabase project;
`KIVILO_FAKE_EXTRACTION` must never be set there.

On 2026-10-10 the configured Gemini account completed a real mixed video/photo
extraction with synthetic media through `scripts/verify-gemini-extraction.ts` (one
item returned). This verifies the provider request and schema, not the physical-phone
capture or production storage path.
On 2026-10-11 a synthetic Gemini 2.5 Pro check-out probe returned schema-valid
findings for fair wear, a missing item and a changed serial, and omitted an unchanged
item. Its initial rationale overstated evidence, so the prompt now forbids unsupported
claims. This does not establish legal assessment quality. The company reported that
its new Gemini key's project is Tier 1 postpay and confirmed the matching key was
saved in Vercel Production before the Gemini check-out deployment. The deployed
findings route still needs a synthetic end-to-end check.
The configured private Supabase bucket also accepted and confirmed the exact unnamed
multipart signed PUT used by the native uploader; the synthetic probe object was
removed immediately (`scripts/verify-signed-upload.ts`, run with Node 26). Android
debug APK and iOS simulator builds pass. Physical-device testing remains a separate
gate.
On 2026-10-10, all three additive migrations for native release, account-deletion
cleanup, and general Storage tombstones were applied to the configured production
Supabase database with `prisma migrate deploy`. The pre-migration check found zero
duplicate capture storage paths. The matching backend and PWA were deployed to the
existing Vercel production project the same day, then rebuilt without local environment
files or Flutter artifacts. The custom-domain `/support` and `/delete-account` pages
returned HTTP 200, and unauthenticated `/api/v1/me` returned HTTP 401. Configured
Android debug and iOS simulator builds also passed; these are not distribution-signed
artifacts or physical-device verification.

## Accounts and signing

Hopshift's existing company records identify **NotTooSweetLabs Pte. Ltd.** in
**Singapore**. Its Apple release project uses team `4N9TA3WSYM`. The company
confirmed that `hello@nottoosweetlabs.com` is monitored for Kivilo support and
deletion requests.
The company confirmed D-U-N-S **659161629** on 2026-10-10. Google Play organization
enrollment is still not recorded in the accessible Hopshift release files.

1. Enrol the existing legal company as an organization in Apple Developer and Google
   Play Console. Both require matching legal identity and a D-U-N-S record. Record the
   company account holder and grant release access without sharing their password.
2. App Store Connect app `6821514302` is registered as Kivilo with bundle ID
   `one.kivilo.kivilo`. The App Store version is `1.0.0`. Verify a signed simulator
   app has an application identifier and Keychain access group before testing sign-in:
   an unsigned simulator build fails during Supabase initialization with Keychain
   error `-34018`, before Flutter draws its first screen.
3. In Play Console, create the app with the same application ID and enrol in Play App
   Signing. Generate and back up an upload keystore. Supply its path and credentials in
   `KIVILO_UPLOAD_KEYSTORE`, `KIVILO_UPLOAD_STORE_PASSWORD`, `KIVILO_UPLOAD_KEY_ALIAS`,
   and `KIVILO_UPLOAD_KEY_PASSWORD` when building. The Gradle release task refuses to
   run without these values.
4. Fill a local ignored `env.json` with the production `SUPABASE_URL`, publishable
   `SUPABASE_ANON_KEY`, and HTTPS `API_BASE`. These are client-side configuration, never
   service-role credentials. Confirm both origins point to the same production project.

## Firebase Cloud Messaging

Firebase is used for mobile push notifications; Supabase remains the account and data
backend. Register **two** apps in one Firebase project: Android package
`one.kivilo.kivilo` and iOS bundle ID `one.kivilo.kivilo`. They have different Firebase
App IDs even though the package and bundle strings match. Put both App IDs in the
ignored `env.json` as `FIREBASE_ANDROID_APP_ID` and `FIREBASE_IOS_APP_ID`, with the
corresponding `FIREBASE_ANDROID_API_KEY` and `FIREBASE_IOS_API_KEY`, plus the project's
`FIREBASE_MESSAGING_SENDER_ID` and `FIREBASE_PROJECT_ID`. The app selects its own
platform's App ID and API key at runtime. These client configuration values are not an
Admin SDK credential. Do not reuse Hopshift's Firebase app configuration.

Registered project: `kivilo-b4e14` (sender ID `328187705191`). Android App ID:
`1:328187705191:android:3ede4d52349cf9065ba1c2`. iOS App ID:
`1:328187705191:ios:b6a777cebec68dfb5ba1c2`. Both apps use
`one.kivilo.kivilo`; the Apple app has team ID `4N9TA3WSYM`. FCM HTTP v1 is
enabled. On 2026-10-11 Firebase showed the production APNs key ID
`JK75WN48PB` with team `4N9TA3WSYM`. The Firebase Admin service-account JSON
was installed as a sensitive Vercel production environment variable, a production
redeploy completed, and the temporary local Admin key download was removed.
The credential obtained a Google access token, but no physical-device delivery
test has passed. The development APNs slot is intentionally unconfigured.

The checked-in iOS and Android client files match project `kivilo-b4e14` and the
Kivilo bundle/package ID. The iOS plist is part of the Runner target, and the Android
Google Services plugin processes its JSON at build time. Keep `env.json` matched to
those files; see the [FlutterFire setup](https://firebase.google.com/docs/flutter/setup).
Enable Push Notifications and Background Modes for the iOS App ID and Runner target.
Verify the distribution-signed app has `aps-environment=production`; a development
entitlement is not a release test.
See the [FCM Flutter setup](https://firebase.google.com/docs/cloud-messaging/flutter/get-started)
and [Apple entitlement reference](https://developer.apple.com/documentation/BundleResources/Entitlements/aps-environment).

The server sends pushes with Firebase Admin from `FIREBASE_SERVICE_ACCOUNT_JSON` in
the production secret manager. Never put that JSON or the APNs `.p8` key in the Flutter
build or this repository. Send a test message to an Android
device and a distribution-signed iPhone, then check foreground, background, and tap
behavior. The existing scheduled notification outbox runs every 15 minutes, so allow
for that delay when testing an app-generated notification.

On 2026-10-11, an Apple Distribution archive and App Store IPA for version `1.0.0`
(build `1`) were produced and verified for team `4N9TA3WSYM`, bundle ID
`one.kivilo.kivilo`, `aps-environment=production`, and `get-task-allow=false`.
The IPA at `build/ios/ipa/Kivilo-1.0.0+1.ipa` has SHA-256
`ddfbc93b73be0c55eb2bb68f0f31e866356e8344aa4a396dbc005a479119ca25`.
App Store Connect accepted the upload (delivery UUID
`347e4598-001b-4204-bf27-cd90c2e7f672`); the build had not yet appeared in its
Builds API immediately after upload. The App Store draft contains the prepared
subtitle, description, keywords, promotional text, support URL, and Productivity
category. Privacy disclosures, screenshots, device testing, and review submission
remain outstanding. The archive used a dedicated temporary signing keychain to avoid
repeated login-keychain authorization prompts; that temporary keychain was removed
after export.

Build from `mobile/`:

```bash
flutter analyze
flutter test
flutter build appbundle --release --dart-define-from-file=env.json
flutter build ipa --release --dart-define-from-file=env.json
```

Upload the AAB to Play internal testing and the IPA to App Store Connect/TestFlight.
Check the signed artifact's application ID, version/build number, target API, permissions,
and production URLs before inviting testers. Increase the build number for each upload.

## Review material

- Use [the prepared listing copy](STORE_LISTING.md). The company approved the
  purpose-based privacy notice on 2026-10-11 and confirmed the support mailbox is
  monitored. Publish `/privacy` with the app links, then verify its public URL before
  entering it in both store listings.
- Provision separate Apple and Google reviewer logins with
  `pnpm exec tsx scripts/provision-store-reviewer.ts` from the repository root. Supply
  `KIVILO_REVIEWER_PROVISION=1`, `KIVILO_REVIEWER_TRACK=apple` or `google`, and a
  dedicated `KIVILO_REVIEWER_EMAIL` / `KIVILO_REVIEWER_PASSWORD` through your secret
  manager, alongside the production database and Supabase service-role environment.
  Never put the password on a command line, in a committed file, or in public review
  notes. The command is safe to rerun: it only updates its marked Auth account and
  creates fixed-ID demo rows if absent; it refuses an existing non-review account or
  fixture-ID collision. It prints no credentials.
- The Apple and Google synthetic review accounts were provisioned on 2026-10-10 as
  `kivilo-apple-review@nottoosweetlabs.com` and
  `kivilo-google-review@nottoosweetlabs.com`. Their generated passwords are stored in
  this Mac's login keychain under services `kivilo-reviewer-apple` and
  `kivilo-reviewer-google`; retrieve them only when entering the private store review
  fields. Both password logins returned two isolated demo inspections through the
  production bearer-authenticated API (HTTP 200).
- Each login gets a draft check-in for camera and AI review, plus a separate synthetic
  check-in awaiting signatures. Sign both demo parties to unlock check-out. Give the
  store reviewers only their own account's credentials in the private App Review and
  Play Console access fields.
- In the private review notes, explain the path through check-in, check-out, account
  deletion, and report sharing. The ordinary six-digit email code remains available
  to real inspectors.
- Capture screenshots from the actual release build using synthetic parties and a
  synthetic property. Show capture, review, the signed inventory, and the separate
  published assessment. Never use a real unit's imagery in store metadata.
- Complete Apple App Privacy and Google Data safety declarations for names, email,
  property address, photos, video, audio, signatures, and diagnostic IP address. Declare
  external processing through Google Gemini, private storage, and email delivery.
  Use the public privacy policy, support contact, and `/delete-account` as the account
  deletion URL. Answer camera and microphone permission questions accurately.
- The company reports the new production Gemini key's project as Tier 1 postpay.
  The key was updated in Vercel Production before the Gemini check-out deployment.
  Verify the deployed check-out route with isolated synthetic inventory; a local
  `.env.deploy` probe still uses the older key and is not evidence for Production.
- The company owner operates the deletion queue and Storage purge daily, completes
  requests within 30 days, and reviews retained shared records and deletion logs
  quarterly. `hello@nottoosweetlabs.com` is monitored. Record these reviews and any
  disposal; there is no automatic expiry for retained signed reports.
- The deletion operator runs `scripts/fulfill-account-deletion.ts <request-id>`
  under the approved 2026-10-11 policy, explicitly setting
  `KIVILO_RETENTION_POLICY_VERSION=2026-10-11`, `KIVILO_RETAIN_SIGNED_RECORDS=1`,
  `KIVILO_DELETE_SOLE_UNSIGNED_RECORDS=1`, and
  `KIVILO_RETAIN_SHARED_UNSIGNED_RECORDS=1`. Review the request's inspections and
  tenancies first: the command deletes only unsigned inspections conducted by this
  account where every tenancy party is also this account. It retains signed records
  and any unsigned work involving another party, including drafts this account
  conducted, and preserves names on retained shared records under that policy. It
  deletes the Supabase Auth user before draft cleanup. Each deleted room gets a
  durable Storage cleanup entry.
  Outstanding signed upload URLs can write for two hours, so the command intentionally
  leaves the request `PROCESSING` for at least three hours; rerun it after that window.
  Only an empty Storage listing for every deleted room allows `COMPLETED` and the
  completion email. Any pending general `StoragePurge` tombstone also keeps the
  request `PROCESSING`, since an earlier capture or room deletion could have left
  personal media awaiting removal; run the purge worker first. A failed run is
  resumable using the same request ID and policy.
  Do not report fulfillment while the request is still `PROCESSING` or completion mail
  remains unsent.
- Run `pnpm exec tsx scripts/purge-storage.ts` with production credentials daily
  and monitor nonzero exits. Deleting a capture or room writes a durable
  `StoragePurge` tombstone in the same transaction as the DB deletion. The worker
  waits at least three hours for signed upload URLs to expire, retries failed
  removals on the next run, and marks a tombstone complete only after confirming
  the object or room prefix is absent. Do not treat a UI deletion as erased from
  Storage until its tombstone is complete.

## Acceptance before public submission

On physical iPhone and Android devices, finish a check-in and check-out with real
uploads, provider calls, signatures, sharing, and published assessment. Under a poor
connection, take 30 photos and a ten-minute video; background and force-close the app,
relaunch, and confirm every capture appears once. Check portrait mark placement in a
desktop shared report. Run the repository's server checks and local Supabase integration
and end-to-end suites. Keep the testing builds open while resolving store review notes.
