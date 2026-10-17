# Plans and billing

## The model (decided 2026-10-15)

Figma-style. A plan belongs to a **workspace**: an agent's `Team`, or the agent alone when
they are on none. One `Subscription` row per workspace (exactly one of `teamId` /
`stakeholderId`); Free is the absence of a row.

| Plan | Price | Allowance |
|---|---|---|
| Free | S$0 | 1 active property per workspace |
| Pro | S$39 per agent seat a month | 10 active properties per seat, pooled across the team |

An **active property** is one whose tenancy has not ended and whose check-out is not
`COMPLETED`, so finished deals free a slot. Counted through `agentTenancies`, so a
teammate's deal counts against the team exactly as the team can see it. Over the limit
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
- `src/lib/billing.ts`: `syncSubscription(id)` always re-retrieves the subscription and
  writes the workspace row its metadata names, so replayed or out-of-order events are
  harmless. It refuses to replace a different live Stripe subscription (two members
  checking out at once); the throw is recorded by error tracking and alerts us, and one
  of the two must be refunded and canceled in Stripe by hand. A non-live subscription
  that is not the row's is ignored. `managedById` is set when a subscription first lands
  and is ours after that.
- `/account` syncs on the way back from Checkout (`?checkout={CHECKOUT_SESSION_ID}`) and
  from the portal (`?billing=returned`), so the plan is current before the webhook lands.
- `src/app/api/stripe/webhook/route.ts`: verifies the signature on the raw body, then
  `checkout.session.completed` and `customer.subscription.{created,updated,deleted}` all
  go through `syncSubscription`. A failure is a 500 that Stripe retries.
- `pnpm team:set` refuses to put an agent paying on their own onto a team while that
  subscription is live. Fulfilling an account deletion cancels, immediately, any live
  subscription the person manages and clears them as manager, so a teammate can
  subscribe again on a customer of their own.

Local: `stripe listen --api-key <sandbox key> --forward-to localhost:3000/api/stripe/webhook`
and put the secret it prints in `.env.local` as `STRIPE_WEBHOOK_SECRET`. Checkout works
without it, because the return page syncs. `e2e/billing.spec.ts` pays with a test card.

Not handled: GST (no `automatic_tax`; needs a registration first), disputes, refunds and
early fraud warnings (watch them in the Stripe dashboard), and a manager who leaves a team
while still paying for it.
