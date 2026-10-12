# M5: who fixes, who pays

Proposed 2026-10-12. Builds on the maintenance case in `plans/m5-maintenance.md`.

A tenant reports something broken. Before or while it is repaired, the two sides agree
who arranges the repair and who pays for it. Today the landlord side always arranges
and the case has no notion of cost responsibility at all, so the argument happens in
WhatsApp and is lost by check-out, which is exactly when it matters.

## Principles

- **Proposed, never decided by us.** One side proposes, the other accepts or rejects.
  Kivilo states the proposal in one plain sentence and records the answer. It never
  rules on liability, in keeping with scribe-not-witness.
- **The repair does not wait for the money.** A leaking pipe gets fixed while the cost
  is argued. Responsibility is a parallel track on the case, not a gate on its status.
- **Who arranges and who pays are separate questions.** Singapore tenancies commonly
  have the landlord arrange a repair while the tenant pays the first S$150 to S$200
  (the minor repair clause). One field cannot express that.
- **Append-only.** A proposal is never edited. Changing an agreed split means a new
  proposal the other side accepts, and the old one is kept as superseded.

## Sides

Landlord and agent are one side, tenant the other. The agent acts for the landlord on
the tenancy they are appointed to, as it already does for maintenance. Either side may
propose; only the other side may respond.

## Model

New `ResponsibilityProposal`, one row per proposal:

| Field | Notes |
|---|---|
| `caseId`, `proposedById` | |
| `arrangedBy` | `LANDLORD` or `TENANT`: who books the contractor and logs the visit |
| `payer` | `LANDLORD`, `TENANT`, or `SHARED` |
| `tenantCap` | Required when `SHARED`: tenant pays up to this, landlord the rest |
| `basis` | `MINOR_REPAIR_CLAUSE`, `TENANT_CAUSED`, `FAIR_WEAR`, `LANDLORD_OBLIGATION`, `OTHER` |
| `reason` | Required free text |
| `clauseRef` | Optional, e.g. "Clause 5(c)". Free text until contracts are read (below) |
| `status` | `PENDING`, `ACCEPTED`, `REJECTED`, `WITHDRAWN`, `SUPERSEDED` |
| `respondedById`, `respondedAt`, `responseNote` | Rejection requires a note |

At most one `PENDING` per case (partial unique index). The case's current agreement is
its latest `ACCEPTED` proposal. Every transition writes a `MaintenanceEvent` and a
notification to the other side, through the existing outbox.

With visit costs already recorded, the case computes each side's share: "Total S$420.
Tenant S$150, landlord S$270." Kivilo records the split; it does not move money.

## Role flip

Until something is accepted, the landlord side arranges, which is today's behaviour.
Once an accepted proposal says `arrangedBy: TENANT`, the tenant logs the visit and the
landlord side confirms fixed or not fixed. This loosens the two role checks in
`addMaintenanceVisit` and `verifyMaintenanceVisit` to depend on the agreement instead of
the role alone.

## UX: one card on the case screen

**Nothing proposed:** "Who pays? Not agreed yet." Button: *Propose*.

**Proposing:** three large choices, then two short questions.
1. *Landlord pays* / *Tenant pays* / *Tenant pays the first S$__, landlord the rest*
2. Who arranges the repair? *Landlord* / *Tenant*
3. Why? Reason chips, a note, and an optional contract clause.

A preview shows the exact sentence the other side will read before it is sent.

**Received:** the sentence, with the proposer named.
> **Landlord proposes:** you pay the first S$150, landlord pays the rest. Landlord
> arranges the repair. Reason: minor repair clause (Clause 5(c)).

Buttons: *Accept*, *Suggest different* (rejects and opens a counter-proposal prefilled),
*Reject* (note required).

**Sent:** "Waiting for the tenant." Button: *Withdraw*.

**Agreed:** green, "Agreed by both on 12 Oct", the split, and the computed amounts.
**Rejected with no counter:** amber, "Disputed", button *Make a new proposal*.

## Check-out

A case closed with responsibility still disputed or never agreed is flagged on the
check-out review as an open cost question, next to the room it concerns. This is the
dispute moment the product is built for, and the record is why we win it.

## Later: reading the contract

When tenancy PDFs are extracted (the term-explanations slice in `m5-maintenance.md`),
`clauseRef` becomes a link to the extracted clause with its page. The app can then
prefill a *suggested* proposal from the clause: "Your agreement, clause 5(c): tenant
pays the first S$150 of each minor repair." A human still sends it. No legal
conclusion, no fairness score.

## Build order

1. Schema, hand-written migration, domain functions in `src/lib/maintenance.ts`,
   API endpoints, integration tests for every transition and both sides. ~1 day.
2. Flutter card and proposal sheet. ~1 day.
3. Role flip for tenant-arranged repairs, with tests. ~half a day.
4. Check-out flag. ~half a day.

Property timeline is a separate plan.

## Decided 2026-10-12

- The agent may accept or reject for the landlord, because in practice the agent is the
  one using the app. It is a per-tenancy setting, `agentMayAgreeCosts`, on by default,
  that only the landlord can switch off. With it off the agent can still propose and
  withdraw, but not answer or counter a tenant's proposal.
- The minor repair cap is stored per tenancy now (`minorRepairCap`), settable by the
  landlord or agent, and only prefills the shared option. The tenant still answers every
  proposal.
- Accepting a proposal on a case still `REPORTED` acknowledges it: both sides engaging
  with the cost is acknowledgement.

## API

- `POST /api/v1/maintenance/[caseId]/responsibility`: propose (or counter, or replace
  your own side's open proposal).
- `POST /api/v1/maintenance/[caseId]/responsibility/[proposalId]`:
  `{ decision: ACCEPT | REJECT | WITHDRAW, note }`. Reject requires a note.
- `PATCH /api/v1/tenancies/[id]`: `{ minorRepairCap, agentMayAgreeCosts }`.
- The case detail gains `canLogVisit` and a `responsibility` block: `agreement`,
  `pending`, `history`, `shares`, `minorRepairCap`, `canPropose`, `canAnswer`,
  `canWithdraw`. Each proposal carries a server-written `summary` sentence so both
  clients word it identically.
