# Kivilo mobile release

The first listing is the complete inspector app, for Singapore, in English. Its bundle
and application ID is `one.kivilo.kivilo`. The web inspector remains available while
the native app is piloted. Build only against the production API and Supabase project;
`KIVILO_FAKE_EXTRACTION` must never be set there.

On 2026-10-10 the configured Gemini account completed a real mixed video/photo
extraction with synthetic media through `scripts/verify-gemini-extraction.ts` (one
item returned). This verifies the provider request and schema, not the physical-phone
capture or production storage path.
On 2026-10-11 a synthetic Gemini 3.1 Pro Preview direct check-out probe returned
schema-valid findings for fair wear, a missing item and a changed serial, and omitted
an unchanged item. The prompt forbids unsupported evidence and liability claims;
the server rejects drafts that omit or misclassify objective changes before saving
them. This does not establish legal assessment quality. The company reported that
its new Gemini key's project is Tier 1 postpay and confirmed the matching key was
saved in Vercel Production before the deployment. On exact backend commit `1f200b6`,
the deployed `/findings/run` route returned HTTP 200 and a WEAR/FAIR_WEAR draft for
isolated synthetic inventory. The deployed `/rooms/[roomId]/finish` route returned
HTTP 200 for synthetic video and photo captures; the room reached REVIEW with one
AI-authored item carrying confidence. Both probes removed their temporary Auth users,
database rows, and Storage media. They verify the actual production provider and
backend paths, not a physical phone or the full signed-report workflow.
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
The company confirmed D-U-N-S **659161629** on 2026-10-10. The existing
NotTooSweetLabs organization Play account (developer ID `8982183772541615481`)
has Kivilo registered with package `one.kivilo.kivilo` (app ID
`4975629300074157006`). Do not use the separate AGI Labs Play account.

1. Use the existing legal company's Apple Developer and Google Play organization
   accounts. Both listings must use the same legal identity and D-U-N-S record.
2. App Store Connect app `6821514302` is registered as Kivilo with bundle ID
   `one.kivilo.kivilo`. The App Store version is `1.0.0`. Verify a signed simulator
   app has an application identifier and Keychain access group before testing sign-in:
   an unsigned simulator build fails during Supabase initialization with Keychain
   error `-34018`, before Flutter draws its first screen.
3. The Play app is created with the same application ID. Its upload keystore is
   backed up outside this repository at `~/.android/kivilo-upload.jks`; its password
   and alias are in this Mac's login Keychain under service
   `one.kivilo.kivilo.upload-signing`. Supply its path and credentials in
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
App Store Connect accepted the upload (build ID
`347e4598-001b-4204-bf27-cd90c2e7f672`); the build later reached `VALID`.
The archive used a dedicated temporary signing keychain to avoid repeated
login-keychain authorization prompts; that temporary keychain was removed after export.

The final candidate for this version, build `2`, includes the approved privacy link,
Gemini consent wording, and status-bar contrast fix. Its Apple Distribution archive
and exported IPA at `build/ios/ipa/Kivilo-1.0.0+2.ipa` passed strict `codesign`
verification with bundle ID `one.kivilo.kivilo`, team `4N9TA3WSYM`,
`aps-environment=production`, and `get-task-allow=false`. The IPA SHA-256 is
`56a1c024010d49eb2f3bfa16d0f56e6741171833b1b9b5436066f99abec2b43f`.
App Store Connect accepted the upload and reports build ID
`41894afe-cbe5-46fb-a5ac-11ed2bd6a1f5` as `VALID`; it is attached to the
App Store version `1.0.0`. The draft contains the approved subtitle, description,
keywords, promotional text, support URL, privacy policy URL, Productivity category,
and private synthetic reviewer contact and credentials. App Privacy declarations,
signed-in screenshots, physical-device testing, and public review submission remain
outstanding. The user-confirmed Apple age-rating questionnaire was saved with all
mature-content frequencies `NONE` and the applicable feature answers `false`.
The user also confirmed build `2` uses no non-exempt encryption; App Store Connect
records `usesNonExemptEncryption=false`. The build now reports `IN_BETA_TESTING`
in the internal-only `Kivilo Internal` TestFlight group, which contains only the
existing NotTooSweetLabs App Store Connect account holder. Their invitation is
`INVITED`; TestFlight installation and physical iPhone testing are not yet verified.

On 2026-10-11, the production-configured, upload-signed Android App Bundle version
`1.0.0` (build `2`) was accepted by Play and committed to the **internal testing
track as a draft**. It is not tester-visible. The AAB is
`build/app/outputs/bundle/release/app-release.aab`, SHA-256
`f98d0a145a4f44fa656a3c2bf024670df9e14dd5ae4bb69e2a18c86d48d92bef`.
`jarsigner -verify` passed; its certificate identifies NotTooSweetLabs Pte. Ltd.
and its package is `one.kivilo.kivilo` with target SDK 36. Build `2` includes the
approved privacy link, Gemini consent wording, and Android status-bar contrast fix.
The default Play listing's text, icon, feature graphic, and five synthetic-device
screenshots were uploaded to a Publishing API edit, but that edit could not be
committed: the existing service account lacks **Manage store presence** permission
(HTTP 403). The corresponding Play Console listing and policy declarations still
need completion. The images remain locally under ignored `build/store-assets/android/`
and `build/store-screenshots/android/`.

