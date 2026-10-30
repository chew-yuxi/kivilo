# Apple review remediation — resubmitted 31 October 2026

Native **1.0.0 (26)** was resubmitted at **00:10 Singapore time on 31 October**
(`2026-10-30T16:10:12.052Z`). Submission
`2428f030-a3ac-4faf-b507-487a1a46b9ca` and all 24 linked versions are
**WAITING_FOR_REVIEW**: the app, 21 subscriptions and both subscription groups.
Release remains **MANUAL**, with Singapore-only availability. The owner authorized
submission with real-device purchase/restore and final distribution-update testing
still unverified. These remain test gaps, not prerequisites to this authorized
review submission. Safe read-back: `mobile/store/submission/apple-resubmission-20261031.json`.

The rejected submission is `628f3b8a-64c9-43fe-bc57-3305e6d25aa6`, app
`6821514302`, iOS **1.0.0 (24)**. The review device was iPad Air 11-inch (M3).
TestFlight build 25 and its Shorebird patches are separate from that submission.

The owner authorized deployment and use of the already authenticated `chew-yuxi`
GitHub identity on 30 October. Repository-local Git attribution is Chew Yuxi;
global identity and login were left unchanged. The Apple billing migration is
applied in production: all 50 migration checksums match, the new tables have RLS
and no client-role privileges, and existing row counts are unchanged. Billing is
enabled on `my.kivilo.app`. The billing release was verified at source `378d3df`,
Vercel deployment `dpl_2HJuX7j8mkbKRG4irqqyFDVoNmuP` (READY, Singapore).

Native **1.0.0 (26)** was published with `shorebird release ios`, Flutter 3.47.2
and `lib/main.dart`, from `9a06bbd`. Shorebird release **922723** is active for iOS.
Apple build `7b22e7e8-92f5-4e60-bd6a-6bb6f33284a2` is **VALID** and
**IN_BETA_TESTING** in **Kivilo Internal**; automatic tester emails were disabled.
Its strict deep signature check passes, it includes StoreKit, excludes the test
fixture and has `get-task-allow=false`. The IPA is at
`mobile/build/release-artifacts/ios/build26/kivilo.ipa`; its hash and provenance
are in `mobile/store/submission/apple-prepared-build.json`.

All six listing screenshots, the subscription description, App Privacy answers
and current review instructions are submitted with build 26. Review notes explain
the 2.1(a), 3.1.1 and 4.5.4 fixes; no separate review message was sent.
The rejected submission was canceled because Apple does not allow adding the first
subscriptions and groups to an unresolved submission. A fresh draft was prepared
in App Store Connect. Its bulk action attached only one team tier, so the remainder
were attached individually through the API. After confirming all 24 items and
setting the draft platform to iOS, the webpage still disabled Submit without an
explanation. The API accepted submission; both API read-back and the web UI confirm
Waiting for Review.
The owner accepted Apple's updated Developer Program License Agreement; the banner
cleared and Free Apps now shows **Active**. The owner also accepted the Paid Apps
Agreement and supplied banking and Singapore tax information. After the owner's
explicit review and authorization, both U.S. tax forms were certified and submitted.
A fresh Business page confirms the Paid Apps Agreement, bank account and both U.S.
forms are **Active**; the Singapore questionnaire is **Complete**. Apple account
setup is cleared. No developer or Paid Apps agreement was accepted by the agent.
See `mobile/store/submission/apple-agreement-status.json`.
Kivilo's app availability is Singapore-only. The owner confirmed no planned EU
distribution. App Store Connect shows DSA **Active**, with the
non-trader/no-planned-EU-distribution option saved.
The existing declaration was verified without changing it.

| Rejection | Submitted change | Verification still outstanding |
| --- | --- | --- |
| 2.1(a): demo content in screenshots | Six actual iPhone and iPad captures of a fictional property, written inventory and room review; all uploaded assets COMPLETE and both old images removed. | Apple review pending. |
| 3.1.1: externally purchased Pro unavailable through IAP | StoreKit 2 purchase, restore, current Apple prices, terms and server verification deployed; all 21 subscriptions and both groups submitted together. All private review screenshots are COMPLETE. A signed Sandbox TEST notification is delivered successfully. | Real sandbox purchases and restore remain unverified; owner authorized review with this gap. |
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

All 21 products have English (UK) localization, Singapore availability and a private
review screenshot, with every image **COMPLETE**. Their versions and both groups are
**WAITING_FOR_REVIEW** with build 26. Apple's
`UPFRONT` plan type pays for the `ONE_MONTH` subscription period; it is not an annual
commitment. No annual instalment option is configured.

