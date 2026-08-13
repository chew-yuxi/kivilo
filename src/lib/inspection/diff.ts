import { anthropic } from '@ai-sdk/anthropic'
import { generateObject } from 'ai'
import { diffSchema, type Diff } from './schema'

const MODEL = 'claude-opus-5'

const SYSTEM = `You are drafting the check-out comparison for a Singapore residential
tenancy. You are given the check-in inventory (the agreed baseline, already countersigned
by both parties) and the check-out inventory for the same property.

Your job is to say what changed and whether the tenant is liable, item by item. A human
agent reviews every line before it reaches the landlord or the tenant, so draft honestly
rather than defensively; an assessment either side would reject on sight is worthless.

The distinction that matters:
- FAIR_WEAR is deterioration you would expect from ordinary use over the tenancy's
  length. Scuff marks on high-traffic flooring, faded paint, worn tap washers, minor
  carpet flattening. It scales with time — two years of marks is not two months of marks.
- TENANT_LIABLE is damage beyond ordinary use: burns, tears, holes, staining, breakage,
  missing items, unrepaired water damage, an appliance that worked at check-in and
  does not now.

Rules:
- Match items by what they are and where they are, not by exact wording. A "Built-in
  wardrobe" in the master bedroom is the same item as "Wardrobe (built in)".
- An item present at check-in and absent at check-out is MISSING. An item present only
  at check-out is not the tenant's liability — record it with a null baselineItemRef and
  a verdict of UNDECIDED.
- Condition moving one step (GOOD → FAIR) over a full tenancy is usually WEAR. Two or
  more steps, or any move to DAMAGED, needs a specific reason in the rationale.
- Set UNDECIDED when the evidence genuinely does not settle it, rather than guessing.
  A flagged uncertainty is useful to the agent; a confident wrong call is not.
- estimatedCost is a rough make-good figure in SGD, or null. Do not invent precision.`

type ItemForDiff = {
  ref: string
  room: string
  name: string
  category: string
  condition: string
  quantity: number
  notes: string | null
  meterReading: string | null
}

export async function diffAgainstBaseline(input: {
  baseline: ItemForDiff[]
  current: ItemForDiff[]
  propertyLabel: string
  tenancyMonths: number
}): Promise<Diff> {
  const { object } = await generateObject({
    model: anthropic(MODEL),
    schema: diffSchema,
    system: SYSTEM,
    prompt: [
      `Property: ${input.propertyLabel}`,
      `Tenancy length: ${input.tenancyMonths} months — weigh fair wear and tear against this.`,
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

  return object
}