The signed Android release app passed emulator password sign-in, photo and video
capture, offline photo persistence across force-stop/relaunch, and upload after
reconnection. The production database showed the offline photo registered once.
This does not replace the required physical-device long-capture, low-connectivity,
and push checks. `flutter analyze` had no issues and all 43 Flutter tests passed on
the updated app tree. Complete a production check-in/check-out with signatures and
assessment review before activating the internal release; the isolated AI-path probes
above do not exercise the full workflow.

Build from `mobile/`:

```bash
flutter analyze
flutter test
flutter build appbundle --release --dart-define-from-file=env.json
flutter build ipa --release --dart-define-from-file=env.json
```

The AAB build `2` is already uploaded as a Play internal draft. The IPA build `2` is
uploaded, attached to App Store version `1.0.0`, and available to its sole internal
TestFlight invitee. Verify the installed builds on physical devices before any public
submission. Increase the build number for each subsequent upload.

## Review material

- Use [the prepared listing copy](STORE_LISTING.md). The company approved the
  purpose-based privacy notice on 2026-10-11 and confirmed the support mailbox is
  monitored. `/privacy` is published and linked from the app; verify its public URL
  before entering it in both store listings.
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
  The key was updated in Vercel Production before the Gemini 3.1 deployment. The
  production check-out and extraction paths passed isolated synthetic probes on
  backend commit `1f200b6`; a local `.env.deploy` probe uses an older key and does
  not establish Production behavior.
- The company owner operates the deletion queue and Storage purge daily, completes
  requests within 30 days, and reviews retained shared records and deletion logs
  quarterly. `hello@nottoosweetlabs.com` is monitored. Record these reviews and any
  disposal; there is no automatic expiry for retained signed reports.
- Each day, query the production Supabase SQL Editor for open requests or unsent
  completion notices, record the check date and result, and escalate anything
  approaching `dueAt`:

  ```sql
  SELECT id, status, "requestedAt", "dueAt", "notificationSentAt"
  FROM "AccountDeletionRequest"
  WHERE status <> 'COMPLETED'
     OR ("email" IS NOT NULL AND "notificationSentAt" IS NULL)
  ORDER BY "dueAt" ASC;
  ```

  Run the Storage purge worker with production credentials using Node 22 or newer;
  this Mac's `node` is 26, while `pnpm exec` currently selects Node 20:
  `DOTENV_CONFIG_PATH=.env.deploy node --import tsx scripts/purge-storage.ts`.
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
- Run `node --import tsx scripts/purge-storage.ts` with production credentials daily
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

### Apple App Privacy answer sheet for build 2

The iOS app **collects data**. Apple defines collection as transmitting data off the
device where we or a provider can access it beyond servicing the immediate request.
Use these answers when filling App Store Connect's App Privacy form:

| Apple data type | Why it applies | Linked to identity | Purpose |
| --- | --- | --- | --- |
| Name, Email Address | Inspector sign-in and landlord/tenant records | Yes | App Functionality |
| Physical Address | Property address and unit in an inspection | Yes | App Functionality |
| Other Financial Info | Monthly rent, deposit and maintenance cost | Yes | App Functionality |
| Photos or Videos | Room evidence and maintenance evidence | Yes | App Functionality |
| Audio Data | Narrated walkthrough recordings | Yes | App Functionality |
| Other User Content | Notes, captions, inventory edits, marks, signatures, findings and maintenance comments | Yes | App Functionality |
| User ID | Supabase account and stakeholder IDs | Yes | App Functionality |
| Device ID | FCM registration token saved against the signed-in stakeholder | Yes | App Functionality |
| Other Data Types | Signing IP address and Firebase's app/device user agent | Yes for the category (signing IP); Firebase's user agent is unlinked | App Functionality, Analytics |
| Other Diagnostic Data | Firebase Messaging, Installations and GoogleDataTransport SDK diagnostics | No | App Functionality, Analytics |

Select **No** for "used for tracking" for every type. There are no ad, tracking,
Crashlytics or Analytics SDKs in this build; the Firebase diagnostics and unlinked
user agent above are collected by the installed messaging dependencies for SDK
operations. Do not claim the FCM device ID is unlinked just because Firebase's own
privacy manifest says so: Kivilo stores its token under a signed-in stakeholder.
This table is a code-derived preparation sheet, not a published declaration; check
the final App Store Connect answers against the actual form before publishing.
The app currently asks for names and email addresses, but does not ask for phone or
national ID numbers in its native forms. Generic free-text fields do not by
themselves require declaring every possible type someone may enter. Apple also says
data kept only on the device is not collected. The public policy covers additional
data handled by Kivilo's web service and PWA.

Sources: [Apple's data-type, linkage and tracking definitions](https://developer.apple.com/app-store/app-privacy-details/),
[Apple's App Privacy workflow](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy),
and [Firebase's iOS SDK disclosure guidance](https://firebase.google.com/docs/ios/app-store-data-collection/).
