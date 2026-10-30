# Kivilo public submission request set

These JSON bodies are prepared for app `one.kivilo.kivilo` under NotTooSweetLabs
Pte. Ltd. iOS **1.0.0 (24) was rejected on 30 October 2026** under 2.1(a), 3.1.1,
and 4.5.4. Its review submission is `628f3b8a-64c9-43fe-bc57-3305e6d25aa6`.
Replacement **1.0.0 (26)** was submitted at **00:10 Singapore time on 31 October**.
Submission `2428f030-a3ac-4faf-b507-487a1a46b9ca`, the app, all 21 subscriptions
and both groups are **WAITING_FOR_REVIEW**. The rejected submission is Removed.
Release remains **MANUAL** and Singapore-only. Receipt: `apple-resubmission-20261031.json`.
Prices cover Apple's required
175 storefronts, with Singapore alone available for sale. Signed replacement build
**26** is uploaded, VALID and in **Kivilo Internal** TestFlight; Shorebird release
**922723** is active. It is selected for the public version, now
WAITING_FOR_REVIEW. Six listing replacements are COMPLETE, with both old images
removed; the description, App Privacy and current review notes are saved.
The billing backend is live and signed Sandbox TEST notification delivery succeeds.
All 21 private subscription review images are COMPLETE. Apple's separate bulk-quantity
purchasing is disabled; the selected team SKU already determines its seat count.
The owner authorized review submission with real purchase/restore and final
distribution-update verification still unrun; a phone is not available yet.
App Review Information explains all three fixes; no separate review reply was sent.
Apple account setup is cleared: both agreements, banking and
the two U.S. tax forms are Active; Singapore tax is Complete. The U.S. forms were
submitted after the owner's explicit certification approval. Current
remediation, provenance and gates: `plans/apple-billing.md`,
`apple-prepared-build.json`, `apple-screenshot-replacements.json`,
`apple-privacy-published.json`, `apple-review-notes.txt` and `apple-agreement-status.json`.
The older submission records below are retained as history.

Android build 13 replaces the native-upload
notification path that caused an ANR in build 12. The foreground WorkManager fix
is on internal testing, and its physical
31-capture reconnect regression passed: the isolated synthetic room advanced
from 40 to 71 captures, then to 72 after a focused background-upload probe.
All 72 have distinct client IDs and matching private Storage objects and byte
sizes. A real upload remained active after Kivilo was backgrounded, with the
`Uploading Kivilo evidence` foreground notification visible. The short,
privacy-reviewed demonstration is deployed at
`https://kivilo.nottoosweetlabs.com/review/android-evidence-upload.mp4`. Its public
bytes match the reviewed SHA-256 and byte-range playback returns HTTP 206. The
`dataSync` foreground-service declaration and video link are saved in Publishing
overview.
A continuous background transfer longer than nine minutes, physical low-storage
recovery, and recovery after an already expired session remain unverified.
The user explicitly accepted the physical low-storage and already-expired-session
test gaps for Android before submission.
The iOS build is unaffected by this Android service failure.

## Metadata refresh — 25 October 2026

The current copy is `mobile/STORE_LISTING.md`, with machine-readable
`play-listing-en-US.json` and `apple-listing-en-GB.json` beside this file. Both now
describe inspector-written inventories, device-first media, signatures, agreed updates
and check-out. The former AI-inventory drafting promise is removed. Descriptions match,
all store field limits pass, and the free allowance matches the shared five-property
constant. Existing screenshots contain no AI-drafting promise.

App Store Connect accepted the version-localization description, promotional text,
keywords, support and marketing URLs, plus the app-info subtitle and privacy URL.
Both PATCH responses returned HTTP 200 and matched the source values. Kivilo app
`6821514302`, version `11c7e01f-bfd0-4277-b1c8-5882e10dcafa`, is still
`WAITING_FOR_REVIEW`. Review submission `628f3b8a-64c9-43fe-bc57-3305e6d25aa6`
retains its original `2026-10-18T00:24:54.107Z` submitted date; no cancellation or
resubmission was needed. The helper below supplies authentication only: its executable
main checks another app, so always use Kivilo's explicit app ID.

Google Play saved the new short/full descriptions in the default English (United
States) listing. Its contact website was separately saved and published as
`https://kivilo.app`; the support email is unchanged. The privacy-policy URL is now
`https://my.kivilo.app/privacy`, and the Data safety deletion URL is
`https://my.kivilo.app/delete-account`. The latter used the existing accepted CSV with
only that URL changed; the official API returned HTTP 204. Its current SHA-256 is
`16765a83ab627c217eb3976943c2adff82df9279181719c5ff90c80522e30af2`.
The four metadata changes were sent for review through Publishing overview. Read-back
shows **Changes in review**, with quick checks still running before Google review.
Approval and a later managed Publish action are still required; these descriptions
are not yet public.
Managed publishing remains on, and the pre-existing
Android `1.0.0 (27)` change is approved but held; no binary or track was changed for
this metadata task. Store approval/publication is separate from saving this source.

