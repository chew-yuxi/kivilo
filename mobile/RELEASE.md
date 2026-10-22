# Kivilo mobile release

The first listing is the complete inspector app, for Singapore, in English. Its bundle
and application ID is `one.kivilo.kivilo`. The web inspector remains available while
the native app is piloted. Build only against the production API and Supabase project;
`KIVILO_FAKE_EXTRACTION` must never be set there.

## iOS store freeze (from 19 October 2026)

**No new iOS store build, submission, cancellation or metadata change until Apple
approves `1.0.0` build `24` (submission `628f3b8a`).** Each one restarts the review
queue. App changes go out as Shorebird patches on `1.0.0+24`; anything a patch cannot
carry waits and goes to Yuxi. Full rule in `AGENTS.md` under "iOS store freeze".

## Team and property management candidate: 22 October 2026

Implemented locally, **not published**. Persistent teams include verified invitations,
roles, assignment, handover, removal with reassignment and activity. My work and Team
work use server authorization filters. Personal tenancies stay personal until explicitly
moved. Account and inspection screens lead to property settings, with Archive and a
Danger zone: eligible drafts enter a recoverable 30-day trash; protected history is
archived. Buttons have visible boundaries and navigation rows retain chevrons.

Flutter 3.47.2 analysis and all **345 mobile tests** passed, including 19 new team,
property and access-recovery regressions. Backend typecheck, lint, 107 unit and 229
integration tests, all 19 browser tests and the production build passed. Logs and
phone viewport previews are in `build/team-property-management-20261022/`; details
are in `plans/work-status.md`. There are no new plugins, bundled assets, icon glyphs, native
configuration or version changes. Normal Shorebird compatibility checks are still
required before any publication. Physical-device testing is **NOT RUN**.

The candidate requires the new agency/property lifecycle and frozen report-agent
database migrations and its matching backend before native publication. A handover
must preserve frozen report identities, and backend recovery must preserve both
explicit grants and agency membership revocation. Current stable remains Android25
patch **5** / `739033` and iOS24 patch **6** / `739038`, recorded below.

## Photo upload handoff: 22 October 2026 Singapore time

Source `f633d7f04f4d5938f7b9e47d0094381dc69881e1` is live on the production domain,
Vercel `dpl_J6uMEDrb141uZTrcaNKiLeuq9hNR`, Ready in `sin1`. Only two Dart
implementation files and two Dart test files changed from the documented consolidated
release; the backend, database, native configuration and dependencies are unchanged.

| Platform / installed release | Patch / ID | Track read-back |
| --- | --- | --- |
| Android `1.0.0+25` | **5** / `739033` | **stable**, active and latest |
| iOS `1.0.0+24` | **6** / `739038` | **stable**, active and latest |

Both were promoted from staging and read back on these exact release targets at
**08:18:15 Singapore time on 22 October**; see
`build/release-20261022-photo-handoff/stable-release.json`.

An uploaded room photo could disappear when its local card left the queue before the
refreshed server list arrived, then flash again while its new network image decoded.
The card now keeps its client identity and decoded preview through that handoff.
Upload-completion refreshes are coalesced, pending and saved rows remain one ordered
entry, and the image and annotation overlay stay aligned. Durable upload confirmation
and queue/file cleanup rules are unchanged.

Clean Flutter analysis and all **326 mobile tests** passed, including **15 new**
handoff/image regressions. The previous backend verification remains applicable.
Both platforms passed native/asset checks without overrides; bundled assets match
the original release bytes. iOS strict code-sign verification also passed. Shorebird
reported **74.2%** shared Dart code for iOS and the same possible slower-execution
warning seen on previous patches. Physical-device delivery, flicker and performance
checks are **NOT RUN**. Evidence is under `build/release-20261022-photo-handoff/`.
iOS VM-code SHA-256:
`355337c0cfc845678f916b6704d6d93ab1e10b6537b1e55bd4cae3da5f1d6029`.

Rollback baselines for this patch are Android25 patch **4** (ID `738237`) and iOS24
patch **5** (ID `738246`); preserve queued media. The earlier additive database and
explicit-grant authorization recovery rules still apply. Apple was read again at
08:13 Singapore time: `1.0.0` remains `WAITING_FOR_REVIEW`, selected build24 is `VALID`.
The store freeze remains in force; no store submission or native configuration changed.

## Consolidated release: earlier on 22 October 2026 Singapore time

Source `298f3b3e5f0763f85aa9d4c80e9ca9e5b57e2f49` was deployed to the production
domain, Vercel `dpl_2DNJ3CiT5Nzrt5dEv3Z7WboGRLLS`, Ready in `sin1`. This combined main's
single-handle inventory drawers, inventory-first capture, illustrated Home and guidance,
finding photos and markup, and explicit tenancy collaboration.

| Platform / installed release | Patch / ID | Track read-back |
| --- | --- | --- |
| Android `1.0.0+25` | **4** / `738237` | **stable**, active and latest at the read-back below |
| iOS `1.0.0+24` | **5** / `738246` | **stable**, active and latest at the read-back below |

Both were promoted from staging with the authorized go after automated checks.
Fresh read-back at **01:21:53 Singapore time on 22 October** confirms these exact
release targets, IDs and stable status (`build/release-20261021/stable-release.json`).

Both platforms were built from separate clean checkouts of the exact source with
Shorebird Flutter `3.47.2`, production configuration and existing signing setup.
Android keeps CLI `--build-number=25`; iOS keeps its export options. Native and asset
compatibility checks passed without overrides. All ten bundled assets match their
original releases byte for byte, including MaterialIcons SHA-256
`faa4e86d697b1fcedea02bc708f6c9da7c2e1dfa1f788bb90e1d2ba238cf70d2`.
The initial builds stopped at the changed icon-font check. The final source uses
existing release glyphs for camera/library controls and an accessible expanding
lesson control; the rebuilt font matches, without bundling assets or bypassing checks.

iOS strict code-sign verification also passed. As on previous iOS patches, Shorebird
warned that patched execution may be slower: this patch shares **73.7%** of Dart code
with the original release. No check was overridden; physical-device performance is
**NOT RUN**. iOS VM-code SHA-256:
`9adfc98a6d581acc7f28784af645df4425abb1f4d0ab36c57a911c9310af1ad2`.

Before pushing the backend, `20261021090000_finding_photos` and then
`20261021130000_tenancy_collaborators` were applied to production. Read-back found no
pending/failed migrations, no missing access grants and all ten existing notification
scopes correct; no team or historical-conductor grants were needed for the existing
24 tenancies and 30 inspections. The final production smoke verified bearer identity,
inspection/access/draft reads, private signed photo delivery, and identical 404s for
missing and forbidden records. It sent no email and created no application records.

Finding photos use resumable personal drafts, durable uploads and retry identifiers;
saved evidence appears in the app, web and assessment PDF (`RENDER_VERSION=7`). A
removed collaborator's unfinished personal draft keeps its rows and bytes, stays out
of publication and no longer blocks the lead's saved findings. Restoring that person's
inspection access makes the unfinished draft block publication again. New tenancies
are private; only the lead manages selected collaborators, and renewal sharing is
explicitly opt-in. Billing teams grant no access.

Verification: typecheck, zero-warning lint, production build, **105 unit**, **198
integration**, **15 end-to-end** tests with local Mailpit, clean Flutter analysis and
**311 mobile tests**. Eight PDF renderer tests passed and all five finding-photo
fixture pages were visually checked, including marks over the untouched photographs.
Stable publication after these automated checks was authorized; **physical-device
delivery and every interaction/rehearsal check are NOT RUN**. Receipts and logs are in
`build/release-20261021/`, with final patch artifacts under each platform's `final/`.

Rollback baselines are Android25 patch **3** (ID `734030`) and iOS24 patch **4**
(ID `734035`). Roll back only a newly published patch if needed and preserve queued
media. Keep the additive migrations. Backend recovery must retain explicit-grant
authorization: restoring the old team-based rules could restore revoked access.
Apple still reports `WAITING_FOR_REVIEW` for `1.0.0` build24; no store binary,
submission, metadata, screenshots, version or minimum-build floor changed.

## Illustrated onboarding: included in the consolidated release

The native Home, handover guide and empty states load public decorative artwork from
`<API_BASE origin>/illustrations/<content-hashed filename>.webp`. The eight files in
`public/illustrations/` and the narrow cache header in `next.config.ts` are live on
`https://kivilo.nottoosweetlabs.com`, deployed automatically by Vercel after commit
`ddb4012a61a747fab81c86197468645ea508c492` was pushed to `main` on 21 October 2026.
All eight URLs were verified without a session: HTTP 200, `image/webp`, exact hashes,
preserved transparency and `Cache-Control: public, max-age=31536000, immutable`.
Production deployment: `7221229836` (GitHub), Vercel `9bkzYZALRdaRR5sXBnJt8iyUFeWn`.
Keep previously published hashed files: older installed versions still reference
them. These are public brand images; property evidence remains in the private
captures bucket.

Original PNGs live in `mobile/design/illustrations/`, outside the app bundle and public
hosting. Regenerate the 192px thumbnails and 768px artwork from the repository root
with `pnpm exec tsx scripts/optimize-illustrations.ts`; sizes, dimensions and hashes
are recorded in `mobile/design/illustration-assets.json`. Update the native rendition
map when artwork changes. WebP preserves transparency and strips metadata. The app
uses disk and memory caching, limits decoded pixels to the displayed size, and keeps
the guidance and actions available if an illustration cannot load.