Apple's new multiseat setting defaults to enabled. It is disabled for all 21 SKUs,
with purchase markets restricted to the App Store. Each purchase is quantity one;
the selected team SKU already determines the workspace's seat count. Apple's bulk
quantities and Business/School licensing use a separate entitlement model which
Kivilo does not implement. The setup script now configures this for newly created
SKUs and refuses incompatible existing purchase options during an audit.
See [Apple's purchase-option settings](https://developer.apple.com/documentation/appstoreconnectapi/configuring-multi-seat-subscriptions-for-organizations).

The owner chose **S$116.98 for three seats**. That lower-price choice was applied
across the draft team tiers using the nearest offered price at or below S$39 × seats.
All 21 prices were saved and read back from App Store Connect. Personal is S$39/month.

Apple's review validator requires starting prices in all 175 storefronts, even
though only Singapore is available for sale. A Singapore-only price record displayed
correctly but failed Add for Review with `IAP_SUBMISSION_NOT_ALLOWED_MISSING_PRICING_DATA`.
The missing records were filled using Apple's equalizations of each approved SGD
price, preserving the existing Singapore price points and Singapore-only availability.
All 21 subscriptions reached **READY_TO_SUBMIT** before submission. The setup script creates the
complete starting-price table for a new product and audits storefront coverage, so
a valid Singapore price alone is not mistaken for a complete catalog.

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
   `APPLE_BILLING_ENABLED=true` is deployed. An authenticated production smoke
   confirms the Personal product and purchase availability; Google Play billing,
   current account and property-work endpoints also pass. Never put the private
   key in Flutter defines or source control.
3. **Catalog submitted:** each subscription's review screenshot is COMPLETE and
   all approved prices are configured, with 175 starting-price records per product
   and **WAITING_FOR_REVIEW** read-back. Retain the Singapore availability scope.
   The owner has accepted the updated Developer Program License Agreement, with
   read-back confirming Free Apps Active. The owner also accepted the separate
   Paid Apps Agreement. After the owner's confirmation, both U.S. tax forms were
   submitted. Fresh read-back confirms Paid Apps, banking and both U.S. forms
   **Active**, with Singapore tax **Complete**. Account setup is cleared.
   Confirm the catalog is usable by the sandbox tester on the final build.
4. **Deployed and verified:** App Store Server Notifications **v2**, Production
   and Sandbox, point to `https://my.kivilo.app/api/apple/notifications`.
   Saving through the API initially left Apple's test service returning 4040007
   despite correct read-back; re-saving Sandbox in the web UI resolved it.
   The first signed TEST then exposed the SDK checking Production appAppleId
   before environment, while Sandbox omits that ID. Trying the Sandbox verifier
   first fixes this without accepting unsigned, Xcode or other-app payloads.
   Six regressions exercise the SDK's real identity/environment checks. After
   deployment, Apple's delivery status reports **SUCCESS**. No shared webhook
   password or relaxed certificate checks are used. Production API authentication
   still needs rechecking after the first public release.
5. Test real Apple sandbox purchases for Personal and a team, upgrade/downgrade,
   cancel/renew/expire/refund, pending approval, restore after reinstall, offline
   verification and switching Kivilo accounts. Check the correct workspace and no
   duplicate provider subscription. Mocked tests do not establish these results.
   The owner authorized review submission before these device checks could run.
6. **Published and uploaded:** native Shorebird iOS release **1.0.0+26** contains
   the StoreKit plugin and updated permission descriptions/privacy manifest.
   Do not patch this plugin into build 24/25. Confirm prices and restore on the
   final TestFlight build and deny notifications while using
   the app, downloading an update and resuming captures. Preserve all queued media.
7. **Submitted:** the six replacements and description including
   privacy/EULA links are saved, App Privacy is published, stale AI review notes
   are replaced and build 26 is selected. The app, 21 subscriptions and both groups
   are queued together in submission `2428f030-a3ac-4faf-b507-487a1a46b9ca`.
   Remediation is described in App Review Information; no separate review message
   was sent. Wait for Apple's decision. Public release remains manual.

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
answers now include these disclosures, with a published read-back recorded in
`mobile/store/submission/apple-privacy-published.json`. Identity verification
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

The 21 private subscription-review images are separately captured from the actual
`BillingScreen` and native StoreKit plugin on iPad, using the Xcode catalog with
the configured Singapore prices and fake account status. An isolated capture
harness hid its debug ribbon and selected each tier through the screen's existing
callback; product code was unchanged. These are UI evidence, not a claim of real
Apple server purchase verification, and the private review notes say so. Provenance,
hashes and Apple asset IDs are in
`mobile/store/submission/apple-subscription-review-screenshots.json`. Two Apple
uploads stalled after upload and completed after replacing only those assets.
The rejected submission is now Removed. All subscription and group versions are
attached to the new submitted version; no extra draft submission remains.

Verification on this work:

- Typecheck, zero-warning ESLint, production build and **248 web unit tests** pass,
  including the six additional notification identity/environment regressions.
- Flutter analysis and **525 tests** pass. The normal native simulator build and
  signed distribution build 26 compile with `in_app_purchase_storekit`; build 26
  is uploaded, processed and available in internal TestFlight.
- Targeted Apple/Stripe/Google/team integration tests pass (**91 tests** after the
  added cross-provider test). The broad database run passed 424 and failed eight:
  the already-recorded schema-versus-table permission expectations and a retained
  StoragePurge tombstone blocking account-deletion fulfillment. The data/privileges
  were not weakened to make those tests green.
- Browser run: 24/26 passed under Node 22; the PDF-clause case passes on the
  repository's documented Node 24. The remaining Stripe checkout case has no local
  Upgrade button because sandbox billing is not configured. The supplied IAP key
  authenticates to Apple's Sandbox API and signed notification delivery succeeds;
  real sandbox purchases remain **NOT RUN**. The owner chose simulator testing
  while the physical iPhone was unavailable and confirmed the phone test cannot
  be run yet after TestFlight 26 became available.
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
