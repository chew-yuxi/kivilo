# Plans and billing

## The model (decided 2026-10-15)

Figma-style. A plan belongs to a **workspace**: an agent's `Team`, or the agent alone when
they are on none. One `Subscription` row per workspace (exactly one of `teamId` /
`stakeholderId`); Free is the absence of a row.

| Plan | Price | Allowance |
|---|---|---|
| Free | S$0 | 5 active properties per workspace |
| Pro | S$39 per agent seat a month | 25 active properties per seat, pooled across the team |

An **active property** is one whose tenancy has not ended and whose check-out is not
`COMPLETED`, so finished deals free a slot. Count each property once in its lead agent's
billing workspace, including private tenancies. Access is separate: a collaborator can
work on a shared tenancy without it consuming their own workspace's property allowance,
and joining or leaving a billing team never changes explicit property sharing. Over the limit
(after a downgrade) nothing is locked; the workspace only cannot add another property.

Per seat is the agent price in `product-spec.md` (S$30–50/mo). The per-active-property
price in the Gingervale deck is a partner (B2B2C) price and per-report pricing is for
self-serve landlords and tenants; neither is built.

## Where it lives

- `src/lib/plan.ts`: the only place limits are decided (`workspacePlan`,
  `assertCanAddProperty`). `createInspection` calls the guard; the API maps the refusal to
  403 `plan_limit`.
- `/account` (web): plan, usage, seats, renewal. `/inspections/new` shows a limit panel
  instead of the form, because a thrown server action message is hidden in production.
- `GET /api/v1/me/plan` and the app's Account "Plan" card: plan and usage only.
- `pnpm plan:set --email=… --plan=pro|free [--seats=N]` comps a workspace (status
  `comped`). Used for pilots, our own accounts; the store reviewer fixture comps itself.

## Store rules

Agents buy on the web only. The app never shows a price, an upgrade button, or where to
buy (Apple 3.1.1 / 3.1.3 forbid steering to an outside purchase on the Singapore
storefront). This lowers review risk; it does not remove it.

## Stripe (built 2026-10-16)

Stripe is the truth about what a workspace paid for; the `Subscription` row is a copy that
`plan.ts` reads without a network call. Comps (`status: comped`) have nothing in Stripe.

- `pnpm billing:setup [base URL]` (`scripts/setup-billing.ts`): idempotent. Product
  `kivilo_pro`, the SGD 39/month per-seat price (lookup key `kivilo_pro_seat_monthly`), the
  Customer Portal configuration (seat quantity, cancel at period end, card, invoices;
  found again by its `kivilo: pro_portal` metadata), and with a base URL the webhook
  endpoint at `<base>/api/stripe/webhook`, whose signing secret is printed only when it
  is created. Nothing account-specific lives in env except the keys.
- `src/lib/billing-actions.ts`: `startCheckout` (subscription mode, one seat per team
  member or 1, `teamId`/`stakeholderId` + `managedById` in `subscription_data.metadata`,
  reuses the agent's own customer only) and `openBillingPortal` (strictly the member who
  manages the plan, since the portal shows their card and invoices; anyone else gets
  "Not found"). Checkout is open to the manager, or to anyone when nobody manages it.
- `src/lib/billing.ts`: `syncSubscription(id)` locks the workspace, re-retrieves the subscription,
  checks mode/customer and the supported Kivilo catalog, then writes the current state.
  Concurrent deliveries cannot overwrite a later read with an earlier network response. It refuses to replace a different live Stripe subscription (two members
  checking out at once); the throw is recorded by error tracking and alerts us, and one
  of the two must be refunded and canceled in Stripe by hand. A non-live subscription
  that is not the row's is ignored. `managedById` is set when a subscription first lands
  and is ours after that.
- `/account` syncs on the way back from Checkout (`?checkout={CHECKOUT_SESSION_ID}`) and
  from the portal (`?billing=returned`), so the plan is current before the webhook lands.
- `src/app/api/stripe/webhook/route.ts`: verifies the signature on the raw body, then
  `checkout.session.{completed,async_payment_succeeded}` re-reads the session and syncs
  only once payment is paid or no payment is required. Subscription created, updated and
  deleted events also go through `syncSubscription`. `invoice.payment_succeeded` records
  the paid conversion described below. `invoice.paid` and `invoice.payment_failed`
  reconcile fresh subscription state. Refund, dispute and early fraud-warning events
  resolve InvoicePayments and fresh invoices to affected subscriptions and record
  deduplicated admin incidents. A failure is a 500 that Stripe retries.
