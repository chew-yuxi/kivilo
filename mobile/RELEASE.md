# Kivilo mobile release

The first listing is the complete inspector app, for Singapore, in English. Its bundle
and application ID is `one.kivilo.kivilo`. The web inspector remains available while
the native app is piloted. Build only against the production API and Supabase project;
`KIVILO_FAKE_EXTRACTION` must never be set there.

## Current candidate — 2026-10-12 Singapore time

Android build `8` is available on Play internal testing; iOS build `6` is in the
existing internal TestFlight group. Apple's build
`452a3bfd-a517-4908-950a-fb24f6c2092b` is VALID,
IN_BETA_TESTING, and selected on the version draft. Play production has no release;
Apple remains PREPARE_FOR_SUBMISSION. Neither store has a public submission.
The artifacts retain the verified production configuration and signing:

- Android AAB `build/release-artifacts/android/build8/kivilo-v8.aab`, SHA-256
  `2a9b6076957dea222ca5d8b7ab667a345074c3ec3b38dd86e0910ee731499782`.
- Android APK `build/release-artifacts/android/build8/kivilo-v8.apk`, SHA-256
  `c43b3780c6db0b6afafb731495cfbafeb353bbfcb12f7a089f6d921d6bc5ac86`.
- iOS IPA `build/ios/ipa/build6-final/kivilo.ipa`, SHA-256
  `8962e8383fe429e8ceea2987e14cd0a35309d961234beab0285f16c51bc01451`.

Build `6` fixes the physical-test failure where a newly opened inspection disappeared
from the cached list after an offline restart. Cache writes are also bound to the
account that started the request. The regressions and Flutter analysis passed.
Build `7` fixes a second physical-test finding: vertical strokes
in the signature pad were swallowed by the surrounding page's scrolling gesture.
The pad now owns its pointer gestures; the page still scrolls outside it, and a tap
alone cannot be submitted as a signature. Flutter analysis and all 55 tests passed.
Physical Android testing confirmed both vertical signatures and the offline inspection
list. Build `8` addresses a remaining offline-camera gap: opening a room online must
make it available to capture after an offline restart. On a physical Android phone, the
previously opened room reached Camera while offline; its photo survived a second offline
force-quit/relaunch. After reconnect, production showed exactly one Capture row and one
confirmed private Storage object for that synthetic room.

The Android build `5` synthetic check-in completed real capture, offline caption
editing, force-quit/relaunch, upload, Gemini extraction, human inventory editing,
room review, and both test signatures. The caption survived offline restart and
registered on the same single capture. Its unauthenticated shared report rendered
both signatures and the separate portrait-photo ring; screen and print alignment
matched normalized coordinates within 0.000003. The synthetic check-out completed both
signatures, generated a Gemini draft, and published assessment version 1 only after human
review. A second revision remains a private, unpublished draft; the signed inventory
and published version 1 stayed unchanged. Its share link was revoked, leaving no active
link for that checkout. These fictional QA signatures do not represent real parties.

Production push reached Android build `5` in the foreground and its Open action
opened Notifications. The physical TestFlight iPhone also received a native background
system banner; tapping it opened the app's Notifications list. App Store Connect's Home
screenshot is complete. Generic push payloads intentionally contain
no private record IDs or routes: the app opens the authenticated Notifications list,
and opening a row marks that notification read.

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
The credential obtained a Google access token. Production pushes reached a physical
Android phone running signed builds `2` and `4`; physical iPhone delivery and
notification tap routing still need verification. The development APNs slot is
intentionally unconfigured.

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

The preceding candidate for this version, build `2`, includes the approved privacy link,
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
The draft listing's base territory is Singapore and its price is SGD 0.00. App
availability explicitly enables Singapore alone (1 of 175 territories), excludes
new territories, and has no pre-order. The version records copyright
`2026 NotTooSweetLabs Pte. Ltd.` and `usesIdfa=false`; code and CocoaPods contain no
IDFA or advertising SDK. The app remains `PREPARE_FOR_SUBMISSION`. Builds `3` and
`4` target iPhone only; build `2` still supports iPad and is for internal testing,
not the public submission.

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

