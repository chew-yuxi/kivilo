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
  meterReading: z
    .string()
    .nullable()
    .describe('Verbatim reading for METER items (units vary). Null for everything else.'),
  sourceTimestampSec: z
    .number()
    .int()
    .min(0)
    .describe('Seconds into the video where this item is best seen.'),
  confidence: z.number().min(0).max(1).describe('How certain the identification and condition are'),
})

export const extractedRoomSchema = z.object({
  name: z.string().describe('e.g. "Master bedroom", "Kitchen", "Balcony"'),
  items: z.array(extractedItemSchema),
})

export const extractionSchema = z.object({
  summary: z.string().describe('Two or three sentences an agent could paste into an email.'),
  transcript: z.string().describe('Plain transcript of the narration. Empty string if silent.'),
  rooms: z.array(extractedRoomSchema),
})

export type Extraction = z.infer<typeof extractionSchema>
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