## Apple

Live App Store Connect read-back on 2026-10-12: iOS version `1.0.0`, selected
build `12` (`da103e08-bfc0-43f3-9e10-4f39579e5ef5`), and review submission
`cfbbaf16-8d90-430b-b465-bb8c8e1cc3d9` are submitted and
`WAITING_FOR_REVIEW`. The submitted date is `2026-10-12T02:23:05.354Z`. The user
explicitly accepted the remaining physical low-storage and already-expired-session
test gaps for this Apple submission. Its item is
`Y2ZiYmFmMTYtOGQ5MC00MzBiLWI0NjUtYmI4YzhlMWNjM2Q5fDZ8ODkyOTIyMTk0`.
Build 12 includes the camera-permission, stalled-network, and foreground
queue-retry fixes. Its physical iPhone 30-photo and ten-minute offline video,
restart durability and automatic exactly-once handover checks passed; additional
stress-test limits remain documented in `mobile/RELEASE.md`. The en-GB version localization has
description, keywords, support URL, and promotional text; private review contact,
test login, and notes are present. The iPhone-only IPA has `UIDeviceFamily=1`.
Screenshot set `APP_IPHONE_61` contains the actual signed-in Home image
`Kivilo-Home-build4.jpg`, 1206×2622, with `assetDeliveryState=COMPLETE`. Home's
design is unchanged through build 12. [Apple requires at least one iPhone Dynamic
Island medium screenshot](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/)
and lists 1206×2622 as an accepted portrait size; no iPad screenshot is required
for this iPhone-only build.

On 18 October 2026, iOS build `24` (`7161f53`) replaced build `23` for public
version `1.0.0`. Build ID `4609e2e1-a6d9-490c-980e-537401caf84a` is `VALID` and
selected. Review submission `628f3b8a-64c9-43fe-bc57-3305e6d25aa6` was submitted at
`2026-10-18T00:24:54.107Z`; live read-back is `WAITING_FOR_REVIEW`. The prior
build-23 submission is canceled. Reviewer contact, login and notes are present.

The native iPad build has an actual 2064×2752 screenshot at
`mobile/store/assets/ios/ipad13-build24.png`, taken from the production-configured
`7161f53` simulator with the synthetic Apple reviewer login. Screenshot
`36000019-6980-8c3e-8004-39b3ae6169d6` in set `APP_IPAD_PRO_3GEN_129` has delivery
state `COMPLETE`. The iPhone screenshot remains accepted. This satisfies the
[universal-app screenshot sizes](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/).
Shorebird stable patch `1` on iOS `1.0.0+24` supplies the Dart-only check-in reference
from `86d7bbc`; native plugins, icons and configuration are unchanged by the patch.

Use the existing App Store Connect JWT helper at
`/Users/liguro/.appstoreconnect/asc_check.py` without printing its token:

The current submission already exists; do not create or submit a duplicate.
`apple-create-review-submission.json`, `apple-add-version.json`, and
`apple-submit-review.json` preserve the structured requests used to stage and
submit it.