The iPhone-only build `3` (`1.0.0+3`) includes the redesigned Flutter UI and branded
launch screen. Its production-signed IPA passed strict `codesign` verification with
bundle ID `one.kivilo.kivilo`, team `4N9TA3WSYM`,
`aps-environment=production`, `get-task-allow=false`, and iPhone-only device family.
The verified local IPA SHA-256 is
`ea3a3e3f8260fb499c843da70e250e60439f17d4aee6708955cc652888feaa60`.
App Store Connect accepted build ID `255ecac2-a8e3-46e4-9363-65fd51de4274` as
`VALID`; it is attached to version `1.0.0` and is `IN_BETA_TESTING` in the
`Kivilo Internal` TestFlight group. Its encryption declaration is `false` as
approved for this OS HTTPS/Keychain-only build. No public review submission has
been made. The booted iPhone 17 Pro Max simulator is too large for Apple's mandatory
medium Dynamic Island screenshot slot; an iPhone 17 Pro simulator is available,
but signed-in build `3` screenshots still need to be captured there.

On 2026-10-11, the redesigned Flutter experience was pushed to `main` at `c6fa1bf`
and the branded iOS launch screen at `2d2f173`. Home, sign-in, inspections, capture,
room review, signing, sharing, and assessment screens received a consistent Kivilo
theme. A release-signed Android build `3` (`1.0.0+3`) was uploaded and committed to
Kivilo's **internal** Play track; a post-commit API read reports `completed:3`.
Its AAB SHA-256 is
`a90189c11aeab5408cf1e28fa34cdf438c028d4d41b3aef5f135eee808c732f0`;
the upload signature and package match build `2`. Build `3` includes a branded
monochrome FCM notification icon. It is not public and tester access still needs
the Kivilo internal tester list selected. The redesign's sign-in and password
screens were inspected on a 411×914 dp Android emulator without clipping, including
with the keyboard open. The emulator's DNS stopped resolving hostnames, so signed-in
visual QA remains open; sign-in now reports a clear connection error. Flutter
analysis and all 43 tests passed after the redesign. Server typecheck, lint, build,
58 unit tests, 35 local integration tests, and 3 Playwright end-to-end tests passed
on the same tree. Playwright must be invoked with Node 22+ directly here because
the `pnpm` shim selects Node 20 for test workers.

On a physical Nothing A065 running signed build `2`, synthetic password login,
inspection navigation, FCM registration, and an actual production push notification
passed. The phone remained locked after that test, so 30-photo, ten-minute video,
offline, and restart checks have not yet run. A production-configured, upload-signed
build `3` APK was installed over build `2` on that phone without losing the synthetic
session; Home rendered the redesigned UI. The APK SHA-256 is
`6a4ffd014c58f7ffbfb436d9c9d931f69b6601dd9f18bca2e6c6eba9db03e4df`.
The phone owner began using it, so further device input stopped. Build `3` capture
and push have not been retested yet. The physical iPhone requires TestFlight
installation/sign-in for camera and production APNs verification.

Build `4` (`1.0.0+4`, source `7718314`) fixes capture paths found in the release
audit: Back saves an active video before leaving; a microphone denial leaves Photos
available; Finish cannot race a photo/video save or start drafting twice; failed
handover retries use a stable capture ID even after the camera file has moved; and
room deletion refuses while that account has unsent evidence or edits for the room.
Flutter analysis reported no issues and all 46 tests passed; focused tests cover
retry after a file rename and room/account queue isolation. Physical interruption
and long-capture testing is still required.

The production-signed iPhone-only build `4` IPA passed strict `codesign` for bundle
`one.kivilo.kivilo`, team `4N9TA3WSYM`, `aps-environment=production`, and
`get-task-allow=false`. Its local SHA-256 is
`0c651b3c1bc00d2701721464b450362aa83bf71ca945ebe71d631f9ee945b97b`.
App Store Connect accepted build ID `d3a9e0a1-1f1c-46c9-843f-0a634756e96b` as
`VALID`, attached it to version `1.0.0`, and placed it in `Kivilo Internal`
TestFlight with auto-notify. The Android build `4` AAB SHA-256 is
`4384e6b1d65aadb45606d2b6df1b7aa4c198d942b463cff1ad19bb9618693127`;
Play accepted version code `4` and a fresh API read confirmed it on the **internal**
track with status `completed`. A signed APK for device QA is available at
`build/app/outputs/flutter-apk/app-release.apk`, SHA-256
`85821205d20e27eb459b062dcaea8d1e630523465e7c7667c59167210501c7f8`.
It is installed on the physical Nothing A065 with the synthetic session preserved.
Neither store has received a public review submission.

