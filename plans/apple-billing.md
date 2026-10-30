# Apple review remediation — 30 October 2026

The rejected submission is `628f3b8a-64c9-43fe-bc57-3305e6d25aa6`, app
`6821514302`, iOS **1.0.0 (24)**. The review device was iPad Air 11-inch (M3).
TestFlight build 25 and its Shorebird patches are separate from that submission.

The owner authorized deployment on 30 October. The Apple billing migration is now
applied in production: all 50 migration checksums match, the new tables have RLS
and no client-role privileges, and existing row counts are unchanged. Server
deployment and the native release are in progress; no build upload, screenshot
replacement, review reply or resubmission has been performed yet. A signed build **1.0.0 (26)** was prepared with
`shorebird release ios --dry-run`, using Flutter 3.47.2 and `lib/main.dart`.
Its strict deep signature check passes, it includes the StoreKit framework and
excludes the test fixture, and `get-task-allow=false`. The IPA is at
`mobile/build/release-artifacts/ios/build26-prepared/kivilo.ipa`; its hash and
provenance are in `mobile/store/submission/apple-prepared-build.json`. This dry run
did not publish a Shorebird release. Register the release before a store upload.

| Rejection | Prepared change | Remaining release gate |
| --- | --- | --- |
| 2.1(a): demo content in screenshots | Actual iPhone and iPad captures of a fictional property, written inventory and room review; no DEMO ONLY, QA or Review Lane labels. | Verify against the distribution build and replace all affected store screenshot sets. |
| 3.1.1: externally purchased Pro unavailable through IAP | StoreKit 2 purchase, restore, current Apple prices, terms, server verification and signed v2 notifications; separate Personal and team groups. All prices configured and the IAP key authenticates to Sandbox. | Subscription review screenshots, deployment and real sandbox purchases. |
| 4.5.4: push required | Shorebird downloads no longer request notification permission or exit the app; Not now and Continue keep work accessible. | Verify patch delivery on the final Shorebird distribution build. Native notification denial and inventory navigation pass on both simulators. |

## Catalog and pricing

The owner approved matching the existing plans at S$39 per seat per month. Two groups
were created in App Store Connect: Personal `22528923` and Team `22528973`.
`kivilo_pro_monthly` is Personal; `kivilo_pro_team_1_monthly` through
`kivilo_pro_team_20_monthly` are mutually exclusive team tiers. Larger tiers have
higher service levels, so upgrades take effect immediately and downgrades at renewal.
An Apple Account can hold Personal plus one team subscription. This limit is shown
in the team purchase screen. Family Sharing is disabled; entitlement belongs to the
selected Kivilo workspace, not an Apple family.

All 21 products are drafts with English (UK) localization and Singapore availability.
They remain **MISSING_METADATA**, including the purchase review screenshot. Apple's
`UPFRONT` plan type pays for the `ONE_MONTH` subscription period; it is not an annual
commitment. No annual instalment option is configured.

The owner chose **S$116.98 for three seats**. That lower-price choice was applied
across the draft team tiers using the nearest offered price at or below S$39 × seats.
All 21 prices were saved and read back from App Store Connect. Personal is S$39/month.

| Team seats | Monthly SGD | Team seats | Monthly SGD |
| --- | ---: | --- | ---: |
| 1 | 39.00 | 11 | 429.00 |
| 2 | 78.00 | 12 | 464.98 |
| 3 | 116.98 | 13 | 500.00 |
| 4 | 154.98 | 14 | 539.98 |
| 5 | 194.98 | 15 | 579.98 |
| 6 | 229.98 | 16 | 619.98 |
| 7 | 269.98 | 17 | 659.98 |
| 8 | 309.98 | 18 | 700.00 |
| 9 | 350.00 | 19 | 739.98 |
| 10 | 389.98 | 20 | 779.98 |

`mobile/store/submission/apple-subscription-catalog.json` records product IDs and the
read-back. `scripts/setup-apple-billing.py` audits by default; `--create-drafts` creates
only missing metadata/prices and never submits review or changes an existing price.
Its default price policy is `exact`; the approved run used `--price-policy at-or-below`.
It uses the existing local ASC authentication
helper's `token()` only, never its executable main (which targets another app).