No images, plugins or configuration are added to the installed app bundle. This
removes the bundled-asset obstacle to a Dart-only Shorebird patch; normal native,
asset and icon compatibility checks still apply, with no overrides. Yuxi authorized
publication on 21 October after artwork deployment. The hosting commit was built on
then-current production/main `292a0b5` in a clean worktree and contains only the eight
WebPs and their cache header. Native design and inventory-first room changes are
included in the consolidated release recorded above.

The earlier unified native tree passed Flutter analysis and all **276 mobile tests** on
21 October, including the inventory-first capture/markup tests and 12 artwork-cache
tests. The source icon checks against iOS `7161f53` and Android `ce0d8e3` printed
nothing. Those source checks did not detect the changed tree-shaken font from the
lesson control; the consolidated release above records the correction and actual
byte-for-byte asset checks. Native configuration, dependencies and version are unchanged.

## Inventory-first room capture: included in the consolidated release

Rooms now lead with inventory. Opening an item shows its details and media; new
photos open the mark editor immediately and attach to that item automatically.
Room walkthroughs and existing media remain available through the secondary room
media action. Room review checks pending photos and edits before finishing capture.

The original photo is saved locally before editing. Completed marks autosave beside
it, and upload waits for Save photo; an interrupted editor resumes through Finish
marking. Queue schema 7 preserves the item ID and this hold across restarts. Picker
intake also preserves the original owner/room/item and the entire library selection.

The backend's optional capture `itemId` and `itemApplied` acknowledgement are included
in `292a0b5`, the parent of the live hosting deployment `ddb4012` recorded above. No
server migration, plugin, native configuration, version or bundled asset change is
needed for inventory-first capture itself. It is included in the consolidated patch
above alongside the separately migrated finding-photo and sharing features. The iOS
review freeze remains in force.

Earlier verification: clean Flutter analysis, 238 mobile tests, server typecheck/lint/build,
98 unit tests and 160 integration tests. All 14 end-to-end cases passed, with one
email-code timing failure passing on retry. Physical-device interaction is unverified.

## Current releases: 18 October 2026 Singapore time

Android production build `25` is published. Google approved it after submission;
the final Console Publish action was completed on 18 October, and the lifecycle API
confirms `RELEASE_LIFECYCLE_STATE_PUBLISHED` for production and internal testing.
Earlier that day, build `23` also needed its final Publish action despite the edits API
saying `completed`; always verify the lifecycle. Stable patches `5` (Android) and
`6` (iOS) remain live for installed build `23`. Both minimum-build floors are unchanged.

iOS `24` is submitted and still `WAITING_FOR_REVIEW`. Backend `86d7bbc` was deployed
in `sin1` before these releases, with the check-in reference migration and earlier
renewal, usage-event and upload-intent migrations applied. Verification at that source:
typecheck, lint, production build, 90 unit tests, 128 integration tests, 13 end-to-end
tests, clean Flutter analysis and 182 mobile tests.

## Rich check-out finding chooser: 20 October 2026

Source `4e5fe87` is live on the server (Vercel `dpl_Bi4JoUcCw3TLUYtUc4fE71ye1sjt`,
Ready in `sin1`). No migration is required. Android `1.0.0+25` patch **3** (ID `734030`)
and iOS `1.0.0+24` patch **4** (ID `734035`) are **stable**, published under Yuxi's
“let's give it a go” for this finding-flow change. Both were built from detached
checkouts of that exact source with Shorebird Flutter `3.47.2`, with Android CLI
`--build-number=25`. Both passed native and asset checks without overrides; no new
icons, plugins, pubspec/version changes or store uploads. Apple's existing build24
submission still reads `WAITING_FOR_REVIEW` and was not changed.

Add finding now opens a full-page searchable item chooser. Room filters and rich cards
show assigned photos, serial/meter details, quantity, notes and frozen agreed check-in
versus current check-out condition. The check-in side covers missing items. Item and
room identities are exact IDs/keys, including renamed rooms and repeated item names.
Selecting a line opens the form with its context retained and optional inline details;
change and verdict choices are visible chips. Search, filters and entered text survive
changing the selected item. The save action stays visible above the keyboard. Failed
save/remove requests keep the form open, duplicate taps are blocked, and completion
closes the editor's own route. Photo navigation is disabled while saving.

The inspection API keeps the old `id`/`label` fields and adds the richer context. It
independently authorizes the check-in, uses frozen room references and explicit line
photo IDs, and batch-signs at most two linked, room-local, reviewed photos per source
and item. Legacy snapshots never guess which room photos show an item.

Checks: typecheck, lint, production build, **98 unit**, **156 integration**, **14 e2e**,
clean Flutter analysis and **214 mobile tests** (10 new behavior tests). This includes
320×568 at 1.5× text with the keyboard open, tablet layout, matched photo sources/marks,
missing items, retained drafts and failed-save retries. A real local private photo was
also batch-signed and read successfully. Rendered phone/tablet fixture previews are in
`build/release-artifacts/finding-picker-4e5fe87/`; their demo-photo placeholders are
intentional. Physical-device delivery and interaction remain unverified.

iOS shared 82.3% of code with the release and emitted the existing possible slower
execution warning; no compatibility check was bypassed. Artifacts and stable receipts:
`build/release-artifacts/ios/build24/finding-patch4/` and
`build/release-artifacts/android/build25/finding-patch3/`.
iOS VM-code SHA-256:
`58c887ae58df74bfcb5949368d392ba11b11a64b10dfd21a7aca9d371ebe459f`.

## Deposit statement, report check and review editor: 19 to 20 October 2026