On that physical phone, build `4` saved a controlled sequence of 30 covered-lens
photos with no default network, in addition to ten photos retained from an earlier
interrupted batch. The synthetic account, cached inspection/room, and local photos
survived force-stop and relaunch while offline; production still had zero captures.
After Wi-Fi reconnection all 40 photos registered with 40 distinct client IDs and
Storage paths. All 40 private Storage objects existed and their sizes matched the
database. The count remained 40 after another online force-stop/relaunch, and the
UI showed the local queue cleared with the photos synced. This confirms that tested
offline/restart sequence, not all interruption cases or the full signed workflow.
The offline video also survived force-stop/relaunch and uploaded once. `ffprobe`
confirmed 698.995556 seconds (11m39s), H.264 1280×720, an AAC 48 kHz stereo track,
and 58,935,072 bytes. No spoken narration was recorded. Back during a second recording
saved a 24-second video; Finish was disabled while recording. Photos worked with
microphone permission explicitly denied, adding one photo. The final observation
found 41 photos and two videos, 43 distinct client IDs and Storage paths, 43 objects,
and no missing files or byte-size mismatches. Microphone permission and the original
30-second screen timeout were restored. A fresh production FCM push reached the phone;
tap routing remains untested because it locked. These checks used fully offline/reconnect
conditions, not throttled throughput. Expired sessions, low storage, physical iPhone
capture and the full signed check-in/check-out remain separate gates.

The company confirmed rights to display its users' submitted media, and App Store
Connect's content rights declaration was saved and read back as
`USES_THIRD_PARTY_CONTENT`. Apple App Privacy was published in Paseo on 2026-10-11
and verified after a full reload: all 11 data types complete, 10 linked to identity,
Other Diagnostic Data unlinked, and no tracking. The purposes match the answer sheet
below. The sole internal tester, `ixuyixuy@gmail.com`, reported accepting the
TestFlight invitation on 2026-10-11. The subsequent API read still returned `INVITED`;
on 2026-10-12 Singapore time, App Store Connect reported `INSTALLED`. The connected
iPhone 13 mini is available over USB, but Developer Mode is off, so local device
automation is unavailable; TestFlight itself does not require Developer Mode.
Build `5`'s embedded Firebase plist matches its build configuration and bundle ID,
and the signed IPA has the production APNs entitlement. No iOS installation record
was created or refreshed across any account after the phone-ready report (checked
from 2026-10-11 16:00 UTC); production push delivery remains unverified. The physical
phone's signed-in Kivilo email and notification permission need confirmation before
sending a test. The iPhone 17 Pro simulator still shows an empty sign-in screen, so
signed-in store screenshots also remain outstanding.

After build `4`, offline capture testing exposed raw Dio exception text in the upload
queue. Uploads and pending edits now reuse the API's readable failure messages while
preserving saved bytes, retry records, session-expiry errors and report-freeze errors.
Flutter analysis reported no issues and all 49 tests passed, including three new
regressions. Production-signed build `5` artifacts were produced from source
`b24c496` and uploaded to both stores for internal testing. Android AAB
`build/release-artifacts/android/build5/kivilo-v5.aab`
has SHA-256 `91e58ac1e4c6c22e912d0cc6974f84a7b5a535354b2e1fedba074b2b3886286d`;
the APK alongside it has SHA-256
`294ef76410809320e78fe3a40575b1dce5719c8beeed15292902a89e138621c7`.
Both match the Kivilo upload certificate and package; version code is `5`, target
SDK 36. The iPhone-only IPA `build/ios/ipa/build5-final/kivilo.ipa` has SHA-256
`ae14430a95e2baecb678bd872a7ad226bc7c09bb6a990f69cb2d73529c72cc64`;
strict signing verification passed for team `4N9TA3WSYM`, production APNs, and
`get-task-allow=false`. Build `4` artifacts remain preserved. A fresh Play API read
confirmed internal track `completed` with version code `5`; production has no release.
App Store Connect build `81f5d150-0aef-46a4-9d93-f59987419258` is `VALID`,
`IN_BETA_TESTING`, and attached to version `1.0.0` in `PREPARE_FOR_SUBMISSION`.
Its approved non-exempt encryption answer is `false`, and it is available in the
existing `Kivilo Internal` group with auto-notify enabled. No public review submission
has been made.
The matching build `5` APK was installed over build `4` on the connected Nothing
A065 with `adb install -r`; package read-back confirmed version code `5`, version
`1.0.0`. This preserves app data, but does not establish a new signed-in smoke test
or notification tap test. The completed physical capture checks above used build `4`.

