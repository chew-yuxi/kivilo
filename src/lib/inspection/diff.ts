import { google } from '@ai-sdk/google'
import { generateObject } from 'ai'
import { diffSchema, type Diff } from './schema'

const MODEL = 'gemini-3.1-pro-preview'

const SYSTEM = `You are drafting the check-out comparison for a Singapore residential
tenancy. You are given the check-in inventory (the agreed baseline, already countersigned
by both parties) and the check-out inventory for the same property.

Your job is to say what changed and whether the tenant is liable, item by item. A human
agent reviews every line before it reaches the landlord or the tenant, so draft honestly
rather than defensively; an assessment either side would reject on sight is worthless.

The distinction that matters:
- FAIR_WEAR is deterioration you would expect from ordinary use over the tenancy's
  length. Scuff marks on high-traffic flooring, faded paint, worn tap washers, minor
  carpet flattening. It scales with time, so two years of marks is not two months of marks.
- TENANT_LIABLE is damage beyond ordinary use: burns, tears, holes, staining, breakage,
  missing items, unrepaired water damage, an appliance that worked at check-in and
  does not now.

Rules:
- Match on the identifier first when both sides have one. A matching make/model/serial
  proves it is the same physical object; a differing one proves it is not, and an
  appliance swapped for a different unit of the same model is a substitution worth
  flagging even when the condition is fine. Every changed serial must have a finding
  with changeType DAMAGE and verdict UNDECIDED; never call it UNCHANGED or infer who
  made the substitution. Fall back to what the item is and where it is only when an
  identifier is missing: a "Built-in wardrobe" in the master bedroom is the same item
  as "Wardrobe (built in)".
- A check-in item with no check-out entry is MISSING, but inventory omission alone
  does not prove physical absence or tenant liability. Say it is not listed in the
  check-out inventory and use UNDECIDED until a person confirms the facts. An item
  present only at check-out is not the tenant's liability. Record it with a null
  baselineItemRef and a verdict of UNDECIDED.
- Condition moving one step (GOOD → FAIR) over a full tenancy is usually WEAR. Two or
  more steps, or any move to DAMAGED, needs a specific reason in the rationale.
- Set UNDECIDED when the evidence genuinely does not settle it, rather than guessing.
  A flagged uncertainty is useful to the agent; a confident wrong call is not.
- Describe only what the supplied inventory says. Do not claim a photo, video,
  permission, ownership, or physical removal exists unless an input field says so.
  An absent check-out line is missing from the inventory, not proof of physical absence.
  A changed serial flags a substitution, but without evidence of authorization or
  loss, do not call it unauthorized or assume tenant liability; use UNDECIDED.
- Completely unchanged items belong in neither the findings nor the summary.
- estimatedCost is a rough make-good figure in SGD, or null. Do not invent precision.`

type ItemForDiff = {
  ref: string
  room: string
  name: string
  category: string
  condition: string
  quantity: number
  notes: string | null
  identifier: string | null
  meterReading: string | null
}

/// Fail closed when the model skips an objective change in reviewed inventory data.
/// Exact one-to-one room/name matches are safe to validate without guessing which
/// similarly named item a person intended. Everything remains a private draft.
export function validateDiff(input: {
  baseline: ItemForDiff[]
  current: ItemForDiff[]
}, draft: Diff): Diff {
  const label = (item: ItemForDiff) =>
    `${item.room.trim().toLowerCase()}\0${item.name.trim().toLowerCase()}\0${item.category}`
  const currentByLabel = new Map<string, ItemForDiff[]>()
  const baselineCounts = new Map<string, number>()
  for (const item of input.current) {
    const key = label(item)
    currentByLabel.set(key, [...(currentByLabel.get(key) ?? []), item])
  }
  for (const item of input.baseline) {
    const key = label(item)
    baselineCounts.set(key, (baselineCounts.get(key) ?? 0) + 1)
  }

  for (const before of input.baseline) {
    const key = label(before)
    if (baselineCounts.get(key) !== 1) continue
    const matches = currentByLabel.get(key) ?? []
    const findings = draft.findings.filter((finding) => finding.baselineItemRef === before.ref)
    if (matches.length === 0) {
      // A renamed object with the same identifier can still be unchanged. Otherwise
      // the draft must flag an omitted baseline line for a person to resolve.
      if (before.identifier && input.current.some((item) => item.identifier === before.identifier)) {
        continue
      }
      if (findings.length !== 1 || findings[0].itemRef !== null ||
          findings[0].changeType !== 'MISSING' || findings[0].verdict !== 'UNDECIDED') {
        throw new Error('AI draft failed validation; retry the comparison')
      }
      continue
    }
    if (matches.length !== 1) continue
    const after = matches[0]
    const identifierChanged = before.identifier !== null && after.identifier !== null &&
      before.identifier !== after.identifier
    const meterChanged = before.meterReading !== null && after.meterReading !== null &&
      before.meterReading !== after.meterReading
    if (!identifierChanged && !meterChanged && before.condition === after.condition &&
        before.quantity === after.quantity) continue
    const matched = findings.filter((finding) => finding.itemRef === after.ref)
    if (matched.length !== 1 || matched[0].changeType === 'UNCHANGED' ||
        (identifierChanged && (matched[0].changeType !== 'DAMAGE' ||
                               matched[0].verdict !== 'UNDECIDED'))) {
      throw new Error('AI draft failed validation; retry the comparison')
    }
  }

  return {
    ...draft,
    // This schema also serves existing records, but a new draft only reports changes.
    findings: draft.findings.filter((finding) => finding.changeType !== 'UNCHANGED'),
  }
}

export async function diffAgainstBaseline(input: {
  baseline: ItemForDiff[]
  current: ItemForDiff[]
  propertyLabel: string
  tenancyMonths: number
}): Promise<Diff> {
  const { object } = await generateObject({
    model: google(MODEL),
    schema: diffSchema,
    system: SYSTEM,
    prompt: [
      `Property: ${input.propertyLabel}`,
      `Tenancy length: ${input.tenancyMonths} months. Weigh fair wear and tear against this.`,
      '',
      'CHECK-IN BASELINE:',
      JSON.stringify(input.baseline, null, 2),
      '',
      'CHECK-OUT:',
      JSON.stringify(input.current, null, 2),
      '',
      'Produce one finding per item that changed, plus any item that is missing or newly present.',
      'Do not emit findings for items that are unchanged.',
    ].join('\n'),
  })

  return validateDiff(input, object)
}
