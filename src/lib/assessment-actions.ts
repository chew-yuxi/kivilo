'use server'

import { createHash } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { authorizeInspection, requireAgent } from '@/lib/auth'
import { db } from '@/lib/db'
import { propertyLabel, sgd } from '@/lib/format'
import { activeNotificationRecipients } from '@/lib/notification-recipients'
import { depositStatement } from '@/lib/assessment-schema'
import { toAnnotations } from '@/lib/annotations'

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
    await tx.$queryRaw`SELECT "id" FROM "Inspection" WHERE "id" = ${inspectionId} FOR UPDATE`
    const inspection = await tx.inspection.findUniqueOrThrow({
      where: { id: inspectionId },
      include: {
        tenancy: { include: { property: true } },
        findings: {
          orderBy: { createdAt: 'asc' },
          include: {
            item: { include: { room: { select: { name: true } } } },
            baselineItem: { include: { room: { select: { name: true } } } },
            maintenanceCase: { include: { evidence: { orderBy: { createdAt: 'asc' } } } },
            photos: { orderBy: { createdAt: 'asc' } },
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
    if (inspection.findings.some((finding) => finding.uploadPaths.some((path) =>
      !finding.photos.some((photo) => photo.storagePath === path)))) {
      throw new Error('Finding photos are still uploading')
    }

    const snapshot = {
      schemaVersion: 1 as const,
      summary: inspection.summary,
      deposit: inspection.tenancy.deposit.toString(),
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
        photos: finding.photos.map((photo) => ({
          id: photo.id,
          storagePath: photo.storagePath,
          mimeType: photo.mimeType,
          sizeBytes: photo.sizeBytes,
          note: photo.note,
          annotations: toAnnotations(photo.annotations),
          createdAt: photo.createdAt.toISOString(),
        })),
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
                annotations: toAnnotations(item.annotations),
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
    const version = await tx.assessmentVersion.create({
      data: {
        inspectionId,
        version: (latest?.version ?? 0) + 1,
        snapshot,
        contentHash,
        publishedById: agent.id,
      },
    })
    // Each party is asked to agree or dispute it, where they signed the check-out.
    const statement = depositStatement(snapshot)!
    const { landlordId, tenantId, property } = inspection.tenancy
    const recipients = await activeNotificationRecipients(tx, [landlordId, tenantId])
    await tx.notification.createMany({
      data: recipients.map((recipientId) => ({
        recipientId,
        kind: 'REPORT_UPDATED' as const,
        title: `Deposit statement for ${propertyLabel(property)}`,
        body: `The check-out assessment proposes deductions of ${sgd(statement.deductions)} from the deposit of ${sgd(statement.deposit)}. Agree or dispute it.`,
        href: `/sign/${inspectionId}`,
        dedupeKey: `deposit-statement:${version.id}:${recipientId}`,
      })),
      skipDuplicates: true,
    })
    return version
  })

  revalidatePath(`/inspections/${inspectionId}`)
  return { version: result.version, publishedAt: result.publishedAt }
}
