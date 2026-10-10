# M5: maintenance history and tenancy intelligence

Decided 2026-10-10. Maintenance ships before clause vetting and uses the existing
property/tenancy spine and authorization boundary.

## First slice

- Flutter is role-aware for tenants, landlords and agents. One verified Stakeholder may
  hold several roles across tenancies; there are no parallel role accounts.
- `PropertyAsset` is durable across tenancies. Linking an inspection item to an asset is
  a human decision; matching serials may be suggested but never merged automatically.
- A maintenance case has an append-only event timeline, repair visits, immutable private
  evidence and tenant `FIXED` / `NOT_FIXED` confirmation. `NOT_FIXED` reopens the same
  case so repeated attempts remain one history.
- Four completed visits for the same asset in rolling 365 days notify the landlord and
  active agent once. The product shows the count and does not decide whether to replace.
- Tenants see their tenancy only. Landlords see the property's history. An agent manages
  maintenance only through the end of the tenancy on which they are appointed.
- Email delivery is an outbox independent of the domain transaction. Failed mail never
  rolls back or duplicates the maintenance record.
- Plumbing and locksmith entries are operator-curated contacts, not a marketplace.
  Immediate danger leads with the official Police 999 and SCDF 995 numbers.

Providers are added or re-verified without a public admin surface:

```bash
pnpm provider:upsert --name="Provider name" --category=PLUMBING \
  --phone=61234567 --areas=ALL --hours="24 hours"
```

## Evidence and reports

Maintenance bytes use the private `captures` bucket, deterministic client ids, signed
direct uploads and retry-until-confirmed registration. Originals are never overwritten.
Working inspection and check-out views may link to the live case. Sending a report for
signature must copy selected evidence metadata into its immutable assessment snapshot;
the public signed report must never read a mutable maintenance timeline.

## API

The native API adds tenancy membership, maintenance case, event, visit, verification,
evidence, property-asset, notification and service-directory endpoints under `/api/v1`.
Handlers are transport only and delegate to `src/lib/maintenance.ts`; authorization
remains in `src/lib/auth.ts`. Missing and refused ids return the same 404.

## Native push

FCM is a transport only; Supabase remains the identity and authorization system. The
Flutter app registers its current installation through `/api/v1/notifications/device`
and disables it before sign-out. The durable notification row is expanded into one
delivery per active device, with independent attempts, a short delivery lease, stale-token
retirement and deep links into the maintenance case. Email failure cannot block push and
push failure cannot lose the in-app notification.

Production setup requires `FIREBASE_SERVICE_ACCOUNT_JSON` on the web deployment and the
four public Firebase values in the Flutter build defines. Enable the FCM HTTP v1 API. For
iOS, upload the APNs authentication key in Firebase and use a provisioning profile with
the Push Notifications entitlement; background remote notifications are already declared
in the Xcode project.

## Later: term explanations

Accept a private tenancy PDF and extract page-addressed clauses with confidence and
human-review state. Compare against a versioned CEA reference pack and explain deviations
without a fairness score or legal conclusion. The first checklist covers deposit months,
minor-repair cap, problem-free period, consent/reimbursement timing, insurance allocation,
and fair wear and tear. Each explanation preserves its source version and page reference.

Primary references:

- CEA agreements and checklists: https://www.cea.gov.sg/real-estate-professionals/agreements-and-checklists/
- CEA private residential tenancy template: https://isomer-user-content.by.gov.sg/71/60052678-1592-4904-b443-3269a655e0de/Tenancy%20Agreement%20Template%20for%20Private%20Residential%20Property.pdf
- Singapore Courts small-claims evidence guidance: https://www.judiciary.gov.sg/civil/how-to-file-serve-small-claim
- Singapore emergency contacts: https://www.gov.sg/contact-us/
