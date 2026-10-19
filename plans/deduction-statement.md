# Deduction statement: both parties agree what comes off the deposit

Proposed 2026-10-19, from `plans/ux-competitive-review.md` ("own the deposit settlement").
Built 2026-10-19 with the four recommendations below, which Yuxi approved. It hangs
off `AssessmentVersion` rather than a separate statement table: the version is already
immutable and hashed, so the deposit was frozen into its snapshot and answers point at it.

## Why

Every competitor stops at the report. Kivilo's check-out already ends in a published
assessment (`AssessmentVersion`): findings with change type, a damage-or-wear verdict
and an estimated cost, frozen with a `contentHash`. What it lacks is the last step:
the landlord and tenant saying yes to the money. Today that agreement happens in
WhatsApp and is lost, and the deposit is where the dispute actually is.

## What it is

A statement drawn from one published assessment version:

> Deposit S$14,400. Deductions S$620 (3 items, tenant liable). To return S$13,780.

Each deduction line names the check-in line, the check-out line, the verdict, the
rationale and the cost, with the photos the report already carries. Fair-wear findings
are listed as not deducted, so the tenant sees what was considered and let go.

Kivilo records the agreement. It never moves money, rules on liability, or calls a
verdict law (scribe, not witness, as in `plans/m5-who-pays.md`).

## Shape (as built)

- `deposit` in the assessment snapshot, copied from the tenancy at publish, so it is
  covered by the version's `contentHash`.
- `AssessmentResponse`: `assessmentVersionId`, `stakeholderId`, `answer` (`AGREED` or
  `DISPUTED`), `reason` (required to dispute), `method` (`OWN_ACCOUNT` or `IN_PERSON`),
  `contentHash`, `respondedAt`. One per party per version, append-only.
- Publishing a new version supersedes the open statement; answers on the old one stay
  on record against the old hash.
- Publishing notifies both parties (in-app, email, push) with a link to the signing
  page. The report and PDF draw the statement and each party's answer
  (`RENDER_VERSION` 6).
- Not yet: the app screen. `POST /api/v1/inspections/[id]/deposit-statement` is ready
  for it.

## Decisions (approved as recommended)

1. **Whole statement or per line?** Recommended: agree or dispute the whole statement,
   with a reason. A partial agreement is the agent publishing a revised version, which
   keeps the record simple and every agreed version complete.
2. **In person on the agent's phone?** Recommended: yes, as addenda already allow, with
   the method recorded. Check-out is usually done with both parties in the unit.
3. **Does the landlord also agree, or only the tenant?** Recommended: both. The landlord
   agreeing to a lower figure is as much a record as the tenant agreeing to a higher one.
4. **After a dispute?** Recommended: Kivilo records it and shows both answers, nothing
   more. No tribunal guidance in product copy until it has been reviewed.
