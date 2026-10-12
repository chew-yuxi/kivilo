'use server'

import { createHash } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { authorizeInspection, requireAgent } from '@/lib/auth'
import { db } from '@/lib/db'

/// Publishing is an explicit human review step. The signed inventory remains frozen;
/// this is a separately dated assessment that can only be superseded by a new version.
/// An assessment with no findings says no damage was found, so publishing one has to be
/// asked for in so many words. Installed builds 12 to 19 offer Publish on any completed
/// check-out and cannot add a finding; without this an agent could publish a no-damage
/// assessment nobody actually made.
export async function publishAssessment(
  inspectionId: string,
  { noFindings = false }: { noFindings?: boolean } = {},
) {
  const agent = await requireAgent()
  const authorized = await authorizeInspection(inspectionId, agent.id)
  if (authorized.kind !== 'CHECK_OUT' || authorized.status !== 'COMPLETED') {
    throw new Error('Complete the check-out inventory before publishing its assessment')
  }

  const result = await db.$transaction(async (tx) => {
    const inspection = await tx.inspection.findUniqueOrThrow({
      where: { id: inspectionId },
      include: {
        findings: {
          orderBy: { createdAt: 'asc' },
          include: {
            item: { include: { room: true } },
            baselineItem: { include: { room: true } },
            maintenanceCase: { include: { evidence: { orderBy: { createdAt: 'asc' } } } },
          },
        },
      },
    })
    if (inspection.status !== 'COMPLETED' || inspection.kind !== 'CHECK_OUT') {
      throw new Error('Complete the check-out inventory before publishing its assessment')
    }
    if (inspection.findings.some((finding) => !finding.editedByHuman)) {
      throw new Error('Review every finding before publishing the assessment')
    }
    if (inspection.findings.length === 0 && !noFindings) {
      throw new Error('Confirm that no damage was found before publishing an assessment without findings')
    }

    const snapshot = {
      schemaVersion: 1,
      summary: inspection.summary,
      findings: inspection.findings.map((finding) => ({
        id: finding.id,
        itemLabel: finding.item
          ? `${finding.item.room.name}, ${finding.item.name}`
          : finding.baselineItem
            ? `${finding.baselineItem.room.name}, ${finding.baselineItem.name}`
            : 'Unmatched item',
        changeType: finding.changeType,
        verdict: finding.verdict,
        rationale: finding.rationale,
        estimatedCost: finding.estimatedCost?.toString() ?? null,
        confidence: finding.confidence,
        editedByHuman: finding.editedByHuman,
        maintenanceEvidence: finding.maintenanceCase
          ? {
              caseId: finding.maintenanceCase.id,
              title: finding.maintenanceCase.title,
              evidence: finding.maintenanceCase.evidence.map((item) => ({
                id: item.id,
                purpose: item.purpose,
                storagePath: item.storagePath,
                mimeType: item.mimeType,
                note: item.note,
                createdAt: item.createdAt.toISOString(),
              })),
            }
          : null,
      })),
    }
    const contentHash = createHash('sha256').update(JSON.stringify(snapshot)).digest('hex')
    const latest = await tx.assessmentVersion.findFirst({
      where: { inspectionId },
      orderBy: { version: 'desc' },
    })
    if (latest?.contentHash === contentHash) {
      return latest
    }
    return tx.assessmentVersion.create({
      data: {
        inspectionId,
        version: (latest?.version ?? 0) + 1,
        snapshot,
        contentHash,
        publishedById: agent.id,
      },
    })
  }, { isolationLevel: 'Serializable' })

  revalidatePath(`/inspections/${inspectionId}`)
  return { version: result.version, publishedAt: result.publishedAt }
}
