# Plans and billing

## The model (decided 2026-10-15)

Figma-style. A plan belongs to a **workspace**: an agent's `Team`, or the agent alone when
they are on none. One `Subscription` row per workspace (exactly one of `teamId` /
`stakeholderId`); Free is the absence of a row.

| Plan | Price | Allowance |
|---|---|---|
| Free | S$0 | 1 active property per workspace |
| Pro | S$39 per agent seat a month | 25 active properties per seat, pooled across the team |

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

## Not built yet: Stripe (waiting on Yuxi's go-ahead to provision)

Until then, `/account` asks Free agents to email us and we comp them with `plan:set`.

1. `vercel integration add stripe` (sandbox, development + preview), `vercel env pull`,
   then the provider skill for the SDK.
2. `scripts/setup-billing.ts`: product + SGD 39/month per-unit price (lookup key
   `kivilo_pro_seat_monthly`), Customer Portal config (seat changes, cancel at period end,
   card, invoices). Idempotent, like `setup-storage`.
3. `src/lib/billing.ts`: `startCheckout` (subscription mode, quantity = team size,
   workspace key + `managedById` in `subscription_data.metadata`), `openBillingPortal`
   (manager only), `syncSubscription(id)` that always re-retrieves from Stripe and upserts,
   so replayed or out-of-order events are harmless. The return page syncs too, so the plan
   flips before the webhook lands. Refuse to overwrite a workspace's different live
   subscription (two members checking out at once) and let the error alert us.
4. `src/app/api/stripe/webhook/route.ts`: verify the signature on the raw body before
   reading it; `customer.subscription.{created,updated,deleted}` → `syncSubscription`.
5. `set-team.ts` must refuse to move an agent whose own live Stripe subscription would
   be orphaned by joining a team; account deletion must cancel a subscription they pay.
6. Replace the mailto lines on `/account` with "Upgrade to Pro" and "Manage billing".