- `pnpm team:set` refuses to put an agent paying on their own onto a team while that
  subscription is live. Fulfilling an account deletion cancels, immediately, any live
  subscription the person manages and clears them as manager, so a teammate can
  subscribe again on a customer of their own.

Local: authenticate the Stripe CLI to the development sandbox, run
`stripe listen --forward-to localhost:3000/api/stripe/webhook`, and store its signing
secret in the uncommitted `.env.local` as `STRIPE_WEBHOOK_SECRET`. Use that sandbox's
server key as `STRIPE_SECRET_KEY`. Checkout requires both. Webhooks are required even
when the return page can refresh the plan. `e2e/billing.spec.ts` uses a sandbox test card;
the billing integration suite uses a Stripe stand-in and real signature verification.

## Paid acquisition milestone (2026-10-26)

`recordPaidInvoice` re-fetches the invoice, including `amount_paid_off_stripe`, and requires
live mode, paid status, a subscription parent and a positive amount collected through
Stripe (`amount_paid - amount_paid_off_stripe`). It follows the invoice's subscription,
syncs it, and verifies the exact current subscription and customer. The local row's
`managedById` is the payer; a stale subscription or cleared manager earns no conversion.
The acquisition write rechecks ownership in its condition.

Only an existing `AccountAcquisition` row verified by the invoice's `paid_at` can receive
`firstPaidAt`, invoice id, amount in the currency's smallest unit, and currency. The earliest
verified payment wins, even when invoices arrive out of order; retries and later
payments cannot overwrite it. Legacy accounts
get no invented signup row. Active/trial/comped access, checkout redirects, zero-value
invoices, test payments and payments made outside Stripe do not count. Refunds do not
erase this historical first-payment milestone; it is not a net revenue ledger.

