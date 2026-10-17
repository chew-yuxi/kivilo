# Kivilo public submission request set

These JSON bodies are prepared for app `one.kivilo.kivilo` under NotTooSweetLabs
Pte. Ltd. Apple build 12 and Google Play build 13 have been submitted for review.

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

iOS build `24` (`7161f53`) adds native iPad support and is on internal TestFlight.
On 18 October, live read-back showed public version `1.0.0` selecting build `23` in
`WAITING_FOR_REVIEW`; the build-12 details above describe the earlier submission.
Before submitting the universal build for public review,
add at least one actual 13-inch iPad screenshot at `2064×2752` or `2048×2732` (or the
landscape equivalents), as required by [Apple's screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/).
The widget-test previews are not store screenshots.

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
