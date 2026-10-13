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
2. **Team sharing.** Teammates see and work on each other's deals as if they were the
   deal's agent; the deal's agent stays the named one, `conductedBy` records who walked
   it. Set up by command, no team screens yet. Leaving ends access; deals stay with
   their agent. Every agent clause needs it: `src/lib/auth.ts` and the two in
   `src/lib/maintenance.ts` that bypass `tenancyScope`.
3. **The landlord signs remotely.** Today only the agent's phone can submit a signature.
4. **The tenant's copy at handover.** QR after signing, email with the defect deadline.
5. **"It was like this when I moved in"**, with a per-tenancy defect window.

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
