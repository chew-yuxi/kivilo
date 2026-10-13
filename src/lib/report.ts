import { db } from '@/lib/db'
import { authorizeReport } from '@/lib/auth'
import { createDownloadUrl } from '@/lib/storage'
import { propertyLabel } from '@/lib/format'
import { toAnnotations } from '@/lib/annotations'
import { assessmentSnapshotSchema } from '@/lib/assessment-schema'
import type { Prisma } from '@/generated/prisma'

/// What a report contains, shared by the link page and the app so the two can never show
/// different documents. Late phone uploads may finish after Send; their bytes stay safely
/// in private storage, but evidence not stamped at review is not part of what was agreed.
export const reportInclude = {
  tenancy: {
    include: { property: true, landlord: true, tenant: true, agent: { include: { branding: true } } },
  },
  conductedBy: true,
  rooms: {
    orderBy: { order: 'asc' },
    include: {
      items: { orderBy: { createdAt: 'asc' } },
      captures: { where: { kind: 'PHOTO', processedAt: { not: null } }, orderBy: { createdAt: 'asc' } },
    },
  },
  signatures: { include: { stakeholder: true } },
  assessments: { orderBy: { version: 'desc' }, take: 1 },
} satisfies Prisma.InspectionInclude

/// The signed report as the app renders it. Signed URLs last an hour, like every other
/// URL the app is handed; the screen fetches again rather than holding one.
export async function signedReport(inspectionId: string, stakeholderId: string) {
  await authorizeReport(inspectionId, stakeholderId)
  const inspection = await db.inspection.findUniqueOrThrow({
    where: { id: inspectionId },
    include: reportInclude,
  })
  const { tenancy } = inspection
  const party = tenancy.landlordId === stakeholderId
    ? 'LANDLORD' as const
    : tenancy.tenantId === stakeholderId ? 'TENANT' as const : null
  const signed = inspection.signatures.some((signature) => signature.stakeholderId === stakeholderId)
  const published = inspection.assessments[0] ?? null
  const assessment = published ? assessmentSnapshotSchema.parse(published.snapshot) : null

  return {
    id: inspection.id,
    kind: inspection.kind,
    status: inspection.status,
    // The role this viewer signs as, while the report still waits for their signature.
    signAs: inspection.status === 'AWAITING_SIGNATURE' && !signed ? party : null,
    property: propertyLabel(tenancy.property),
    landlord: tenancy.landlord.name,
    tenant: tenancy.tenant.name,
    agent: tenancy.agent?.name ?? null,
    startDate: tenancy.startDate.toISOString(),
    endDate: tenancy.endDate.toISOString(),
    deposit: tenancy.deposit.toString(),
    conductedAt: inspection.conductedAt?.toISOString() ?? null,
    conductedBy: inspection.conductedBy?.name ?? null,
    rooms: await Promise.all(inspection.rooms.map(async (room) => ({
      id: room.id,
      name: room.name,
      items: room.items.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        identifier: item.identifier,
        condition: item.condition,
        meterReading: item.meterReading,
        notes: item.notes,
      })),
      photos: await Promise.all(room.captures.map(async (capture) => ({
        id: capture.id,
        url: await createDownloadUrl(capture.storagePath),
        note: capture.note,
        annotations: toAnnotations(capture.annotations),
      }))),
    }))),
    signatures: inspection.signatures.map((signature) => ({
      name: signature.stakeholder.name,
      signedAt: signature.signedAt.toISOString(),
      imageData: signature.imageData,
    })),
    assessment: assessment && published && {
      version: published.version,
      publishedAt: published.publishedAt.toISOString(),
      summary: assessment.summary,
      findings: await Promise.all(assessment.findings.map(async (finding) => ({
        id: finding.id,
        itemLabel: finding.itemLabel,
        verdict: finding.verdict,
        estimatedCost: finding.estimatedCost,
        rationale: finding.rationale,
        maintenanceTitle: finding.maintenanceEvidence?.title ?? null,
        evidence: await Promise.all((finding.maintenanceEvidence?.evidence ?? []).map(async (item) => ({
          id: item.id,
          purpose: item.purpose,
          mimeType: item.mimeType,
          note: item.note,
          url: await createDownloadUrl(item.storagePath),
        }))),
      }))),
    },
  }
}
