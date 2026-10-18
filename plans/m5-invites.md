# M5: inviting landlords and tenants

Planned 2026-10-13 with Yuxi. Singapore only; agents pay, landlords and tenants are free
users brought in by the invite. Landlords and tenants live in the app (Yuxi: the install
is what makes it sticky), so an invite has to land them somewhere that is theirs and
shows them the thing they were told about.

## How a tenancy actually runs

Per Yuxi, and what the flow below is built on:

- The landlord is usually not at the handover. The agent and tenant walk the unit.
- After the handover the agent steps away unless paid to manage the tenancy. Repairs run
  between landlord and tenant directly.
- The tenant finds defects in the first weeks. They are both a repair and a dated update
  to the check-in report, so check-out compares against them. Singapore agreements
  commonly give a 30-day defect period, but it varies, so the window is per tenancy.
- Small teams share deals. The first users are two agents on one team.

## The flow

Day 0, handover. The agent sends the report for signature; Kivilo shows who it will email
and asks for the landlord's address if missing. The tenant signs on the agent's phone,
then gets a QR code to the app and a deadline for flagging defects. The landlord gets
"Review and sign the check-in report for <unit>", installs, reads and signs on their own
phone. The agent is told when both have signed.

Days 1 to 30. The tenant reports a problem and ticks "it was like this when I moved in":
a repair, plus an append-only dated update on the report. The signed part never changes.
The landlord acknowledges or disputes the update and arranges the repair.

## Order

1. **Landlords and tenants read the report in the app, on their own home.** Done.
2. **Team sharing.** Done. Teammates see and work on each other's deals as if they were the
   deal's agent; the deal's agent stays the named one, `conductedBy` records who walked
   it. Set up by command, no team screens yet. Leaving ends access; deals stay with
   their agent. Every agent clause needs it: `src/lib/auth.ts` and the two in
   `src/lib/maintenance.ts` that bypass `tenancyScope`.
3. **The landlord signs remotely.** Done. A landlord or tenant signs as themselves, on
   their own tenancy, while the report awaits signature (`authorizeOwnSignature`,
   `POST /api/v1/inspections/[id]/report/signature`), through the same transaction as a
   signature on the agent's phone. Not yet: telling the agent when the report completes;
   it belongs with the emails in 4.
4. **The tenant's copy at handover.** Done: QR after signing, email with the defect deadline.
5. **"It was like this when I moved in"**, with a per-tenancy defect window. Done.

Later: asking for a missing email at signing (the address may already belong to someone,
and the deal then has to move onto them), and app links that open emailed links in the
app.

Prerequisite, done: one Stakeholder per email (`20261013160000_stakeholder_email_unique`),
so one login sees every deal that names it.

## 1, as built

**What a party may read.** A landlord or tenant reads an inspection on their own tenancy
from `AWAITING_SIGNATURE` on, when `assertOpen` has frozen it, since the landlord signs
from it. `authorizeReport` in `src/lib/auth.ts`. The agent rules are unchanged and still
govern every mutation and the working inspection endpoint, which carries draft findings.

**What they read is what was agreed.** The shared report page and
`GET /api/v1/inspections/[id]/report` load through one `reportInclude`
(`src/lib/report.ts`): photos only, only captures stamped at review, the latest published
assessment.

**Additive fields only.** Released builds parse responses with required casts.
`latestReport` on each tenancy and `reportId` on report timeline events are new; the
timeline's `link` stays null for parties, because build 22 routes any non-inspection link
to the maintenance screen.

**Their own home.** Someone who is only a landlord or tenant (roles without `AGENT`, no
inspections of their own) sees their tenancies with the latest report and Repairs, and
no Inspections tab. "Start a check-in" is under Account for them. The sign-in screen no
longer pitches inspectors.

## 4 and 5, as built (18 October 2026)

After the tenant's first check-in signature, the inspection and report screens show a
QR for `/handover/[inspectionId]`. It contains no email or bearer credential. The page
requires the tenancy's tenant account; other accounts and missing reports get the same
response. The transactional email outbox sends the tenant this link and the deadline.
The signed PDF still goes to both parties and the conducting agent after both signatures.

The defect window defaults to 30 Singapore calendar days, counting the tenancy start as
day one. The landlord or agent can set 0–365 days before the tenant signs; zero disables
it. The value locks at that signature. The app's repair form offers the move-in checkbox
only for a completed check-in during its open window, before a signed check-out.

A flagged repair reserves its filing time and pins its check-in when the server creates
it. Its text and selected, registered BEFORE photos become a dated notice only when the
tenant publishes it. The app waits for that repair's durable uploads and changes before
publishing; a timely filing can finish its uploads after the deadline. The tenant can
name an existing line or write a new one. The frozen snapshot records the original filing
time and deadline, independently of the repair's later lifecycle.

The tenant acknowledges their notice by publishing it. Only the landlord, signed in as
themselves, can agree or dispute it; there is no agent in-person acknowledgement. A
reason is required for a dispute. Pending and disputed notices are visible on the report
and PDF but excluded from the agreed inventory and check-out. Agreement includes the
condition and photos in the agreed baseline without editing the original signed report.
Condition notices preserve the physical item's identity; a notice about an item already
replaced or removed cannot be accepted. Responses are final, and stop once check-out is
signed. Ordinary repair work continues independently.

Server deployment requires `20261018120000_move_in_defects` before the app update.
Mobile changes are Dart only; no native dependency, icon or version change is required.
