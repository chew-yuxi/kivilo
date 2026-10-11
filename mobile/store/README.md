# Store release materials

`assets/` preserves the selected public listing images. Android Home and New
check-in are unchanged, actual build-8 emulator screenshots at 1080×1920, using
a separate fictional demo account; build 12 does not change these screens. The
iOS Home image is the actual 1206×2622 build-4 simulator screenshot already
accepted in App Store Connect; that screen is also unchanged in build 12. No
customer media or review credentials appear in these images. The Android icon
is 512×512 and its feature graphic is 1024×500.

On 12 October 2026, Play Console saved the complete default listing and showed
**Ready to send for review**, with one icon, one feature graphic, and two phone
screenshots. Its AI asset declaration labels the assistant-prepared icon and
feature graphic; the actual app screenshots are not labelled as AI-generated.
Saving the listing did not submit the app for public review.

[Submission requests](submission/README.md) contain the prepared store API bodies
and current staging instructions. Staging or validating an edit does not mean
that the app has been submitted or approved. [Release evidence](../RELEASE.md)
records device results and outstanding acceptance checks.

## Google Play Data safety declaration

`play-data-safety.csv` is the accepted Data safety declaration for Kivilo
(`one.kivilo.kivilo`). It follows [Google's CSV format and template](https://support.google.com/googleplay/android-developer/answer/10787469#zippy=%2Cunderstand-the-csv-format), including the current account-creation and deletion fields requested by Google's API validator. The [Android Publisher `applications.dataSafety` method](https://developers.google.com/android-publisher/api-ref/rest/v3/applications/dataSafety) accepts this CSV as the `safetyLabels` string.

The declaration covers 11 collected data types: name, email, user IDs, address, other personal information (tenancy details), other financial information (rent and deposit), photos, videos, voice recordings, other user-generated content, and device or other IDs. It marks collection as non-ephemeral and encrypted in transit, with no non-exempt sharing. Rent/deposit, evidence media, and user-generated content are optional; account, core tenancy, and Firebase installation identifiers are required. Account deletion is available at <https://kivilo.nottoosweetlabs.com/delete-account>; data-only deletion without closing the account is not offered. Purposes are app functionality, plus account management for name, email, and user IDs. There is no Analytics, Crashlytics, or Performance SDK in the Android app; [Firebase's disclosure guidance](https://firebase.google.com/docs/android/play-data-disclosure) confirms the automatically collected installation ID through Firebase Messaging's Installations dependency.

On 11 October 2026, the official Data safety API returned **HTTP 204** for this exact file (SHA-256 `8d3e4a0efa1dc07a3c6e8b1aa15bc5d11d6ab2ffe525c2bdefecf3d3f6b82e94`). A fresh Play Console Kivilo dashboard then showed **Data safety complete** with a green check; app setup was 10 of 11 tasks complete, with the store listing still open. This did not alter the production release track. The CSV contains only declaration responses and the public deletion URL; it contains no credentials or user data.

Review this declaration whenever the app or an included SDK changes its data practices.