Prices are not compiled into Flutter. StoreKit supplies the displayed currency and
price, and Apple's sheet confirms the charge. Later price changes are made in
[App Store Connect](https://developer.apple.com/help/app-store-connect/manage-subscriptions/manage-pricing-for-auto-renewable-subscriptions),
without a new app binary or Shorebird patch. Existing subscriber pricing can be
preserved; increases follow Apple's notification/consent rules.

## Server and purchase boundary

`src/lib/apple-store.ts` uses Apple's official App Store Server Library and public
Apple root certificates. Production and Sandbox signatures are independently verified
against Kivilo's bundle/app identity. Xcode/local receipts, other products, family
sharing, unsupported transaction kinds and invalid expiry are refused. Sandbox is
necessary for TestFlight and Apple's review even on the production backend.

`AppleBillingAccount.id` is an opaque UUID passed as StoreKit's `appAccountToken`.
It permanently identifies the payer/workspace binding, not an email. The server
re-reads current Apple subscription status under the agency and workspace locks;
an old notification or restored transaction cannot roll entitlement back. Neither
the client nor an unverified receipt grants Pro. Renewal, cancellation, grace, billing
retry, expiry and revocation use the shared `plan.ts` boundary, with local expiry.

The phone finishes a transaction only after durable server verification. Offline and
temporary failures retain unfinished transactions for retry. Account changes cancel
stale purchase contexts and prevent another account from finishing or receiving the
purchase. Definitive account/conflict failures do not loop automatic retries.
The native simulator run caught a restore defect: this plugin's `Transaction.all`
entries contain ownership metadata without a signed receipt. Restore now verifies
the signed current-entitlement events and unfinished purchases, and does not submit
those metadata-only historical entries. A Dart regression and native restore test
cover the fix.

Stripe, Google Play and Apple share the same resumable-subscription guard. A concurrent
payment or a payer who loses team authority is rejected without replacing the current
plan. Apple has no equivalent of the existing Google server refund operation; the
rejection is recorded durably for support and the user is directed to request an Apple
refund. Replaying that purchase cannot grant it later.

Account deletion retires the opaque binding and cannot restore an erased payer. Other
team members keep only the already-paid term. **Deleting the Kivilo account does not
cancel Apple's recurring charge**; native and web deletion screens explain this and
link to Apple's subscription management. Deletion is not conditional on cancellation.

Migration `20261030090000_apple_billing` adds the two Apple tables and the subscription
relation, with RLS and client-role privileges revoked. It is applied locally and
in production, with the migration checksum and privileges verified. The Stripe and Google paths retain their existing workspace and sharing rules.

## Required configuration and release steps

1. **Key supplied and validated:** `GJV7H63M89`, supplied from Downloads outside
   the repository. Issuer `9167e556-55e7-498d-9d91-cbbee409279a` was recovered from
   the existing ASC configuration. Apple's Sandbox notification-history API
   authenticated successfully using the official server library. Production returned
   401, consistent with [Apple's first-production-release prerequisite](https://github.com/apple/app-store-server-library-node/issues/60);
   production verification must be rechecked after the first release. Safe diagnostic
   metadata is in `build/apple-review-20261030/iap-key-verification.json`.
2. `APPLE_IAP_PRIVATE_KEY`, `APPLE_IAP_KEY_ID` and `APPLE_IAP_ISSUER_ID` are saved
   as sensitive Production-only Vercel variables, with read-back of variable names.
   `APPLE_BILLING_ENABLED=false` is staged there while release verification remains.
   These changes apply to a later deployment; the existing deployment is unchanged.
   Enable billing when the backend and purchase test are ready. Never put the private
   key in Flutter defines or source control.
3. Finish each subscription's review screenshot; all approved prices are configured.
   Retain the Singapore availability scope. Confirm paid-app agreements and the
   catalog are usable by the sandbox tester.
4. Deploy the database migration and server code, then configure App Store Server
   Notifications **v2**, Production and Sandbox, to
   `https://my.kivilo.app/api/apple/notifications`. Verify a signed TEST notification
   and Apple's delivery status. No shared webhook password is used; the signed
   payload and transactions are verified.
5. Test real Apple sandbox purchases for Personal and a team, upgrade/downgrade,
   cancel/renew/expire/refund, pending approval, restore after reinstall, offline
   verification and switching Kivilo accounts. Check the correct workspace and no
   duplicate provider subscription. Mocked tests do not establish this release gate.
6. Publish a **new native Shorebird iOS release** with the StoreKit plugin and an
   unused explicit build number. Signed build 26 passed the local dry run; the
   Shorebird release is not published. Do not patch this plugin into build 24/25.
   Confirm prices and restore on the final build and deny notifications while using
   the app, downloading an update and resuming captures. Preserve all queued media.
7. Replace the rejected listing screenshots, apply the prepared Apple description
   including privacy/EULA links, select the new build, attach the first subscriptions
   to the app submission and resubmit. A review reply must describe verified shipped
   behavior, not the unfinished steps above. No review message has been sent.

## Screenshots and verification

### Permission scope confirmed by the owner

On 30 October the owner authorized deployment and identified future HR/CRM/KYC
needs as documents, ID photos/selfies and optional notifications. The current
camera/image-picker and push capabilities cover capture and optional alerts; no
contacts, calendar, location, Face ID, tracking or broad-storage permission was
added. Camera/photo purpose strings now include the document-attachment flows
already present in the app. A selfie uses the camera permission, not Face ID.
Native PDF selection or a KYC/liveness SDK must be assessed when that feature is
implemented; current PDF selection uses the authenticated web document flow.

The iOS privacy manifest now also declares existing phone/financial details,
notification identifiers, subscription history, account-linked screen analytics
and diagnostics. The public policy describes Apple/Google billing, mobile screen
analytics and the Apple account-deletion/cancellation distinction. Store privacy
answers must match these disclosures before resubmission. Identity verification
will need its own clear purpose, consent, access and retention rules when built;
this release does not introduce HR, CRM or KYC collection.

New native plugins, entitlements and Info.plist/AndroidManifest permission changes
require a store release; they cannot be delivered as a Shorebird Dart patch.
References: [Apple data minimization](https://developer.apple.com/app-store/review/guidelines/#data-collection-and-storage),
[privacy manifest categories](https://developer.apple.com/documentation/bundleresources/app-privacy-configuration/nsprivacycollecteddatatypes/nsprivacycollecteddatatype),
and [Shorebird release boundaries](https://docs.shorebird.dev/code-push/guides/code-push-guide/).

### Captures and test results

Six original simulator captures are in
`mobile/build/store-screenshots/ios/rejection-20261030/{iphone,ipad}/`:
property overview, check-in progress and Kitchen inventory. Dimensions are
1206×2622 and 2064×2752. Hashes/provenance are in
`mobile/store/submission/apple-screenshot-replacements.json`.
The dedicated Apple reviewer account contains one additional fictional property,
created through the authenticated API. Its 34 inventory observations were saved
through normal actions. Three rooms are reviewed; the report is unsigned and
unshared. No party email was supplied and no report, invitation or signature email
was sent. Existing review fixtures were retained. Private simulator auth material
is confined to ignored local QA artifacts and is not part of the screenshot set.

Verification on this work:

- Typecheck, zero-warning ESLint, production build and 242 web unit tests pass.
- Flutter analysis and **525 tests** pass. The normal native simulator build and
  signed distribution build 26 compile with `in_app_purchase_storekit`; no new
  build has been uploaded or registered as a Shorebird release.
- Targeted Apple/Stripe/Google/team integration tests pass (**91 tests** after the
  added cross-provider test). The broad database run passed 424 and failed eight:
  the already-recorded schema-versus-table permission expectations and a retained
  StoragePurge tombstone blocking account-deletion fulfillment. The data/privileges
  were not weakened to make those tests green.
- Browser run: 24/26 passed under Node 22; the PDF-clause case passes on the
  repository's documented Node 24. The remaining Stripe checkout case has no local
  Upgrade button because sandbox billing is not configured. The supplied IAP key
  authenticates to Apple's Sandbox API; real sandbox purchases and notification
  delivery remain **NOT RUN**. The user chose simulator testing while the physical
  iPhone was unavailable.
- Seven native StoreKit cases pass on **both iPhone and iPad**: all 21 prices and
  billing UI, purchase/restore, cancellation, pending approval, verification failure
  and retry, permanent rejection, immediate team upgrade and a downgrade scheduled
  for renewal. The tests confirm Apple's `autoRenewPreference` for the downgrade;
  they do not claim to exercise a real App Store renewal. The fixture uses the real
  screen/service/plugin and a fake in-memory API. It is debug-only and separately
  opted into; see `mobile/test_support/README.md`. Test screenshots retain their
  debug marker and are not listing replacements.
- A real locally signed transaction from those tests is **rejected by the production
  verification function** (`invalid_purchase`). Xcode test signatures have not been
  added to the server's trust roots. This check complements the already-passing
  server tests; simulator success is not real Apple sandbox purchase verification.
- Native XCTest tapped **Don't Allow** on both fresh simulators, then opened the
  property inventory with notifications still denied. The first inventory assertion
  used the wrong accessibility element type; it was corrected to match Flutter's
  semantics and both runs pass. Physical devices and final Shorebird patch delivery
  are **NOT RUN**.

Logs and native `.xcresult` bundles: `build/apple-review-20261030/`,
`build/apple-review-*.log`, and `mobile/build/apple-review-*.log`. StoreKit native
results are `mobile/build/storekit-tests/{iphone,ipad}-gated.xcresult`; screenshots
are in `mobile/build/storekit-tests/attachments-{iphone,ipad}/`. The final checks
include `mobile/build/apple-storekit-{analysis,full-tests}.log` and the safe server
rejection record `build/apple-review-20261030/local-storekit-rejection.json`.
