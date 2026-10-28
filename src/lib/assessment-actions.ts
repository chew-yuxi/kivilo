'use server'

import { createHash } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { authorizeInspection, inspectionScope, requireAgent } from '@/lib/auth'
import { db } from '@/lib/db'
import { propertyLabel, sgd } from '@/lib/format'
import { activeNotificationRecipients } from '@/lib/notification-recipients'
import { assessmentSnapshotSchema, depositStatement } from '@/lib/assessment-schema'
import { toAnnotations } from '@/lib/annotations'
import { assertFindingPhotoDraftsReady } from '@/lib/finding-photos'

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
    // Finding text, photo claims/edits and publication share this lock. Nothing can
    // finish an upload or change a mark between this read and the frozen snapshot.
    await tx.$queryRaw`SELECT "id" FROM "Tenancy" WHERE "id" = ${authorized.tenancyId} FOR UPDATE`
    await tx.$queryRaw`SELECT "id" FROM "Inspection" WHERE "id" = ${inspectionId} FOR UPDATE`
    if (!await tx.inspection.findFirst({ where: { id: inspectionId, ...inspectionScope(agent.id) }, select: { id: true } })) {
      throw new Error('Inspection not found')
    }
    await assertFindingPhotoDraftsReady(tx, inspectionId)
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
            photos: { where: { deletedAt: null }, orderBy: [{ createdAt: 'asc' }, { clientId: 'asc' }] },
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
    if (inspection.findings.some((finding) => finding.photos.some((photo) => !photo.registeredAt))) {
      throw new Error('Finding photos are still uploading')
    }

    const snapshot = assessmentSnapshotSchema.parse({
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
          id: photo.clientId,
          storagePath: photo.storagePath,
          mimeType: photo.mimeType,
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
    })
    const contentHash = createHash('sha256').update(JSON.stringify(snapshot)).digest('hex')
    const latest = await tx.assessmentVersion.findFirst({
      where: { inspectionId },
      orderBy: { version: 'desc' },
    })
    // Published objects outlive their editable finding. Removing a later draft photo
    // must not remove the original bytes a party read in this version. Also protect
    // every included object on an idempotent publication retry.
    await tx.findingPhoto.updateMany({
      where: {
        clientId: { in: inspection.findings.flatMap((finding) => finding.photos.map((photo) => photo.clientId)) },
        publishedAt: null,
      },
      data: { publishedAt: latest?.contentHash === contentHash ? latest.publishedAt : new Date() },
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
        tenancyId: inspection.tenancyId,
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
