# Android and team billing

Implementation started 26 October 2026. Google Play sales remain disabled until the
runtime identity, notification delivery, catalog activation and licensed store test
are verified. This is a new native Android release, not a Shorebird patch. iOS keeps
its existing consumption-only behavior.

## Plans and workspace ownership

- Personal: one seat, 25 active properties. Team: 25 active properties per purchased
  seat, pooled within that operational `Agency`. The Singapore monthly price remains
  S$39 per seat. Google Play supplies the displayed localized price and purchase sheet.
- A user selects Personal or one of their accepted teams. Owners/managers can start a
  team subscription; only its recorded payer can subsequently manage it. Team billing
  does not grant access to personal properties or other teams.
- `Subscription.agencyId` is a third exclusive target alongside the older
  `stakeholderId` and billing-only `teamId`. Existing legacy billing groups remain
  supported. Explicit Personal views exclude Agency properties; omitted API context
  preserves the aggregate response installed older builds expect.
- Creating a property, moving personal work into a team, and a renewal that adds a
  property to the active pool check the destination plan. Existing work remains
  available after a downgrade. Paid teams cannot accept more members than their seats.
- Web uses Stripe Checkout and its portal for both Personal and team subscriptions.
  Android uses Google Play for both. A resumable purchase with one provider blocks a
  new purchase with the other. Moving providers requires the old subscription to end.
  Already-open purchase sheets can still race: the first verified entitlement wins.
  A new rejected Play purchase is refunded; a Stripe purchase that completes second
  uses the existing operator alert/manual cancel-and-refund path. Do not describe
  this guard as a guarantee that concurrent checkouts cannot create two charges.
- Stripe fulfillment rechecks that a new Agency payer is still an active owner or
  manager under the Agency lock. A paid session completed after departure/demotion
  leaves a deduplicated operational incident for cancellation/refund and no grant.
  Existing subscriptions still synchronize cancellation after payer deletion.

## Catalog

`src/lib/google-play-catalog.ts` is the server allowlist. `kivilo_pro` is Personal;
`kivilo_pro_team_1` through `kivilo_pro_team_20` provide exact team seat counts. Each
product has one auto-renewing `monthly` base plan. Capacity differences are separate
products, not base-plan variants. No trials, installments, prepaid plans or offers
are sold by this implementation.

The initial catalog is Singapore-only, S$39 × seats, with seven days of grace and
30 days on hold. Out-of-app resubscription is disabled because a new purchase must
first bind to an authenticated Kivilo workspace. Cancellation/restoration while an
existing subscription remains valid follows Google Play's lifecycle.

Google's publicly documented recurring API currently does not expose the new
early-access multi-quantity subscriptions. Android therefore supports 1–20 team seats;
web seat quantities remain flexible. One Google account cannot own the same product
twice for two different workspaces. The app detects that situation and refuses to
reassign an existing purchase. Personal and one-seat team products are distinct.

Use a separate operator credential for setup:

```sh
GOOGLE_PLAY_SETUP_CREDENTIALS=/secure/path/operator.json pnpm billing:play:setup
GOOGLE_PLAY_SETUP_CREDENTIALS=/secure/path/operator.json pnpm billing:play:setup --create-drafts
GOOGLE_PLAY_SETUP_CREDENTIALS=/secure/path/operator.json pnpm billing:play:setup --activate
```

The default command audits without changing anything. Creation adds missing drafts;
it refuses to silently rewrite an existing catalog with different prices/settings.
Activation is explicit. No secret, purchase token or raw SDK diagnostic is printed.

## Verification and fulfillment

`preparePlayPurchase` creates a durable opaque account binding for the verified payer
and workspace before opening Google Play. The app sends that binding as its obfuscated
account ID. Neither client seat counts nor client purchase states grant access.

`reconcilePlayPurchase` retrieves `purchases.subscriptionsv2.get` under the workspace
lock used by Stripe. It checks app/catalog, monthly plan, a single supported line,
account binding, current authorization, replacement-token ownership and expiry.
It commits the entitlement before server-side acknowledgement. Purchase history and
non-transferable deletion tombstones survive replacement; old token deliveries cannot
restore a replaced entitlement. Test purchases are marked and never credited as live
paid acquisition revenue.

Active, grace and canceled-but-unexpired purchases grant Pro. Pending, on-hold,
paused and expired purchases do not. Expiry is enforced locally even if a notification
is late. Hold/pause still block switching providers because Google can resume billing.
Seat changes use Play replacement with time proration; the purchase sheet explains the
charge and renewal date. The server rejects fewer seats than the current active members.

The app listens from startup, restores on sign-in/foreground return and retries failed
verification. Restores are scoped to the signed-in owner; a new account waits for its
own query. Unresolved tokens keep their retries across unrelated purchase updates. It never acknowledges or grants a subscription independently. Returning
from Play settings refreshes the selected workspace's plan.