Apple's [submit-an-app instructions](https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-app/)
distinguish adding a version to a draft submission from sending that submission
for review. The structured requests use Apple's documented
[review-submission](https://developer.apple.com/documentation/appstoreconnectapi/review-submissions)
and [review-submission-item](https://developer.apple.com/documentation/appstoreconnectapi/review-submission-items)
resources.

## Google Play

Current read-back on 18 October 2026: production and internal `25` are both
`PUBLISHED`. Edit `06562556097228654965` validated and committed at
`2026-10-18T00:24:39.605Z`; after review Google reported approved but unpublished.
The final Console Publish action was completed later that morning, and the lifecycle
API then confirmed `25` published, superseding `23`. Build `23` had also needed a
manual Publish action earlier that day. Do not infer publication from an edits API
`completed` status.

Build `25` is signed source `ce0d8e3`, containing responsive tablet layouts, native
PDF viewing/sharing, capture guards, renewal cards and the check-in reference.
Build `24`'s failed edit was discarded after an unnecessary-media-permissions error.
Build `25` explicitly removes the PDF plugin's four unused broad storage/media
permissions; Google accepted and validated this artifact. Hashes and evidence are
in `mobile/RELEASE.md` and `mobile/build/release-artifacts/android/build25/`.

The following build-13 details describe the earlier submission.

On 2026-10-12, Play Console saved the complete Kivilo default listing and showed
**Ready to send for review**. The approved title, short/full description, one
icon, one feature graphic, and two phone screenshots are saved. Only the icon
and feature graphic are labelled as created or edited using AI. Internal testing
serves signed versionCode `13` with release status `completed`; the production
track has a saved build-13 production draft and no public rollout. Play Console has
Singapore alone saved under **Changes not yet submitted for review**; it is not
published. The listing has no remaining required-image errors.
The prepared production payload targets versionCode `13`, containing the
Android foreground WorkManager upload fix. The reconnect regression passed;
the short background-upload probe passed with 72/72 captures and private Storage
objects. Its reviewed, genuine synthetic demonstration is live at the URL
above; the Play foreground-service declaration and its video link are saved.
The submitted production release contains build 13, release name `Kivilo 1.0.0`,
and the approved en-US release notes. All ten changes passed Play's automated
pre-submission checks; Publishing overview shows **Changes in review** and says
the changes are now in review. Managed publishing is off, so the release will
roll out in Singapore after approval. The user accepted the two remaining
physical-test gaps for Android before submission.
The private reviewer login
was recently verified, and its Play Sign in details were saved with optional
Google/partner credential sharing off.

The original version-9 edit was discarded through the official delete endpoint
(HTTP 204). A fresh isolated edit with only the approved listing copy and images,
without any production-track write, still returned HTTP 403 `The caller does
not have permission` from `edits.validate`. That probe was also discarded. No
API edit is active. The signed-in human account has Admin access; the listing
was saved through Play Console while this service-account validation issue remains.
Do not attempt to commit the deleted version-9 edit or its temporary helper state.

The local [listing copy](../../STORE_LISTING.md) is rendered in
`play-listing-en-US.json`. The durable icon and feature graphic are at
`mobile/store/assets/android/app-icon.png` (512×512) and
`mobile/store/assets/android/feature-graphic.png` (1024×500). The two selected
phone screenshots are genuine Kivilo Android emulator captures of an isolated
fictional demo account, at 1080×1920:

- `mobile/store/assets/android/home.png`
- `mobile/store/assets/android/new-check-in.png`

They were captured from the production-configured build-8 APK. The displayed
Home and New check-in design is unchanged in build 12. These versioned files
preserve the accepted capture bytes through submission.

Play requires [2–8 phone screenshots](https://support.google.com/googleplay/android-developer/answer/9866151)
and recommends four 1080×1920 screenshots for promotion.

If the service-account validation permission is resolved, the existing credential
at `/Users/liguro/.config/hopshift/play-publisher.json` can use the official
[Edits API](https://developers.google.com/android-publisher/edits) with these
prepared JSON bodies. Do not use older temporary helpers' hard-coded build or
listing values. Prefer the authorized human Console for the current submission.

1. `POST /androidpublisher/v3/applications/one.kivilo.kivilo/edits` and record
   `editId`. Re-read the internal track and production country availability;
   verify Singapore is pending or active and no other country is selected.
2. `PUT /edits/{editId}/listings/en-US` with `play-listing-en-US.json`. Upload
   icon, feature graphic, and each approved 9:16 screenshot through the
   [documented images upload](https://developers.google.com/android-publisher/api-ref/rest/v3/edits.images/upload)
   endpoint, using image types `icon`, `featureGraphic`, and `phoneScreenshots`.
3. Verify versionCode `13` in `play-production-track.json` is the final signed,
   accepted AAB, then `PUT /edits/{editId}/tracks/production` with that file. The
   [track API](https://developers.google.com/android-publisher/api-ref/rest/v3/edits.tracks)
   defines `completed` as serving all eligible users after publication.
4. `POST /edits/{editId}:validate` with an account permitted to validate this
   change. Inspect Play Console Publishing overview for all pending policy,
   country, listing, and release changes, then make the
   final `POST /edits/{editId}:commit?changesInReviewBehavior=ERROR_IF_IN_REVIEW`
   **only when public review may begin**. Do not set
   `changesNotSentForReview`; Play rejected that flag for this app because these
   changes are automatically sent for review. The
   [commit API](https://developers.google.com/android-publisher/api-ref/rest/v3/edits/commit)
   documents this behavior. After committing, check Publishing overview for any
   still-unsent Singapore or content declarations and send those through the
   Console if needed. Confirm the production track and review state.

The Play Console path `Production → Countries / regions` is the official
[country-availability control](https://support.google.com/googleplay/android-developer/answer/7550024);
internal testing has separate availability and does not establish a Singapore
production release.
