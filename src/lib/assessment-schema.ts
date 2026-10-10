import { z } from 'zod'
import { CHANGE_TYPES, VERDICTS } from '@/lib/inspection/schema'

/// A publication is a self-contained snapshot. Report rendering never follows the
/// mutable Finding rows, which remain a private working draft for the next version.
export const assessmentSnapshotSchema = z.object({
  schemaVersion: z.literal(1),
  summary: z.string(),
  findings: z.array(z.object({
    id: z.string(),
    itemLabel: z.string(),
    changeType: z.enum(CHANGE_TYPES),
    verdict: z.enum(VERDICTS),
    rationale: z.string(),
    estimatedCost: z.string().nullable(),
    confidence: z.number().nullable(),
    editedByHuman: z.boolean(),
    maintenanceEvidence: z.object({
      caseId: z.string(),
      title: z.string(),
      evidence: z.array(z.object({
        id: z.string(),
        purpose: z.enum(['BEFORE', 'AFTER', 'RECEIPT']),
        storagePath: z.string(),
        mimeType: z.string(),
        note: z.string().nullable(),
        createdAt: z.string(),
      })),
    }).nullable().optional(),
  })),
})
