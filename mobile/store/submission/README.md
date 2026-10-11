# Kivilo public submission request set

These JSON bodies are prepared for app `one.kivilo.kivilo` under NotTooSweetLabs
Pte. Ltd. **No public review submission has been dispatched.** Complete the
remaining release gates before committing a Play edit or submitting the Apple
version. Apple now has an unsubmitted review draft; the current IDs are below.

## Apple

Live App Store Connect read-back on 2026-10-12: iOS version `1.0.0` is
`READY_FOR_REVIEW`, selected build `12` (`da103e08-bfc0-43f3-9e10-4f39579e5ef5`)
is `VALID` and available to the internal TestFlight group. It has been added to
review draft `cfbbaf16-8d90-430b-b465-bb8c8e1cc3d9`, whose state is
`READY_FOR_REVIEW` with no submitted date. Its item is
`Y2ZiYmFmMTYtOGQ5MC00MzBiLWI0NjUtYmI4YzhlMWNjM2Q5fDZ8ODkyOTIyMTk0`.
Build 12 includes the camera-permission, stalled-network, and foreground
queue-retry fixes; its iPhone
acceptance checks are in progress. The en-GB version localization has
description, keywords, support URL, and promotional text; private review contact,
test login, and notes are present. The iPhone-only IPA has `UIDeviceFamily=1`.
Screenshot set `APP_IPHONE_61` contains the actual signed-in Home image
`Kivilo-Home-build4.jpg`, 1206×2622, with `assetDeliveryState=COMPLETE`. Home's
design is unchanged through build 12. [Apple requires at least one iPhone Dynamic
Island medium screenshot](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/)
and lists 1206×2622 as an accepted portrait size; no iPad screenshot is required
for this iPhone-only build.

Use the existing App Store Connect JWT helper at
`/Users/liguro/.appstoreconnect/asc_check.py` without printing its token:

1. Recheck `GET /v1/apps/6821514302/reviewSubmissions`, its single version item,
   and the selected build. The current draft is already populated; do not create
   a duplicate. `apple-create-review-submission.json` and
   `apple-add-version.json` preserve the request bodies used to stage it.
2. Only after the final release gates pass, `PATCH` `apple-submit-review.json` to
   `/v1/reviewSubmissions/cfbbaf16-8d90-430b-b465-bb8c8e1cc3d9`. This final call sends the
   version to App Review. Confirm the submission and version states afterward.

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
serves signed versionCode `12` with release status `completed`; the production
track is empty. Play Console has
Singapore alone saved under **Changes not yet submitted for review**; it is not
published. The listing has no remaining required-image errors.
The prepared production payload targets that same accepted versionCode `12`,
containing the recording and upload-worker fixes. The private reviewer login
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
3. Verify versionCode `12` in `play-production-track.json` is the final signed,
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