A known new purchase that cannot be fulfilled due to a conflicting subscription or a
permission/seat race is retained as a durable rejection and revoked with a full refund.
Unknown bindings, tokens belonging to another user, and previously granted purchases
are never automatically refunded. An interrupted refund remains pending for retry;
inspect unresolved rejection rows before taking any manual financial action.

Account erasure first freezes each billing binding, stops future Google payments and
then removes its payer link. It retains the token tombstone and blocks restoration
into a different Kivilo account. A failed cancellation stops erasure for retry.

## Runtime and notifications

Production-sensitive environment variables:

- `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`: dedicated server-only service account, with
  Kivilo app-scoped purchase/financial read and order/subscription management access.
  It does not need publishing/catalog or project-wide Cloud roles.
- `GOOGLE_PLAY_RTDN_AUDIENCE`: exact audience for the authenticated Pub/Sub push,
  `https://my.kivilo.app/api/google-play/rtdn`.
- `GOOGLE_PLAY_RTDN_SERVICE_ACCOUNT_EMAIL`: expected push identity.
- `GOOGLE_PLAY_BILLING_ENABLED=true`: enables new purchase contexts only after setup.

Create a Kivilo-only Pub/Sub topic and allow
`google-play-developer-notifications@system.gserviceaccount.com` to publish to it.
Connect that topic in Play Console's Monetization setup. Its push subscription targets
the RTDN URL and uses an explicit service-account identity and audience; Google Pub/Sub
needs token-creation permission for that identity. The handler verifies Google's token,
audience and verified service-account email before decoding the message.

Subscription and voided-purchase events re-fetch current state. Invalid identities are
rejected; failed verification returns 503 for Pub/Sub retry. Google test notifications
are accepted without granting access. A successful synthetic HTTP request is not proof
that Google-origin purchase notifications or real fulfillment work.

## Release checks

Apply additive migrations before deploying the backend. Audit existing Agency work
against previous billing coverage; do not duplicate a personal subscription into
multiple Agency entitlements. The 26 October read-only production audit found four
Agencies, two with active work and none above Free's five-property allowance. There
were no active Stripe-paid subscriptions; one Agency property was covered by a legacy
complimentary plan. Legacy personal/group comps remain in place, while the new Agency
pool needs its own explicit plan. No complimentary entitlements were created by setup.

Build a new signed Android bundle from pinned source using the approved Shorebird
Flutter version. Do not patch an existing native base or use native-difference overrides.
Start with the internal track and a Google Play license tester. Exercise Personal and
team purchase, pending payment, restore/restart, renewal, grace/hold, cancellation,
refund, seat replacement and account/workspace isolation with Play's test payment
methods. No real payment is needed. Record the actual store result separately from
mock/API integration and widget tests before enabling the public purchase journey.

Google Play's payments profile must have a payout method for receiving earnings. Web
Stripe tax collection remains off under the owner's existing confirmation that the
business is not Singapore GST-registered; this change does not alter Stripe tax settings.

Primary references: [Play integration](https://developer.android.com/google/play/billing/integrate),
[subscription lifecycle](https://developer.android.com/google/play/billing/lifecycle/subscriptions),
[subscription products](https://developers.google.com/android-publisher/api-ref/rest/v3/monetization.subscriptions),
[authenticated Pub/Sub push](https://docs.cloud.google.com/pubsub/docs/authenticate-push-subscriptions).

## Deployment progress, 26 October 2026

The four additive billing migrations are applied in production (45 total), with
existing record counts unchanged and RLS/client privilege checks passing. Dedicated
`kivilo-play-billing` and keyless `kivilo-play-notifications` service accounts exist in
`nottoosweetlabs`. The runtime credential, RTDN audience and expected identity are
production-only sensitive Vercel variables. The topic `kivilo-play-rtdn` permits
Google Play notification publishing, and `kivilo-play-rtdn-push` uses authenticated
HTTPS delivery, an exact audience, 60-second acknowledgement, 10–600 second retry
backoff, seven-day retention and no inactivity expiry. Play app access, Console RTDN
linkage and Google-origin delivery verification remain pending. Purchases remain
disabled and all 21 catalog entries remain drafts.

Final review adds five Agency Stripe race scenarios (56 targeted integration tests
pass) and six native recovery scenarios (424 Flutter tests pass, analysis clean).
The full web E2E run had 24 initial passes and two failed scenarios; focused reruns
passed both, including a real Stripe sandbox purchase and four HTTP 200 webhook
deliveries. The PDF scenario initially received an intermittent Next development
route 404, then passed with a fresh server without code changes.