`invoice.payment_succeeded` is deliberate: `invoice.paid` can also be emitted when an
invoice is marked paid outside Stripe. The fresh invoice checks remain mandatory.
See Stripe's [event definitions](https://docs.stripe.com/api/events/types) and
[invoice fields](https://docs.stripe.com/api/invoices/object).

## Live readiness (checked 2026-10-26)

**Live setup is in progress; no real payment has been taken.** The operator saved the
runtime restricted key through a masked prompt as a write-only Vercel Secret scoped to
Production. Preview/Development kept their separate sandbox setting. The key remains
unreadable to the operator tooling; permission checks run inside the deployment environment.

Stripe's live Account status shows Payments and Payouts Active, with no active tasks
(26 October). The separate temporary setup key created product `kivilo_pro`, live price
`price_1UUfMoHP9VOWpFf0nNMpteAi` (SGD 3900/seat/month) and portal configuration
`bpc_1UUfMpHP9VOWpFf03NISzUNe`. The setup key stays only in a private process's memory.
Live webhook installation, runtime permission verification and deployment are pending. The first
remote preflight was blocked before building because the previous session's Git author
is not an authorized Vercel project author; no live API probe ran in that deployment.

Verification of this change: full typecheck, zero-warning ESLint, 207 unit tests,
production build and all 25 Playwright tests passed. Sandbox Checkout and portal passed;
signed subscription.created, invoice.payment_succeeded, invoice.paid and checkout.session.completed
webhooks independently returned HTTP 200. The integration run passed 340 tests and
failed eight existing tests (four deletion tests blocked by a pending local StoragePurge,
four security assertions expecting table denial when the local DB denies schema access).
A clean checkout of 5bc75b1 reproduces exactly those eight failures. The subsequent
historical-subscription risk fix passed all 20 risk integration cases. No schema/grant
changes or general storage cleanup were performed to make the tests pass.

`checkoutOpen()` requires a server key plus a `whsec_` signing secret everywhere, and
a live server key in Vercel production. This checks configuration presence and mode;
it cannot prove account activation, key permissions, webhook delivery or catalog health.

Operator setup order:

1. Create and activate the business's Singapore Stripe account in the Dashboard. Complete
   Stripe's requested business/identity information, payout account and customer-facing
   details. Confirm the live account can accept charges and receive payouts.
2. Validate the deployed billing flow in a separate sandbox, including signed webhook
   delivery, retries, a delayed payment, failed renewal, cancellation and account deletion.
   Verify the lifecycle/risk behavior below before declaring live readiness.
3. Use a separate restricted setup key in a secure operator environment to run
   `pnpm billing:setup https://my.kivilo.app` against the live account. This creates live
   catalog/portal/webhook resources; it must be an intentional operator action. Match
   the webhook API version to the installed SDK (`2026-09-30.endive` at this check).
   The script prints a new endpoint's secret once; store it directly in the secret store,
   never in chat, source control or shared logs. For an existing endpoint, retrieve its
   signing secret from the Stripe Dashboard and verify its API version there.
4. After catalog, webhook and permission checks, configure Vercel **production sensitive
   environment variables**: the runtime restricted live key in `STRIPE_SECRET_KEY` and
   that live endpoint's `whsec_` in `STRIPE_WEBHOOK_SECRET`. Keep local/preview keys and
   webhook secrets in their sandbox. Deploy only when ready to open paid checkout.
5. Confirm the live endpoint is enabled and deliveries return 2xx, then reconcile the
   first authorized real customer payment with its invoice, local subscription and paid
   acquisition milestone. A test-card transaction cannot verify a live payment.

Live and sandbox resources are separate; the existing sandbox price cannot be used in
live mode. Follow Stripe's [go-live checklist](https://docs.stripe.com/get-started/checklist/go-live)
and [key separation guidance](https://docs.stripe.com/keys).

`pnpm billing:verify` checks the sandbox configuration; `pnpm billing:verify --live`
requires a live key. It validates the current price, explicitly expanded portal rules,
and runtime read access before creating and immediately expiring one unpaid Checkout.
It prints no key, Checkout URL or customer details. Run it in a remote production build
with `vercel deploy --prod --skip-domain` to use the write-only production key without
retrieving it or changing the current domain. This does not verify paid fulfillment,
subscription cancellation, portal session creation or Stripe webhook delivery.

Restricted key permissions follow the actual SDK calls in this repo:

| Key | Required resource access |
|---|---|
| Runtime | Checkout Sessions write; Subscriptions write (includes cancellation on account deletion); Invoices read (including InvoicePayments); Charges read; Prices read; Customer Portal write (the Dashboard groups sessions and configurations) |
| Temporary setup | Products write; Prices write; Customer Portal write; Webhook Endpoints write |

Write includes read. Start with these mapped permissions, validate every path with a
sandbox restricted key, and inspect Stripe's permission errors for any dependent
permissions before issuing the live equivalent. The runtime has no need to create
products, prices or webhook endpoints. Retire the separate setup key after use. See
[restricted key setup](https://docs.stripe.com/keys/restricted-api-keys).

Lifecycle handlers reconcile current subscription state on paid/failed invoices, rather
than treating an old event as current access. Mode and catalog checks apply to retrieved
resources as well as signed events; connected-account events are ignored. Workspace
advisory locks serialize subscription sync, including the first row creation.

Risk events record operator tasks in `/admin`: follow the Stripe link, review refunds,
respond to disputes before the shown deadline and investigate fraud warnings. Records
contain only allowlisted IDs, status, amount/currency and deadline; no raw event payload
or customer details. They are deduplicated, excluded from error emails and retained for
90 days. Historical or duplicate Kivilo subscriptions still produce incidents after
fresh catalog/mode/customer checks even if their ID no longer occupies the local row.
No automatic refund, cancellation, access change or acquisition rollback occurs.
Concurrent duplicate checkouts still need manual refund/cancellation resolution.
See [subscription webhook guidance](https://docs.stripe.com/billing/subscriptions/webhooks).

The operator confirmed on 26 October that Nottoosweetlabs is **not GST registered**.
GST/Stripe Tax remains off: no `automatic_tax` is enabled. Confirm applicable
registrations with the business's tax adviser, then configure the confirmed live tax
settings, product tax code and price tax behavior before enabling automatic tax. A
sandbox registration does not establish live collection. See
[recurring payment tax setup](https://docs.stripe.com/billing/taxes/collect-taxes?tax-calculation=stripe-tax).
