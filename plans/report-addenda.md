# Report addenda (planning, nothing built)

## Why

Real condition reports change after the inspection. The reference report Yuxi supplied
(27 Jalan Merah Saga, 2025) carries pages stamped "Updated 11th September 2025" and
"Updated 23rd September 2025": a new dishwasher and dryer with model and serial numbers,
and a helper's toilet shown BEFORE and AFTER replacement. The agent simply edited the
PowerPoint and re-sent the PDF, so nothing records who agreed to the change or what the
report said before it.

In Kivilo a signed report is frozen by design (`assertOpen`, `assertNotCountersigned` in
`src/lib/actions.ts`; AGENTS.md "A signed report stops moving"). An addendum must
therefore be an append-only, separately dated record attached to a COMPLETED
inspection, never an edit to it.

It matters for more than presentation. At check-out the baseline is the signed check-in.
Without addenda, the new dishwasher looks like an item that appeared from nowhere and
the replaced toilet looks like a change to assess, so the check-out comparison is wrong
for any unit where something was replaced mid-tenancy.

## What exists to build on

- **AssessmentVersion** (`prisma/schema.prisma`, `src/lib/assessment-actions.ts`): the
  append-only precedent. Versioned, immutable `snapshot` JSON, `contentHash` dedupe,
  `publishedAt`, published by the agent alone, rendered below the signatures as
  "separate from the signed inventory above".
- **Maintenance** (`src/lib/maintenance.ts`): cases with visits and evidence tagged
  `BEFORE | AFTER | RECEIPT`, stored at `maintenance/<caseId>/...`. The toilet
  replacement in the reference is exactly a maintenance case with before and after
  evidence. The assessment snapshot already copies maintenance evidence by value.
- **PropertyAsset**: name, category, room label, `identifier` (make, model, serial),
  `active`. No install or removal date, no "replaces" link, no photo, and no update or
  deactivate path yet.
- **Property timeline** (`src/lib/property-timeline.ts`, on `main`): an acknowledged
  addendum is a settled, dated fact and fits as one more event kind, with the same
  inspection-link rule as `ASSESSMENT_PUBLISHED`.
- **Signature** signs nothing by hash; the guards keep the rows still. Addenda should
  not weaken that: they never touch rooms, items or captures of the signed inspection.

## Proposed shape

- `ReportAddendum { id, inspectionId, number, title, effectiveDate, snapshot Json,
  contentHash, createdById, createdAt, publishedAt?, acknowledgedAt? }`, numbered per
  inspection. Draft while the agent writes it; immutable once published.
- Entries in the snapshot, by value: per room, items added, items replaced (old to
  new), items removed, each with notes and identifier, plus photos. Photos are new
  uploads under `addenda/<addendumId>/` or copied by reference from a maintenance case's
  BEFORE and AFTER evidence, as the assessment does.
- Publishing an entry that adds or replaces an appliance can create or deactivate a
  PropertyAsset, so the asset register stays true.
- The report and the PDF render addenda after the signatures, oldest first, each opening
  with an "Updated <date>" banner, its reason, and who published and acknowledged it.
- Check-out uses the signed check-in plus every acknowledged addendum as its baseline.

## Questions for Yuxi before building

1. Who may publish an addendum: the agent only, or the landlord as well?
2. Must both parties acknowledge it (sign, or a lighter "acknowledge" tap), or is the
   agent's publication enough, as with the assessment? The reference had no
   acknowledgement at all; Kivilo's whole pitch is that both sides agreed.
3. Can an addendum remove items, or only add and replace?
4. Should a resolved maintenance case offer "add to the report as an update" directly?
   This would cover the toilet example with no new capture flow.
5. Does an addendum need its own visit (inspector on site), or can it be assembled from
   photos the landlord or contractor supplied?
