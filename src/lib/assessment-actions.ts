'use server'

import { createHash } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { authorizeInspection, requireAgent } from '@/lib/auth'
import { db } from '@/lib/db'

/// Publishing is an explicit human review step. The signed inventory remains frozen;
/// this is a separately dated assessment that can only be superseded by a new version.
export async function publishAssessment(inspectionId: string) {
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
          },
        },
      },
    })
    if (inspection.status !== 'COMPLETED' || inspection.kind !== 'CHECK_OUT') {
      throw new Error('Complete the check-out inventory before publishing its assessment')
    }
    if (inspection.summary === null) throw new Error('Draft the comparison first')
    if (inspection.findings.some((finding) => !finding.editedByHuman)) {
      throw new Error('Review every finding before publishing the assessment')
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
