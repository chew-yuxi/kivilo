import { z } from 'zod'
import { CHANGE_TYPES, VERDICTS } from '@/lib/inspection/schema'
import { storedAnnotationsSchema } from '@/lib/annotations'

/// A publication is a self-contained snapshot. Report rendering never follows the
/// mutable Finding rows, which remain a private working draft for the next version.
export const assessmentSnapshotSchema = z.object({
  schemaVersion: z.literal(1),
  /// Written by the AI comparison in snapshots published before it was removed.
  summary: z.string().nullable(),
  /// The tenancy's deposit as published, so the statement both parties answer cannot
  /// move under them. Absent on versions published before deposit statements, which are
  /// shown as before and cannot be answered until the agent publishes again.
  deposit: z.string().optional(),
  findings: z.array(z.object({
    id: z.string(),
    itemLabel: z.string(),
    changeType: z.enum(CHANGE_TYPES),
    verdict: z.enum(VERDICTS),
    rationale: z.string(),
    estimatedCost: z.string().nullable(),
    confidence: z.number().nullable(),
    editedByHuman: z.boolean(),
    /// Evidence of this finding, frozen with this assessment version. Older versions
    /// have none; rendering must never follow the finding's editable photo rows.
    photos: z.array(z.object({
      id: z.string(),
      storagePath: z.string(),
      mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
      note: z.string().nullable(),
      annotations: storedAnnotationsSchema.nullable(),
      createdAt: z.string(),
    })).optional(),
    maintenanceEvidence: z.object({
      caseId: z.string(),
      title: z.string(),
      evidence: z.array(z.object({
        id: z.string(),
        purpose: z.enum(['BEFORE', 'AFTER', 'RECEIPT']),
        storagePath: z.string(),
        mimeType: z.string(),
        note: z.string().nullable(),
        /// Copied with the photo. Absent on versions published before repair photos had marks.
        annotations: storedAnnotationsSchema.nullable().optional(),
        createdAt: z.string(),
      })),
    }).nullable().optional(),
  })),
})

export type AssessmentSnapshot = z.infer<typeof assessmentSnapshotSchema>

/// What comes off the deposit: every tenant-liable finding's cost, against the deposit
/// frozen in the version. Null for a version published before deposits were frozen.
/// Fair wear and other verdicts are not deducted. Kivilo records the figure the parties
/// answer; it never moves money.
export function depositStatement(snapshot: AssessmentSnapshot) {
  if (snapshot.deposit === undefined) return null
  const deducted = snapshot.findings.filter((finding) => finding.verdict === 'TENANT_LIABLE')
  // In cents, so a column of costs adds up to the figure a person would get by hand.
  const cents = (amount: string | null) => Math.round(Number(amount ?? 0) * 100)
  const deposit = cents(snapshot.deposit)
  const deductions = deducted.reduce((sum, finding) => sum + cents(finding.estimatedCost), 0)
  return {
    deposit: deposit / 100,
    deductions: deductions / 100,
    toReturn: (deposit - deductions) / 100,
    deducted,
  }
}
