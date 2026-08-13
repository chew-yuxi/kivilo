import { z } from 'zod'

export const CATEGORIES = ['FIXTURE', 'APPLIANCE', 'FURNITURE', 'SURFACE', 'METER'] as const
export const CONDITIONS = ['NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED'] as const

export const extractedItemSchema = z.object({
  name: z
    .string()
    .describe('Short noun phrase as an inventory line would read, e.g. "Built-in wardrobe"'),
  category: z.enum(CATEGORIES),
  condition: z.enum(CONDITIONS),
  quantity: z.number().int().min(1).default(1),
  notes: z
    .string()
    .describe(
      'What is actually visible or narrated about its condition. Empty string if nothing specific.',
    ),
  identifier: z
    .string()
    .nullable()
    .describe(
      'Make, model, and serial transcribed character-for-character off a photographed ' +
        'label or plate. Null unless you can actually read it — never inferred from ' +
        'appearance, never partially guessed.',
    ),
  meterReading: z
    .string()
    .nullable()
    .describe('Verbatim reading for METER items (units vary). Null for everything else.'),
  sourceCaptureRef: z
    .string()
    .describe('The `ref` of the capture this item was read from.'),
  sourceTimestampSec: z
    .number()
    .int()
    .min(0)
    .nullable()
    .describe('Seconds into the video where this item is clearest. Null for photo captures.'),
  confidence: z.number().min(0).max(1).describe('How certain the identification and condition are'),
})

/// One room at a time. The inspector names the room; the model fills its contents,
/// so there is no room-naming to disagree about and re-shooting one room touches
/// nothing else.
export const roomExtractionSchema = z.object({
  summary: z.string().describe("Two or three sentences on this room's overall condition."),
  transcript: z.string().describe('Plain transcript of the narration. Empty string if silent.'),
  items: z.array(extractedItemSchema),
})

export type RoomExtraction = z.infer<typeof roomExtractionSchema>
export type ExtractedItem = z.infer<typeof extractedItemSchema>

export const CHANGE_TYPES = ['UNCHANGED', 'WEAR', 'DAMAGE', 'MISSING', 'IMPROVED'] as const
export const VERDICTS = ['TENANT_LIABLE', 'FAIR_WEAR', 'DISPUTED', 'UNDECIDED'] as const

export const draftFindingSchema = z.object({
  baselineItemRef: z
    .string()
    .nullable()
    .describe('The `ref` of the check-in item this is measured against, or null if newly present.'),
  itemRef: z
    .string()
    .nullable()
    .describe('The `ref` of the check-out item, or null if the item is now missing.'),
  changeType: z.enum(CHANGE_TYPES),
  verdict: z.enum(VERDICTS),
  rationale: z
    .string()
    .describe(
      'One or two sentences a landlord and tenant would both accept as a fair reading of the evidence.',
    ),
  estimatedCost: z
    .number()
    .nullable()
    .describe('Rough SGD to make good, or null when nothing is owed or it cannot be estimated.'),
  confidence: z.number().min(0).max(1),
})

export const diffSchema = z.object({
  summary: z.string().describe('What changed over the tenancy, in plain language.'),
  findings: z.array(draftFindingSchema),
})

export type Diff = z.infer<typeof diffSchema>
export type DraftFinding = z.infer<typeof draftFindingSchema>