Google Play's draft declarations now record Ads **No**, Government apps **No**,
Advertising ID **No**, no listed financial or health features, an 18+ target
audience, Business category, the public privacy/deletion URLs, and a private
reviewer login with optional partner-device sharing off. The IARC **All Other App
Types** rating questionnaire was saved with an Everyone/3+ result. Its Data safety
form separately discloses rent and deposit as **Other financial info**. The complete
11-type Data safety declaration was accepted through Google's documented
`applications.dataSafety` API with HTTP 204 on 2026-10-11. A fresh Play Console
dashboard showed Data safety complete and **10 of 11** setup tasks complete; only
the store listing remained. The accepted declaration is preserved in
[`store/play-data-safety.csv`](store/play-data-safety.csv), with its official sources
and verification evidence in [`store/README.md`](store/README.md).
The public deletion page now lists deleted
and retained categories, a 30-day commitment, and links to `/privacy#retention`;
the updated custom-domain page returned HTTP 200 after production deployment.
Kivilo's `Kivilo internal testers` list is saved and selected, contains only
`ixuyixuy@gmail.com`, and the internal track is Active. Its
[tester opt-in link](https://play.google.com/apps/internaltest/4701690080657531220)
is available; Play may show a temporary package name before app review. The authorized
Kivilo-only **Manage store presence** permission was saved for the existing service
account and verified after reopening its app permissions. Hopshift permissions and
account-wide permissions were unchanged. Listing text and image uploads succeeded,
but the first API commit attempts returned HTTP 403. A later attempt with explicit
draft-only flags returned HTTP 400: Google says these changes are automatically sent
for review and `changesNotSentForReview` must not be set. That staged edit was
discarded (HTTP 204), so it did not commit a listing or submit review. The Console has
a **Save as draft** action, but its asset controls were not operable through the
available browser tool; the listing remains incomplete. Approved copy and assets
remain ready locally.

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

Build `4` is on Play internal testing and internal TestFlight, and is attached to
App Store version `1.0.0`. Neither build has been submitted for public review.
Verify the installed builds on physical devices before public submission. Increase
the build number for each subsequent upload.

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
  published assessment. Never use a real unit's imagery in store metadata. For the
  current iPhone-only build, Apple requires at least one Dynamic Island medium-display
  image at `1179×2556` or `1206×2622`; its current
  [screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications)
  do not require iPad images when iPad is unsupported.
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
  On 2026-10-12, `src/lib/account-deletion.integration.test.ts` passed against the
  isolated local Supabase Auth, Postgres, and private Storage stack. It verified Auth
  removal, sole unsigned draft/media purge, shared and signed record retention,
  installation/notification cleanup, a late-arriving media object, and idempotent
  completion-email retry. The test advanced `readyAt` to simulate the three-hour wait;
  it intercepted email locally and did not delete a production account or prove
  production email delivery.
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

### Apple App Privacy answer sheet for builds 4 and 5

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
This code-derived table was checked against the form and published on 2026-10-11.
Recheck the final App Store Connect answers whenever collection practices change.
The app currently asks for names and email addresses, but does not ask for phone or
national ID numbers in its native forms. Generic free-text fields do not by
themselves require declaring every possible type someone may enter. Apple also says
data kept only on the device is not collected. The public policy covers additional
data handled by Kivilo's web service and PWA.

Sources: [Apple's data-type, linkage and tracking definitions](https://developer.apple.com/app-store/app-privacy-details/),
[Apple's App Privacy workflow](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy),
and [Firebase's iOS SDK disclosure guidance](https://firebase.google.com/docs/ios/app-store-data-collection/).

### Google Play Data safety handling answers

The selected Android data types are below. For every row choose **Collected**,
leave **Shared** unchecked, choose **not processed ephemerally**, and include
**App functionality**. Service-provider processing and expected user-initiated report
sharing fall within Google's sharing exceptions. Complete and **Save each row's
modal**, then review the preview and save the overall form; merely selecting answers
does not save them.

| Selected type | Required or optional | Additional purpose |
| --- | --- | --- |
| Name | Required | Account management |
| Email address | Required | Account management |
| User IDs | Required | Account management |
| Address | Required | None |
| Other personal info | Required | None |
| Other financial info | Optional | None |
| Photos | Optional | None |
| Videos | Optional | None |
| Voice or sound recordings | Optional | None |
| Other user-generated content | Optional | None |
| Device or other IDs | Required | None |

Do not select advertising, Analytics, App interactions or Diagnostics based on
Firebase Messaging alone. Android's installed dependencies and disclosure guidance
were audited separately from Apple's manifests; the two forms are not identical.
These answers were accepted through the official API and the dashboard completion
state was verified on 2026-10-11. The accepted CSV also declares encrypted transit,
email/password/other authentication, the public deletion URL, and no separate
data-only deletion flow without account deletion.