Source `3e85462` is pushed and live on the server. Vercel deployment
`dpl_78c9gPeQWCz89PZnyENNHZXSvd1m` is Ready in `sin1` on the custom domain. Migrations
`20261019090000_issued_report_files` and `20261019100000_assessment_responses` were
applied to production first. Server side: the deposit statement (both parties agree or
dispute the published assessment's deductions), the public `/verify` report check, the
web review editor as expandable rows, folded check-out lines with their check-in photos,
and the inspection page's next-step card.

**Staging** Android `1.0.0+25` patch **2** and iOS `1.0.0+24` patch **3**, built from
separate detached worktrees of `3e85462` with Shorebird Flutter `3.47.2`, Android with
CLI `--build-number=25`. Both passed native and asset checks without overrides, and the
icon check against `ce0d8e3` and `7161f53` printed nothing. iOS shared 86.0% of Dart
code with the release (warning only, as patch 2 did at 87.7%). The app change is the
deposit statement on the report screen: a party agrees or disputes, and the agent takes
either party's answer in person. **Promoted to stable on 20 October 2026** with Yuxi's
go, without a phone check: Android patch 2 is ID `729781`, iOS patch 3 is ID `729792`,
and `shorebird patches list` reads both back as `stable`. Physical-device delivery is
unverified. iOS `24` is still in review, so App Store users on `23`
cannot receive this; they answer on the web. Logs are in
`build/release-artifacts/android/build25/statement-patch2/` and
`build/release-artifacts/ios/build24/statement-patch3/`.

Verification at the source: typecheck, lint, production build, 98 unit, 150
integration, 14 end-to-end tests, clean Flutter analysis and 204 Flutter tests.

## Tenant handover, move-in notices and native usage: 18 October 2026

Source `18bb3f1` is pushed and live on the server. Vercel deployment
`dpl_7DBrHUYpF2aKHUtc2VJ6SWmVBZnq` is Ready in `sin1`; the custom production domain
serves the new authenticated handover routes. Migration
`20261018120000_move_in_defects` was applied before the deployment.

Stable Android `1.0.0+25` patch **1** (ID `728132`) and iOS `1.0.0+24` patch **2**
(ID `728133`) were built from separate detached checkouts of this exact source using
Shorebird Flutter `3.47.2`. Android preserves CLI `--build-number=25`; the pubspec stays
`1.0.0+24`. Both passed native and asset compatibility checks without overrides, and
neither uses a Material icon absent from its original release. Fresh metadata confirms
both patches on stable. No store binary, version or minimum-build floor changed.

The tenant's first check-in signature now provides a safe handover QR and queues a
deadline email. The per-tenancy window defaults to 30 inclusive Singapore calendar days,
configurable before that signature. A tenant can flag a repair as present at move-in,
finish its durable photo uploads, and publish a dated notice beside the signed report.
Only the landlord's own account can agree or dispute it. Pending/disputed notices do
not enter the agreed check-in. Condition-only notices preserve one physical item's
identity and all accepted descriptions; stale claims cannot overwrite replacements.
Check-out and finding comparisons use their frozen agreed condition.

Native analytics records only approved screen categories, with bounded per-account
queues, verified account ownership and release/patch metadata. It records visible
routes and selected tabs, excluding rebuilds and dismissed field dialogs.

Verification: typecheck, lint, production build, **98 unit**, **145 integration**,
**14 end-to-end** tests, clean Flutter analysis and **201 Flutter tests**. Real local
Storage, emailed OTPs and the landlord's web account are exercised by the end-to-end
flow. Android's three signed ABIs also contain the new feature markers, versionCode25
and none of the four removed broad media permissions.

Physical-device delivery and performance remain unverified. The iOS linker shared
87.7% of Dart code with the original release and warned that patched execution may be
slower; it passed compatibility checks. Evidence, logs and patch debug artifacts are
in `build/release-artifacts/ios/build24/handover-patch2/` and
`build/release-artifacts/android/build25/handover-patch1/`. iOS VM-code SHA-256:
`1bca4a42dc4072604876d6bcd64ca4d5b5beb538847e22bfdf626b2c66e0c4da`.
Apple's existing build24 submission still reads `WAITING_FOR_REVIEW`.

## iOS build 24: native iPad support

On 18 October 2026 Singapore time, iOS `1.0.0+24` was built from `7161f53` in a pinned
worktree with the production configuration and Shorebird's Flutter `3.47.2`.
Shorebird release `905978` is active for iOS. App Store Connect build
`4609e2e1-a6d9-490c-980e-537401caf84a` is `VALID`, declares
`usesNonExemptEncryption: false`, and is available in the existing `Kivilo Internal`
TestFlight group.

Public version `1.0.0` now selects build `24`. The earlier build-23 review submission
was canceled, and submission `628f3b8a-64c9-43fe-bc57-3305e6d25aa6` was sent at
`2026-10-18T00:24:54.107Z`; live read-back is `WAITING_FOR_REVIEW`.
The required genuine 13-inch iPad screenshot is
`store/assets/ios/ipad13-build24.png` (2064×2752), captured from exact source
`7161f53` against production using the synthetic Apple reviewer account. SHA-256:
`2258a570b6f5910b92732a1f4c6ef8e5d9c2192e477f3f1842f3cb31cd77df69`.
Apple screenshot `36000019-6980-8c3e-8004-39b3ae6169d6` in the
`APP_IPAD_PRO_3GEN_129` set has delivery state `COMPLETE`.

This build supports iPhone and iPad natively (`UIDeviceFamily=1,2`). Tablet windows
use sidebar navigation, property and room grids, and room inventory beside a bounded,
lazy evidence grid. Capture controls sit beside a lazy media list. Forms and reports
have readable widths; signature pads grow while retaining their drawing coordinates.
Narrow Split View retains the phone layout. Resizing preserves loaded data, entered
details, the selected tab, capture mode and signatures.

Build `24` adds native PDF viewing and sharing (`open_filex` and `share_plus`). The
signed report card offers View PDF, Share PDF and Share link; Share PDF downloads the
actual document and gives the share sheet a local attachment. Signed storage URLs
are never shared. The card no longer offers Revoke. These plugins and the iPad target
require a new store binary; do not patch this source onto build `23`.

Also included: Take another photo is the main capture action; Review room stays disabled
until that room's queued uploads and changes finish. Renewal cards appear immediately
three months before tenancy end, with Start renewal, Not renewing, a one-week snooze,
and Dismiss. The server supplies furniture rows and Pro's 10 properties per seat.

The original binary's analysis and 178 tests passed, including 18 tablet regressions.
The simulator build compiles. The IPA passes strict code-sign verification: Apple
Distribution for team `4N9TA3WSYM`, `aps-environment=production`,
`get-task-allow=false`, and all four iPad orientations. Physical iPad use and the full
signed-report sharing flow on a physical device remain unverified.

A separate native-plugin harness also passed one XCUITest on an iPad Pro 13-inch
simulator: `OpenFilex` returned success and QuickLook displayed a synthetic local PDF;
`share_plus` opened an anchored PDF popover with its 691-byte attachment and a separate
link popover. Both were dismissed without sending. This tests real native plugin
mechanics, not the signed-report backend flow. A second native XCUITest verified the
actual capture screen with a synthetic pending upload: Review room stayed disabled
and the upload-wait explanation remained visible. Screenshots, provenance and the
limits of both probes are archived at
`build/release-artifacts/ios/build24/simulator-qa/summary.json`.

The IPA is `build/release-artifacts/ios/build24/kivilo.ipa`, SHA-256
`ae9a28ca5646273b003c6939e9539ed9f330e1d83d07814d2d80a2ae69f59ca9`; matching dSYMs
and upload evidence are archived beside it.

### iOS 24 stable patch 1: check-in reference

Patch `1` (ID `727778`) for iOS `1.0.0+24` was built from `86d7bbc` and promoted to
stable on 18 October. Check-out rooms now show their frozen At check-in reference,
including item baseline keys and acknowledged update labels. All 182 Flutter tests
and analysis pass. This is Dart only; native/configuration compatibility checks passed
without overrides, and the icon check printed nothing. The patch artifact's VM-code
SHA-256 is `600b85857e3050387f0c197d7d02b2892161d611655fbabd011c72c80a66b7a3`.
The binary without the patch remains compatible with the additive server response.

## Android build 25: native sharing and tablets

Android `1.0.0+25` was built from `ce0d8e3` in a clean pinned worktree with the
production configuration and Shorebird Flutter `3.47.2`, using `--build-number=25`.
The source pubspec remains at `1.0.0+24`; preserve the actual CLI build number when
patching. Shorebird release `906190` is active for Android.

This contains the iPad-era responsive layouts, native sharing, capture/renewal changes
and check-in reference from `86d7bbc`. Build `24` was uploaded but its Play edit failed
validation: `open_filex` had merged unused broad storage/media permissions. That edit
(`01665508438676412502`) was discarded. Commit `ce0d8e3` removes
`READ_EXTERNAL_STORAGE`, `READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO` and
`READ_MEDIA_AUDIO` from the merged manifest; Kivilo uses its own cached PDF and the
system photo picker. Version `25` avoids reusing the uploaded build/release number.

The signed build-25 merged manifest confirms none of those four permissions, package
`one.kivilo.kivilo`, target SDK 36 and the expected upload certificate. All three ABIs
are present. Flutter analysis and all 182 tests pass. AAB:
`build/release-artifacts/android/build25/kivilo-v25.aab`, SHA-256
`45fbc047bf3bef6754c4cd993a18284ded49c774f8f7973b330f94a0b66e9fe5`.

Play edit `06562556097228654965` validated and committed at
`2026-10-18T00:24:39.605Z`. Google accepted the matching artifact hash. The lifecycle
API initially confirmed internal `25` published and production `25` in review.
After Google approved it, the final Console Publish action was completed on 18 October.
Fresh lifecycle read-back confirms production `25` is `PUBLISHED` and supersedes `23`;
internal `25` remains published. Publication evidence is archived beside the AAB.

## Build 23

Build `23` makes Shorebird updates user-controlled. At launch Kivilo checks for a patch,
covers the app when one is available, and downloads it only after the inspector taps
Update. Once Shorebird confirms the patch is staged, Kivilo posts a local notification
and terminates the process; tapping the notification starts the staged code. A patch
already downloaded shows the same blocking restart step. A required store release still
takes precedence over a Shorebird patch, and an offline patch check fails open.

This needs a store release rather than a patch because it disables Shorebird's bundled
automatic updater and adds the native `flutter_local_notifications` plugin. Build `22`
continues using automatic background updates. Do not raise either server-held minimum
build floor until build `23` is live in that platform's public store. Flutter analysis
and all 131 mobile tests pass; Android and iOS simulator debug builds both compile as
version `1.0.0 (23)`. Physical-device notification and Shorebird patch delivery still
need release-candidate testing before upload.

Shorebird release `1.0.0+23` was made from `aff8443` and is on Play internal testing
(`completed:23`) and TestFlight (build `b977a04e-5404-4eb1-99e8-445556531850`, `VALID`).
Patch `1` (Android) and patch `2` (iOS) on the staging track for `1.0.0+23`, built from
`7351d59` in a pinned worktree: the check-in form asks whether the property is fully
furnished, Account shows the workspace's plan, and the refresh helpers no longer return a
Future from `setState`. The server was deployed first from `0229f2c`. The icon check
against `aff8443` caught `workspace_premium_outlined`, absent from 23's font, and the
Plan card now uses `verified_outlined`. Never patch `1.0.0+22` from this code: its update
screen needs `flutter_local_notifications`, which build `22` does not carry.

Patch `3` (Android) and patch `4` (iOS) on the staging track for `1.0.0+23`, built from
`09e9e48` in a pinned worktree: the agent can email each party their signing link from the
signature tiles, and the report screen shows dated updates to a signed report with an
Acknowledge action for the landlord and tenant, reached from notifications and from a
resolved repair's "Add to the report as an update". The server was deployed first
(`ca0037a`, migrations `20261016100000_email_signing` and `20261016110000_report_addenda`).
The icon check against `aff8443` printed nothing, and nothing outside `mobile/lib` changed.

Patch `5` (Android) and patch `6` (iOS) on the stable track for `1.0.0+23`, built from
`6204ed4` in a pinned worktree, superseding `3` and `4`: agents write, discard and publish
updates to a signed report in the app (photos through the upload queue), a party present
can acknowledge an update in person on the agent's phone, an update's push opens its
report, and picked photos are checked to be JPEG by their bytes. The server was deployed
first, with migration `20261017100000_acknowledgement_method`. The icon check against
`aff8443` printed nothing, and nothing outside `mobile/lib` changed.

Both patches were promoted to stable on 17 October 2026 with the owner's approval.

## Current store candidate: 2026-10-13 Singapore time

Build `22` is the first build that can be patched over the air and the first that can be
retired. It was made with `shorebird release` on both platforms (Shorebird release
`1.0.0+22`, Flutter 3.47.2), so Dart-only fixes can now reach it without a store review;
see "Over-the-air patches". Below a server-held minimum build it covers every screen with
"Update Kivilo" and a store link; see "Retiring an old build". The urgent services screen
lists placeholder Kivilo partners instead of reading `/api/v1/service-providers`. It adds
the native `package_info_plus` plugin.

Build `22` source is `b16da52` on `main`. Flutter analysis is clean and all 91 mobile
tests pass; backend typecheck, lint and all 44 unit tests pass. The AAB was built with
`--dart-define-from-file=env.json` against the production configuration and signed with
the established upload key (`CN=Kivilo Upload`, certificate SHA-256
`6d2be9b2745ce98abdace4162a20722a57305b3cd95df4e73958ea1692e836e7`); `jarsigner -verify`
passes. There is no APK: a `flutter build apk` would carry no updater, so the test phone
gets this build through `shorebird preview` or the internal track. The IPA passed strict
`codesign` verification: bundle `one.kivilo.kivilo`, version `1.0.0` build `22`, Apple
Distribution for team `4N9TA3WSYM`, `aps-environment=production`,
`get-task-allow=false`, exported with `ios/ExportOptions.plist`. This build was not
installed on a physical device before release.

The backend route `/api/v1/app-config` is deployed from `18afb88` (Ready in `sin1`) and
answers with both floors at `0`, so no build is retired yet.

Play internal testing serves `completed:22` and the production track still reads
`completed:13`. The signed iOS build `22` uploaded under delivery
`d4ea7d4a-a6f2-4114-acba-2f0778637eca`, which is also its App Store Connect build ID. It
is `VALID`, declares `usesNonExemptEncryption: false`, and is attached only to the
existing `Kivilo Internal` TestFlight group. Apple's public build `12` submission
remains `WAITING_FOR_REVIEW` and Play production remains build `13`; neither has been
replaced with build `22`.

- Android 22 AAB `build/release-artifacts/android/build22/kivilo-v22.aab`, SHA-256
  `3ff514f906822ae3a6636025382196ad1413483dc789c674dd597f3a5ea35e2a`.
- iOS 22 IPA `build/release-artifacts/ios/build22/kivilo.ipa`, SHA-256
  `7f872a582ade3ef0065b2b312a767a34390c797f555529427a700135fed43319`.

Shorebird patches on release `1.0.0+22`, both on the stable track while `22` is only on
the internal tracks, built from `59af396` with `--allow-asset-diffs` for the tree-shaken
icon font: patch `1` (Android) and patch `2` (iOS). The property card actions read
`Resume` and `Maintenance` without icons; the chosen option of every segmented toggle is
filled pink with white text; the photo mark toolbar puts the shapes on one row and
labelled Undo and Redo on the next. Flutter analysis is clean and all 91 tests pass.

Patch `3` (Android) and patch `4` (iOS) on `1.0.0+22`, built from `12155d0`: user-facing
"evidence" now reads "media"; a room lists its inventory before its media, and the
media strip runs newest first with a toggle, each capture keeping its number; the
property timeline from `b3d9ede` ships here, with `history`, `logout_outlined` and
`task_alt` standing in for three icons build `22` does not carry. Flutter analysis is
clean and all 94 tests pass.

Patch `5` (Android) and patch `6` (iOS) on `1.0.0+22`, built from `0644bbf`: plain
language throughout. `plainError` in `lib/services/api_failure.dart` is the only way an
error becomes text on screen, so no raw exception reaches an agent; sync reads as upload,
a capture as a photo or video, edits as changes. Flutter analysis is clean and all 97
tests pass.

Patch `7` (Android) shows `Version 1.0.0 (22) · Patch N` under Sign out on the account
screen, from `be29cbb`. Patch `8` (Android) and patch `9` (iOS), built from `4b4ba4d`, add
that line on iOS and roll the upload card's percentage and bytes with NumberFlow; the
upload and walkthrough bars glide to each value. Both still on reduce motion. An iOS
attempt for `be29cbb` hung in the Xcode build and was stopped unpublished. `main` was
fast-forwarded by another session to `6902969` while patch `9` built; its compiled Dart
is timestamped before that merge and carries none of the report branding strings, and
does carry `4b4ba4d`'s, so `9` matches `4b4ba4d`. Flutter analysis is clean and all 99
tests pass.

Patch `10` (Android) and patch `11` (iOS) on `1.0.0+22`, built from `7822486` in a
pinned worktree: report branding and the report PDF. Account gets a Report branding card
and drawer (your name, agency name, licence, CEA registration, phone, logo from the photo
library); a signed inspection gets Download PDF beside its share link, opened in the
phone's own viewer. The server half was deployed first (`6902969`). The icon check
caught `picture_as_pdf_outlined` and `storefront_outlined`, which build `22` does not
carry; `description_outlined` and `store_rounded` stand in. Both compiled binaries were
checked for the new screens' strings. The Android build needs the `KIVILO_UPLOAD_*`
variables even for a patch: without them Gradle stops in under a second and nothing is
published. Flutter analysis is clean and all 101 tests pass.

Patch `18` (Android) and patch `19` (iOS) on the stable track for `1.0.0+22`, built
from `5622ad3` in a pinned worktree: reviewed and in-progress room cards now show the
latest room photo (or video poster), and every inventory item shows its attached photo
and video previews even after review freezes the report. The API support was deployed
first as Vercel deployment `dpl_6qMQuSXdJv4RqyqLZeCw9M7VHvMu`; the production endpoint
responds from `sin1`. The release icon check found no glyph absent from build `22`.
Flutter analysis is clean and all 128 mobile tests pass; backend typecheck, lint, build,
56 unit tests and 78 integration tests pass. The relevant native API end-to-end flow
also passes. Shorebird reported 60.1% Dart code sharing while linking the iOS patch; it
still verified applicability, signed build `1.0.0 (22)`, and published the patch.

Patch `20` (Android) and patch `21` (iOS) on the stable track for `1.0.0+22`, built
from `3d89542` in a pinned worktree: room cards replace the single leading thumbnail
with a bottom strip of up to four recent photos or video posters. The API keeps the
single `previewUrl` for patches `18` and `19` and adds `previewUrls` for this version.
The API was deployed first as Vercel deployment `dpl_DphSCYJh8Ye6ojobNWaBk8Edowt1`.
Flutter analysis, the focused reviewed/unreviewed room-card tests, backend typecheck and
lint pass. The release icon check found no glyph absent from build `22`. Shorebird again
reported 60.1% Dart code sharing while linking iOS, then verified applicability, signed
build `1.0.0 (22)`, and published the patch.

Patch `22` (Android) and patch `23` (iOS) on the stable track for `1.0.0+22`, built
from `f158464` in a pinned worktree: saved rings, arrows and freehand marks now render
over the untouched photograph in the room-card strip, room media, attached inventory
media, inventory editor and full-screen room viewer. The shared contained-image renderer
keeps the mark and photograph in one box so their geometry cannot drift. The API adds
annotation-aware `previewMedia` while retaining the older preview fields. It was deployed
first as Vercel deployment `dpl_Gf7ENLsHyriw5zqiLWPWp1NFsBxM`. Flutter analysis and all
128 mobile tests pass; backend typecheck and lint pass. A read-only production audit
confirmed the completed Ardmore Park demo already holds one marked capture. Shorebird
reported 59.8% Dart code sharing while linking iOS, then verified applicability, signed
build `1.0.0 (22)`, and published the patch.

Patch `24` (Android) and patch `25` (iOS) on the stable track for `1.0.0+22`, built
from `4506fa8` in a pinned worktree: every new check-in field now says whether it is
required or optional, tapping outside a field dismisses the keyboard, and the Create
check-in action moves above the keyboard so a number pad cannot block completion.
Flutter analysis is clean and all 128 mobile tests pass. The release icon check found
no glyph absent from build `22`. Shorebird reported 59.8% Dart code sharing while
linking iOS, then verified applicability, signed build `1.0.0 (22)`, and published the
patch.

Build `21` plays video evidence inside the app with `video_player` instead of opening
the signed storage link in the phone's browser, and a video still in the upload queue
plays from the file on the phone. Every video tile shows a poster frame with a play
badge. The server makes the poster (cron `/api/internal/posters`, ffmpeg) about a
minute after upload, and the tile falls back to the camcorder icon until it exists; all
14 existing production videos already have one. Maintenance photos and videos also open
inside the app. Room screens renew signed URLs older than 45 minutes, so images no
longer break after an hour.

Build `21` source is `b442f98` on `main`, which contains the mobile changes from
`b95d1ca`; only the build number changed for this release. The backend for it is
deployed from `b442f98`, with migration `20261013090000_capture_poster` applied to
production. Flutter analysis is clean and all 82 mobile tests pass. The AAB and APK were
built with `--dart-define-from-file=env.json` against the production configuration and
signed with the established upload key (`CN=Kivilo Upload`, certificate SHA-256
`6d2be9b2745ce98abdace4162a20722a57305b3cd95df4e73958ea1692e836e7`, identical to build
`20`); `jarsigner -verify` passes on the AAB, `apksigner verify` passes on the APK (v2
scheme), and the APK declares `one.kivilo.kivilo` version code `21`, target SDK 36. The
IPA passed strict `codesign` verification: bundle `one.kivilo.kivilo`, version `1.0.0`
build `21`, Apple Distribution for team `4N9TA3WSYM`, `aps-environment=production`,
`get-task-allow=false`. This build was not installed on a physical device before
release.

Play internal testing serves `completed:21`, with release notes describing in-app video
playback, poster frames and the renewed image links; the same edit confirmed the
production track unchanged. The signed iOS build `21` uploaded under delivery
`6290ebd0-98c4-492e-bba2-9c6777015847`, which is also its App Store Connect build ID.
It is `VALID`, declares `usesNonExemptEncryption: false`, and is attached only to the
existing `Kivilo Internal` TestFlight group.

Play production remains build `13` and Apple's public build `12` submission remains
`WAITING_FOR_REVIEW`.

- Android 21 AAB `build/release-artifacts/android/build21/kivilo-v21.aab`, SHA-256
  `4b8974161f1a0117defe780edd20051a3c007fec521b2769e9d9dcf346bea98c`.
- Android 21 APK `build/release-artifacts/android/build21/kivilo-v21.apk`, SHA-256
  `1c3b74d842cb9a7071d28ed8c11d084ad1723689173253cf84672234468ca84f`.
- iOS 21 IPA `build/ios/ipa/build21/kivilo.ipa`, SHA-256
  `8e9bb57993a215cfccb3cba4a97c82dc492361c44e80a88ba44e58d7e6f17711`.

Build `20` removes AI drafting from the app. After capturing a room the inspector taps
`Done capturing`, then writes that room's inventory by hand; a room cannot be marked
reviewed until it has at least one item. Check-out findings are added, edited and
removed by hand, and the `Draft comparison` action is gone. The Gemini consent drawer no
longer appears. The production backend at `kivilo.nottoosweetlabs.com` already serves
this flow and keeps compatibility fields so builds `19` and earlier still load, but
those builds still show the consent drawer and a `Draft comparison` button that no
longer works.

Build `20` source is `da10c7f` on `main`, which contains the mobile changes from
`7eebff8`; only the build number changed for this release. Flutter analysis is clean
and all 68 mobile tests pass. The AAB and APK were built with
`--dart-define-from-file=env.json` against the production configuration and signed
with the established upload key (`CN=Kivilo Upload`, NotTooSweetLabs Pte. Ltd.,
certificate SHA-256 `6d2be9b2745ce98abdace4162a20722a57305b3cd95df4e73958ea1692e836e7`,
identical to build `19`); `jarsigner -verify` and `apksigner verify` pass, and the APK
declares `one.kivilo.kivilo` version code `20`, target SDK 36. The IPA passed strict
`codesign` verification: bundle `one.kivilo.kivilo`, version `1.0.0` build `20`, Apple
Distribution for team `4N9TA3WSYM`, `aps-environment=production`,
`get-task-allow=false`. This build was not installed on a physical device before
release.

Play internal testing serves `completed:20`, with release notes describing the manual
inventory and findings flow; the same edit confirmed the production track unchanged.
The signed iOS build `20` uploaded under delivery
`f7bb16b1-05bc-483a-b7e0-37347105195f`, which is also its App Store Connect build
ID. It is `VALID`, declares
`usesNonExemptEncryption: false`, and is attached only to the existing `Kivilo
Internal` TestFlight group.

Play production remains build `13` and Apple's public build `12` submission remains
`WAITING_FOR_REVIEW`. Both still contain the old AI consent and drafting flow; the
backend keeps them working through its compatibility fields.

- Android 20 AAB `build/release-artifacts/android/build20/kivilo-v20.aab`, SHA-256
  `8add617f1c58999033de29bca5a4407c3553bd5a18358568ab55086fd32f37a8`.
- Android 20 APK `build/release-artifacts/android/build20/kivilo-v20.apk`, SHA-256
  `5c3d2426f7087594d014dc086d60cdbc80937899f7fb1be06a789b7eb10af6cc`.
- iOS 20 IPA `build/ios/ipa/build20-final/kivilo.ipa`, SHA-256
  `7a0a42440b8d66e35859178365012c48f0315061a4132a09673e4a6f393be4c8`.

Build `19` balances the property-card actions. Resume and Maintenance now occupy equal
widths and use the same 50px control height; Resume is the pink primary action and
Maintenance is the outlined secondary action. Evidence actions align to the drawer
grid, and the photo-note drawer has a back action that returns to the evidence menu.
The mark editor adds full undo and redo history across drawing, redraws, note edits and
deletions. Inventory items can attach several room photos or videos from their edit
drawer; cards identify their attached and marked evidence, while capture notes and
vector marks remain on the original evidence. The API validates that every attachment
belongs to the item's room and freezes those links with the rest of a signed report.
Room evidence now keeps the same signed media URL while processing polls, preventing
the flashing thumbnails seen in build 18. Tapping any evidence opens a full action
drawer for preview, note editing, photo markup, or deletion, with a back path from note
editing. Uploads show their current stage, percentage, and transferred bytes, and native
camera video handoff waits for the provider file before copying it into durable app
storage. Gemini quota failures use a concise recovery message instead of displaying the
provider's raw response; captured evidence remains available for review and retry.

Build `19` source `d84fa59` is on `main`. Migration
`20261012123000_item_evidence` is applied to production, and deployment
`dpl_CaJVhbHCWxU4rLvggqvocyn7XmP5` is `READY` in `sin1` and aliased to
`kivilo.nottoosweetlabs.com`. The signed APK was installed on the physical Nothing
phone against production; the synthetic room loaded 73 captures and tapping a photo
opened Preview, Edit note, Mark photo, and Delete evidence actions. Play internal
testing serves completed build `19`; Play production remains build `13`. The signed
iOS build `19` uploaded successfully under delivery
`058f2dec-3803-439f-8d69-f81a7662363c`; it is `VALID` and attached to the `Kivilo
Internal` TestFlight group.
Flutter analysis and all 68 mobile tests pass, along with backend typecheck, lint,
production build, all 60 unit tests, all 38 integration tests, and all three Playwright
workflows. The Android AAB SHA-256 is
`0c0ee11ef4b119bcde0e3fe60de396b194a5d22ae21f8705577d1bc7fb5d5aa5`; the APK
SHA-256 is `75473dd420baf1f8c08189132d5b45d75155bf29c158d3082d6bcb7446446029`.

Build `18` (source `f44df49`) fixes property navigation. Inspection list responses now
carry their actual tenancy ID, and the app uses that relationship to show the active
handover on each property card. Tapping a property with an active inspection, or its
explicit `Resume check-in` / `Resume check-out` action, opens that inspection.
Maintenance is a separate, labelled action. The maintenance page now identifies itself
as Property care, links its emergency panel to the urgent-service directory, uses proper
empty-state cards, and replaces the ambiguous house-plus icon with a labelled Add asset
action. Older cached inspection responses remain readable during an offline app upgrade.

The signed build was installed on the physical Nothing phone against production. Its
property cards displayed the correct active check-in from the server, and tapping
`Resume check-in` opened that exact inspection. Play internal testing serves
`completed:18`; Play production remains build `13`. Production deployment
`dpl_7tTQDvc46NuSKLTrRaNk1E4b3zeb` is `READY` and aliased to
`kivilo.nottoosweetlabs.com`. Flutter analysis and all 67 mobile tests pass, along with
backend typecheck, lint, production build, all 60 unit tests, all 37 integration tests,
and all three full Playwright workflows. The Android AAB SHA-256 is
`1fd7213e75706f7136f6fd554f869b0a34823b3a5983f8250f21edfebb416c25`; the APK
SHA-256 is `64b93242480f4ace537058e999125d6f3e2a457ba6e2cdc886ca7c09993ef864`.
App Store Connect build `7fcfc648-0f18-4ca7-8b12-1a081264d77d` is `VALID`, declares
`usesNonExemptEncryption: false`, and is attached only to the existing `Kivilo
Internal` TestFlight group. Its IPA SHA-256 is
`6b9abcc2cf1a6dbaca2104693019bf2e07b640ecaec3d65e77c6bf764bf4aadb`. Apple's
public build `12` submission remains `WAITING_FOR_REVIEW`.

Build `17` (source `dfd666e`) replaces the remaining stock Material segmented buttons
with one Kivilo control: a quiet canvas rail, 16px corners, a white selected surface,
pink emphasis, subtle depth, and 48px touch targets. The photo/video mode, markup tool,
maintenance priority, and service filters now share the same treatment. Existing
photo-mark chips use the same borders, selection colour, corner radius, and type weight.
Flutter analysis and all 67 mobile tests pass. The signed build was installed on the
physical Nothing phone, where the full-width photo/video selector and both selected
states were visually and functionally verified. Play internal testing serves
`completed:17`; Play production remains build `13`. The Android AAB SHA-256 is
`ec4ebbd313a2eb20871149ef211b915d29114651526f357e016fa44e1c9b1bb4` and the APK
SHA-256 is `e3fada5dc90e016d502de7d4db7f8fe0a42ac40db76ab9be0b044c2007f97359`.
App Store Connect build `7fc70242-ce09-4f96-baa9-5a1f1f3999b1` is `VALID`, declares
`usesNonExemptEncryption: false`, and is attached only to the existing `Kivilo
Internal` TestFlight group. Its IPA SHA-256 is
`50c86c302bb423dcc9d00e96c3a153a33f6854153d71739c29aaaf88ea768ee3`. Apple's
public build `12` submission remains `WAITING_FOR_REVIEW`.

Build `16` (source `d2d971a`) adds a proper Android adaptive icon, so the pink
background fills the launcher mask instead of Android shrinking the legacy square
inside it. It also adds the Android 13 monochrome layer. Evidence and room three-dot
menus now open full-width bottom drawers with labelled actions and larger touch targets.
Photo markup adds a Freehand tool beside Circle and Arrow. Freehand paths remain
normalized vector annotation data over the untouched evidence photo, carry their own
notes, and can be selected, redrawn, or deleted like every other mark.
Play internal testing serves `completed:16`; Play production remains build `13`.
App Store Connect build `9f90d179-3a71-4825-a9b5-d1abd3910473` is `VALID`, declares
`usesNonExemptEncryption: false`, and is attached only to the existing `Kivilo
Internal` TestFlight group. Apple's public build `12` submission remains
`WAITING_FOR_REVIEW`. The production backend deployment
`dpl_DDDNtjpRkrCq8CZzQmkh3fMpfm4X` is `READY` in `sin1`; the public privacy page
returns 200 and unauthenticated `/api/v1/me` returns 401.

The signed build was installed on the physical Nothing phone. Its pink adaptive
icon fills the launcher circle, evidence actions open in a bottom drawer, and the
markup editor exposes Circle, Arrow, and Freehand. Flutter analysis passed with all
67 mobile tests. Backend typecheck, lint, production build, all 60 unit tests, all
37 local-Supabase integration tests, and all three full Playwright workflows passed.
The Android AAB SHA-256 is
`df09fbe295c074c7d0f4ae6456a81a4632ba556f78fdf9cec7723e6865d6c1d9`, the APK
SHA-256 is `0b354d19aaf8c75c92424cc4e4795756ca8785ebca46e607029ef0876970b572`, and the
iOS IPA SHA-256 is
`3a8198b3ac3cc18a2c3c59082b93ec4d7dc330eefa3406672128918f99d9c57e`.

Build `15` (source `fe63cbe`) is on Play internal testing (`completed:15`) and in
Apple's `Kivilo Internal` TestFlight group. App Store Connect build
`83986204-f38e-482d-97fa-6798d362185c` is `VALID` and declares
`usesNonExemptEncryption: false`. It removes every embedded camera preview from room
capture and maintenance evidence. Photo and video capture now always opens the phone's
native camera, with the system photo/video library available beside it. The Flutter
camera and screen-lock plugins and their now-unused lifecycle code have been removed.
Picker results are copied into Kivilo's app-support store and durable queue before
upload, and Android recovers a result if the operating system recreates the activity.
On the physical Nothing phone, the signed APK opened
`com.google.android.photopicker` for library import and `com.nothing.camera` for photo
capture. The signed Android and iOS artifacts built successfully, Flutter analysis was
clean, and all 66 remaining mobile tests passed. Play production remains build `13`,
and Apple's public build `12` submission remains `WAITING_FOR_REVIEW`.

Build `14` (source `34eb6f1`) is on Play internal testing (`completed:14`)
and in Apple's `Kivilo Internal` TestFlight group for the capture and form UX
review. The iOS build is `VALID`, declares `usesNonExemptEncryption: false`, and
has App Store Connect build ID `d580d2b0-edde-45e5-bb7a-f403b1cdd206`. It makes the system camera and photo/video library the
primary evidence actions and recovers an
Android picker result if the operating system recreates the activity. Picker results
are copied into Kivilo's app-support store and durable queue before upload. Freehand
circles snap to clean geometry; every circle or arrow is numbered, can carry its own
note, and can be tapped to edit, redraw, or delete. Annotation notes render beside the
numbered marks in shared reports. Form selectors and all former alert dialogs now use
full-width bottom drawers. Flutter analysis and all 73 tests pass; backend lint,
typecheck, all 59 unit tests, and the production build pass. The signed AAB and APK
are archived under ignored `mobile/build/release-artifacts/android/build14/`.
The Play production track remains build `13` and remains in review. Apple's public
submission remains build `12`, `WAITING_FOR_REVIEW`. Build `14` was added only to
the two internal testing tracks.

Android build `13` (source `110a9dd`) passed its physical reconnect-burst regression.
It uses foreground WorkManager uploads instead of the plugin's UIDT path, configures
foreground mode before starting the downloader, and declares the `dataSync`
foreground service. Flutter analysis and all 70 tests pass. The merged release
manifest has both foreground-service permissions and no
`RUN_USER_INITIATED_JOBS`; APK and AAB signing match the established upload key.
Google's new foreground-service declaration is saved in Publishing overview. A genuine synthetic
capture/upload demonstration has been privacy-reviewed and deployed at
`https://kivilo.nottoosweetlabs.com/review/android-evidence-upload.mp4`. The public
URL returns HTTP 200 with the exact reviewed SHA-256 and supports HTTP 206 byte
ranges. Production deployment `dpl_5C1XnP5tCqo91iyaRgp2dP9eLeqD` built successfully;
privacy, support and deletion pages return 200, and unauthenticated `/api/v1/me`
returns 401.
On the Nothing phone, 30 new offline photos and a three-minute video survived
force-stop/relaunch while offline, then handed over without tapping Retry. The
isolated room increased from 40 to 71 captures (65 photos, six videos), with 71
unique client IDs and 71 matching private Storage objects. Fresh native logs
showed `UploadTaskWorker` and the `dataSync` `SystemForegroundService`, no UIDT
job start, and no recurrence of the missing-notification ANR. A separate focused
video was saved on the phone, then Kivilo was backgrounded while its upload was
still in progress; the real `Uploading Kivilo evidence` foreground notification
showed progress. Final production read-back found 72 captures (65 photos, seven
videos), 72 distinct client IDs and 72 matching private Storage objects, with no
missing objects or byte-size mismatches. Scoped native logs had no UIDT start,
missing-notification error or Kivilo ANR during these build-13 tests. The
privacy-reviewed 11-second demo shows the actual save/sync flow and a crop of the
real notification card; unrelated personal notifications and audio were excluded.
Evidence is in ignored `build/physical-qa/build13-foreground-qa.json`. The
background probe confirms a short active transfer, not a continuous transfer
lasting more than nine minutes.

Build `12` (source `333b099`) remains on internal TestFlight. Play internal
testing now serves signed build `13` (`completed:13`). The production draft now
contains build 13 and its en-US release notes. All ten changes passed Play's
automated pre-submission checks and Publishing overview now says, `Your changes
are now in review.` There is no public rollout yet.
Apple's build `da103e08-bfc0-43f3-9e10-4f39579e5ef5` is VALID, selected on the
submitted version, and installed in-place on the physical iPhone. Apple review
submission `cfbbaf16-8d90-430b-b465-bb8c8e1cc3d9` contains this version and was
submitted at `2026-10-12T02:23:05.354Z`; both submission and version read back as
`WAITING_FOR_REVIEW`. Google Play shows the build `13` production submission as
in review.
Physical-device low-storage and recovery after an already expired session remain
unverified on both platforms; automated fault tests cover only part of those
conditions. A read-only Android Auth check observed ordinary automatic refresh,
which is not the same as expired-session recovery. The user explicitly accepted
these two physical-test gaps separately for Apple build 12 and Android build 13
before their submissions.
**Android build 12 is withheld from public release:** its 31-capture reconnect
burst triggered an Android 36 ANR, `required notification not provided`, when
the native UIDT upload service missed its ten-second notification deadline.
Notification permission and the channel were enabled. All captures still handed
over exactly once, but that does not make the ANR acceptable. Android build 13
replaces it with the verified WorkManager path; the iOS artifact is unchanged.
Build 12's evidence metadata
requests have a 20-second whole-call deadline and cancellation, so a stalled
request releases its worker lease and leaves bytes available for retry. The
foreground app rechecks the durable queue each minute without overlapping its
own drain; backgrounding and disposal stop that timer. Native media transfers
and long-running AI calls are unchanged. A real stalled-HTTP test verifies the
same capture and bytes remain after timeout; simulated recovery uploads and
registers that identity once. The retry timer's overlap/lifecycle regression
also passes. Flutter analysis and all 70 tests pass.

If the operating system kills a worker mid-request, its existing claim can
remain until the ten-minute lease expires. The foreground retry timer then
recovers eligible work without clearing claims or deleting capture files.
Ordinary request timeouts release their claim immediately; this longer delay
applies to an abruptly terminated owner.

Physical Android build `12` automatic foreground recovery passed. With Wi-Fi
and mobile data off, a synthetic photo remained on the phone with a retry
message. After navigating to Home and restoring the radios, without tapping
Retry or resuming the app, the capture reached production within 44 seconds.
The room changed from eight to nine captures: five photos, four videos, nine
distinct client IDs, nine private Storage objects and nine exact byte-size
matches. Play internal read-back is `completed:12`; production remains empty.

The subsequent Android long-capture test retained 30 new offline photos and a
ten-minute video through backgrounding and a force-stop/relaunch while both
radios were off. Restoring connectivity, without tapping Retry, increased the
isolated room from nine to 40 captures (35 photos, five videos): 40 unique client
IDs and 40 private objects with exact byte sizes. The new video's decoded
duration is 634.976333 seconds, with H.264 video and AAC audio, and its object is
56,581,298 bytes. The release APK does not allow direct private-file inspection;
this durability evidence combines offline UI with post-reconnect server and
Storage verification. The notification ANR above occurred during this handover.
Evidence is in `build/physical-qa/build12-long-capture.json`.

Read-only Auth metadata for the synthetic Android test account also showed a
Dart client session refreshing about 59 minutes after sign-in, followed by
successful build-12 activity. This supports automatic mobile session refresh;
it does not prove recovery after an access token has already expired. No token
contents were read or recorded for that check.

Physical iPhone build `12` reopened the cached synthetic inspection, room, and
live camera after force-quit/relaunch under verified 100% packet loss. A fresh
30-photo run then passed: 30 shutter actions produced 30 new unique local rows
and 30 matching durable files, totalling 2,348,635 bytes. Two older pending
photos were tracked separately; all 32 local files matched their recorded sizes.
The QA controller now waits for scrolling to settle before tapping controls.
Earlier runs that tapped immediately after scrolling produced 29 saved photos from 30
actions; those saved files were preserved. The corrected controller passed the
30-of-30 check without changing the shipped app. The subsequent video saved a
605-second duration and 30,768,588-byte file. After another force-quit/relaunch
under verified 100% packet loss, all 33 pending rows (including the two older
photos) and their exact file sizes were unchanged. The induced condition has
been cleared and read back inactive. Production read-back at 19:56:27 UTC
confirmed all 88 photos and the video from the accumulated QA runs: 89 unique
client IDs, 89 private Storage objects and no byte-size mismatches. Independently
decoding the downloaded video confirmed 605.723333 seconds, 30,768,588 bytes,
720×1280 HEVC video and AAC audio. The interrupted worker's ten-minute claim
expired and foreground retry completed handover without a manual Retry or claim
change; the local pending journal is empty. Airplane Mode was restored Off and
Wi-Fi remained available. Evidence is in `build/physical-qa/ios12-long-capture.json`.
A separate bounded `VeryBadNetwork` device probe saved one new photo with a
75,999-byte matching local file while the condition was active. After verified
restoration, the photo handed over automatically: production reached 90 unique
capture IDs and 90 matching private objects, and the local pending journal was
empty. This does not establish a continuous ten-minute transfer under throttled
bandwidth or independent iPhone automatic-lock behavior while XCTest is attached.

- Android 13 AAB `build/release-artifacts/android/build13/kivilo-v13.aab`, SHA-256
  `be05ea5b931e98f8b8cc2438ef5a8bd99835ed1a07a90ed2cc9177c9c7efd782`.
- Android 13 APK `build/release-artifacts/android/build13/kivilo-v13.apk`, SHA-256
  `c252554a17f376e9f1caf9b9557ddb364e95e0203e88326481a42c6b1d279361`.
- Withheld Android 12 AAB `build/release-artifacts/android/build12/kivilo-v12.aab`, SHA-256
  `d414a9d0bca269a7906d067cf6ea5186d6ed600599422d9612bb4c2e289024d4`.
- Withheld Android 12 APK `build/release-artifacts/android/build12/kivilo-v12.apk`, SHA-256
  `9380087dc84e14243eebbbd2264213d98fb969c94b12b02ac7670d7607ab8289`.
- iOS IPA `build/ios/ipa/build12-final/kivilo.ipa`, SHA-256
  `b95d6cb90aa9863868f47a57760be86ed10c6eb7081a9c4f666d45e1d2b4d8bf`.

The preceding build's distribution and physical evidence are recorded below.

Android build `11` was previously distributed on Play internal testing
(`completed:11`); iOS build `11` was VALID, in the internal TestFlight group,
and selected on the then-current version draft. Apple's build ID is
`98c90f23-3944-4cac-9d91-1d9e81ba8150`. At that point Play production had no
release and Apple was PREPARE_FOR_SUBMISSION. Neither store had a public submission. Source
commit is `b86e411`.

Build `11` bounds each API GET to eight seconds and cancels stalled requests,
allowing the existing account-scoped cache fallback to run. Mutations, uploads
and long-running AI requests are unchanged. This fixes the physical iPhone
build `10` failure where the cached inspection list opened under 100% packet
loss but its detail stayed loading. A real local HTTP server that accepts
requests without returning headers verifies cached detail recovery, actionable
uncached-read failure, and rejection after an account switch; late responses
cannot replace the cache. Flutter analysis and all 68 tests pass.

The physical Android build `11` cold-restart smoke passed with Wi-Fi and mobile
data off: cached Home, inspection, room and live camera opened. No media was
added; the eight existing captures and exact private Storage objects remained
unchanged. Networks, permissions and the user's screen-awake preferences were
preserved. This fast disconnected-network path does not reproduce active-radio
100% packet loss. The physical iPhone build `11` network-stall rerun passed: after force-quit
and relaunch under verified DVT 100% packet loss, it reached the exact cached
synthetic inspection, tenant, room and live camera in 40.8 seconds. The
condition was restored and verified inactive. A 30-tap automated sequence produced 29 pending photo records; do not count
unacknowledged taps as saved captures. Entering Video opened the first-use iOS
microphone permission dialog before the test controller expected it, so no video
started. After a second force-quit/relaunch under packet loss, all 29 distinct
photo records and their 29 durable files survived (2,300,172 bytes total).
No intake journals remained. Connectivity was restored and verified inactive.
Production read-back at 2026-10-11 19:13:52 UTC confirmed all 29 unique capture
identities and 29 private Storage objects, with no missing files or byte-size
mismatches. A fresh 30-photo sequence and long video are being checked on the
final build. This is not yet a passing 30-photo/ten-minute run.

The physical build `9` camera-denial probe found repeated permission requests
and an activity exit, so it was withheld from public release. Build `10` added
a camera startup gate that prevents overlapping initializations, waits for
abandoned attempts, and requires an explicit retry after permission denial.
Unadopted controllers are disposed. Physical Android build `10` denial/recovery
passed: CAMERA denial remained actionable through background/resume and explicit
retry; restoring permission reopened the camera. Microphone denial allowed
switching back to Photos with a live preview. Permission grants and flags were
restored. A short recording held the screen awake only while recording. An
offline photo survived force-stop/relaunch and uploaded once after reconnect;
that room has eight distinct capture identities, eight private objects and
eight exact byte-size matches (four photos, four videos). Ignored evidence is in
`build/physical-qa/build10-camera-offline.json` and
`build/physical-qa/build11-offline-smoke.json`.

A current production check returned HTTP 200 for `/privacy`, `/support`, and
`/delete-account`, and HTTP 401 for `/api/v1/me` without a session.
The artifacts retain the verified production configuration and signing:

- Android AAB `build/release-artifacts/android/build11/kivilo-v11.aab`, SHA-256
  `3191c7c37caf00149aa36aa16665067c5717415808ee0cc321216cd1653adab4`.
- Android APK `build/release-artifacts/android/build11/kivilo-v11.apk`, SHA-256
  `0a90b584007d8a3f88364667d35901efe829a2833baea1607070936c991b1afc`.
- iOS IPA `build/ios/ipa/build11-final/kivilo.ipa`, SHA-256
  `b98e15e6fa89343934683172dc4a5c6b741da7663d1a9a7a5378974654c14ceb`.

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
For account isolation on the same phone, another synthetic photo was saved offline
under account A. After A signed out, an isolated account B saw no A properties or
inspections even after an offline force-quit/relaunch; production still had only the
original room photo. After A signed back in, the queued photo uploaded once: that room
had two Capture rows and two matching private Storage objects. B's temporary account
was removed. This verifies one physical account switch; expired-session handling,
low-storage behavior, and simultaneous upload workers remain unverified on devices.
The Flutter uploader tests cover offline and authorization errors, but do not replace
those physical checks.

Build `9` includes the queue coordination and recording display fixes. Running
two independent SQLite connections concurrently reproduced `database is locked`
while claiming work. Queue instances now share Drift's executor within a Flutter
engine, and independent connections wait briefly for the current transaction.
Three file-backed concurrency tests verify exclusive claims, heartbeat renewal,
stale-worker rejection, and an edit made during an in-flight handover. An actual
SQLite page-limit failure also preserves capture bytes and the recovery journal;
removing that test limit imports the capture once. An expired-credential simulation
verifies a fresh upload URL with the same capture identity. Recording now holds the
screen awake until the video is stopped/saved, backgrounded, or its camera closes.
The native toggle is serialized so a late enable cannot outlive its camera; tests
cover start failure, disposal during enable, and retry after a failed release.
Flutter analysis and all 64 tests passed. These automated fault checks do not
establish physical-device low-storage or expired-session behavior.

On the physical Android running build `9`, `KEEP_SCREEN_ON` was present during
recording and absent after stop/save, background, resumed idle, and exit to Home.
Two short synthetic recordings synced. With Wi-Fi and mobile data disabled, the
cached inspection/room/camera reopened after force-stop; a new photo survived a
second offline force-stop/relaunch. After reconnection it registered once. The
room has six distinct capture identities (three photos and three videos), six
private Storage objects, and six exact byte-size matches. The earlier build `4`
long-capture run verified 30 consecutive offline photos and a 698.996-second
video through restart and upload; the short build `9` probes do not repeat that
entire long run. Ignored evidence is in
`build/physical-qa/build9-awake-offline.json`. The physical iPhone long offline
capture/restart check is still pending; an interrupted test-controller connection
has not established a capture failure or a passing result.

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
   run without these values. The key alias is `kivilo-upload`, not the Keychain
   account name, and the store and key share one password:

   ```bash
   pw=$(security find-generic-password -s one.kivilo.kivilo.upload-signing -a kivilo-android-upload -w)
   export KIVILO_UPLOAD_KEYSTORE=~/.android/kivilo-upload.jks KIVILO_UPLOAD_KEY_ALIAS=kivilo-upload \
     KIVILO_UPLOAD_STORE_PASSWORD="$pw" KIVILO_UPLOAD_KEY_PASSWORD="$pw"
   ```
4. Fill a local ignored `env.json` with the production `SUPABASE_URL`, publishable
   `SUPABASE_ANON_KEY`, and HTTPS `API_BASE`. These are client-side configuration, never
   service-role credentials. Confirm both origins point to the same production project.

## Over-the-air patches (Shorebird)

Shorebird replaces the Dart code of an installed build without a store review. The app
is `Kivilo` in Yuxi's personal Shorebird organization, beside Hopshift, on the free plan;
its `app_id` is in `shorebird.yaml`, which is bundled as an asset and is not a secret.

Only a build made with `shorebird release` can ever be patched. Builds `21` and earlier
were made with `flutter build` and cannot be; build `22` is the first that can. Every
store build from now on is made this way:

```bash
shorebird release android --flutter-version=3.47.2 --dart-define-from-file=env.json
shorebird release ios --flutter-version=3.47.2 --export-options-plist=ios/ExportOptions.plist \
  --dart-define-from-file=env.json
```

Keep `--flutter-version` pinned to the Flutter the tests ran on. It defaults to `latest`,
so a `shorebird upgrade` would otherwise build the store binary on an untested Flutter.
The Android signing variables above are still required.

`ios/ExportOptions.plist` is the export build `21` used, and it matters for patching: it
sets `manageAppVersionAndBuildNumber` to false. Left to its default, Xcode may rewrite
the build number while exporting, and the IPA in App Store Connect then no longer matches
the release Shorebird recorded, so no patch ever reaches it.

Shorebird searches `build/ios/ipa/` recursively and refuses to release when it finds
more than one IPA, so archive each finished IPA under
`build/release-artifacts/ios/buildNN/`, beside the Android artifacts, never under
`build/ios/ipa/`. The archived IPAs for builds `1` to `21` were moved there on
2026-10-13; the `build/ios/ipa/buildNN/` paths in the entries above now live at
`build/release-artifacts/ios/buildNN/`.

To install the release on the test phone use `shorebird preview`: an APK from
`flutter build apk` has no updater in it and never receives a patch.

A patch targets one release, so a fix that has to reach both build `22` and build `23`
is two patches:

```bash
shorebird patch android --release-version=1.0.0+22 --track=staging --dart-define-from-file=env.json
shorebird patch ios --release-version=1.0.0+22 --track=staging --export-options-plist=ios/ExportOptions.plist \
  --dart-define-from-file=env.json
shorebird preview --release-version=1.0.0+22 --track=staging
```

Check it on a phone, then promote the patch to stable in the Shorebird console.

- A patch replaces the whole Dart program, compile-time defines included. A patch built
  without `--dart-define-from-file=env.json` ships an app with no Supabase URL.
- A patch carries Dart code only. A new or upgraded plugin, `Info.plist`,
  `AndroidManifest.xml`, entitlements, Gradle or Podfile changes all need a store
  build. `shorebird patch` stops when it detects native changes; treat that as the
  signal to ship a store build, never as something to override with
  `--allow-native-diffs`.
- Asset changes are never shipped in a patch; the phone keeps the release's assets.
  The usual one is the icon font, which Flutter tree-shakes to the icons the code uses,
  so removing an icon shows up as a changed `MaterialIcons-Regular.otf`. That is safe
  to pass with `--allow-asset-diffs`, because the release's font still holds every icon
  the patch draws. Using an icon the release never used is not: its glyph is missing
  from the font on the phone and draws as a blank box, so it needs a store build, or
  an icon the release already has. Before every patch, from the repo root, with the
  release's source commit (`b16da52` for `1.0.0+22`); it must print nothing:

  ```bash
  comm -13 <(git grep -h -o -E 'Icons\.[a-zA-Z0-9_]+' b16da52 -- mobile/lib | sort -u) \
    <(grep -rhoE 'Icons\.[a-zA-Z0-9_]+' mobile/lib | sort -u)
  ```
- A patch compiles whatever the working tree holds when Dart is compiled. Never build
  one in a checkout that anyone else can change: another session merged into `main`
  while patch `9` built. Build from a worktree pinned to the commit, with `env.json`
  copied in, since it is ignored:

  ```bash
  git worktree add /tmp/kivilo-patch <commit> && cp mobile/env.json /tmp/kivilo-patch/mobile/
  cd /tmp/kivilo-patch/mobile && shorebird patch ...      # then: git worktree remove /tmp/kivilo-patch
  ```
- The phone checks for a patch at launch, downloads it in the background, and runs it
  from the next cold start. Nothing in the app can apply it sooner: Hopshift built an
  in-app restart button and removed it because a warm restart never applied the patch
  (`sarnies-labs-mono/apps/mobile/lib/core/app_update/patch_update.dart`).

## Retiring an old build

From build `22` the app asks `GET /api/v1/app-config` at launch for the oldest build its
platform may run, and below it covers every screen with "Update Kivilo" and a button to
its store page. This is for what a patch cannot do: reach a build made before Shorebird,
or require a native change. The floors are the Vercel variables `KIVILO_MIN_BUILD_IOS`
and `KIVILO_MIN_BUILD_ANDROID`; unset is 0 and retires nothing. To raise one:

```bash
vercel env rm KIVILO_MIN_BUILD_IOS production
vercel env add KIVILO_MIN_BUILD_IOS production   # enter the new floor, e.g. 23
vercel ls --prod                                  # the current production deployment
vercel redeploy <that deployment's url> --target production
```

A variable only reaches a deployment built after it was set, hence the redeploy.

- Raise a floor only once that build is live in that store. Apple review lags Play,
  which is why there are two. Raised early, the wall sends people to a store page that
  has nothing newer on it. The button opens the public store page, not TestFlight.
- The check fails open: offline, a server error, or a response the build does not
  understand all leave the app usable. An inspector is offline by default.
- The app stays mounted under the wall, so the capture queue keeps draining, and store
  updates keep the queue on the phone. The check runs once per cold start.
- Builds `21` and earlier have no wall and never will. The floors only move people who
  are on build `22` or later.

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
Android phone running signed builds `2`, `4`, and `5`. On 2026-10-12 Singapore time,
the user confirmed a native background notification on the physical TestFlight iPhone;
tapping it opened Kivilo's Notifications screen. The development APNs slot is
intentionally unconfigured.

On 18 October, a read-only production audit found four exhausted `RENEWAL_DUE`
deliveries reporting `Invalid APNs credential.` All four belong to two older iOS
reviewer installations both created 11 October, with no recorded successes. However,
**two iOS renewal deliveries succeeded on a different installation in the same batch**
(`2026-10-17T07:45:08.575Z`). There are five successful iOS outbox deliveries in total.
This rules out a universal APNs failure during that batch; installation/environment
mismatch is plausible but not proven. No success is recorded after the failures'
final retry at `2026-10-17T09:30Z`, so this is not a current-device delivery test.

The registry stores no build or APNs environment, so it cannot establish whether the
affected installations used sandbox or production APNs. A raw-pg audit originally
parsed UTC database timestamps in the Mac's local timezone, shifting reported UTC
dates by eight hours. That audit is corrected; the earlier pre-TestFlight chronology
inference is withdrawn. Prisma's application timestamp handling was already correct,
and the counts and same-batch finding are unchanged. Firebase's signed-in Console was
last checked on 18 October: production key `JK75WN48PB`, team `4N9TA3WSYM`, development
slot empty. Apple's API confirms `PUSH_NOTIFICATIONS` is enabled for the bundle ID.
The released IPA has `aps-environment=production`.

The owner explicitly approved the existing Firebase CLI login after the initial
automatic approval refusal. Token refresh and identity checks succeeded, but the
cached account (`t***@pm.me`) has no Kivilo project access: Firebase Management and
Cloud Resource Manager return 403; its complete visible-project list excludes Kivilo.
No credentials, retry rows or installations changed, and no pushes were sent.
FCM dry run cannot validate APNs tokens ([Admin SDK reference](https://firebase.google.com/docs/reference/admin/java/reference/com/google/firebase/messaging/FirebaseMessaging)).
Current physical TestFlight delivery and Apple key validation remain unverified.
Sanitized local evidence is in `build/release-artifacts/ios/apns-diagnosis-20261018/`.

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
shorebird release android --flutter-version=3.47.2 --dart-define-from-file=env.json
shorebird release ios --flutter-version=3.47.2 --export-options-plist=ios/ExportOptions.plist \
  --dart-define-from-file=env.json
```

These were `flutter build appbundle` and `flutter build ipa` through build `21`; see
"Over-the-air patches" for why they changed.

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
