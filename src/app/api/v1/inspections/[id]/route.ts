import { db } from '@/lib/db'
import { authorizeInspection } from '@/lib/auth'
import { propertyLabel } from '@/lib/format'
import { authed } from '@/lib/api/route'

export const dynamic = 'force-dynamic'

/// One inspection with its rooms, in walk order. Authorized through the same helper the
/// server actions use, so an id belonging to another agent is a 404 here exactly as it
/// is everywhere else.
export const GET = authed(async (agent, { id }: { id: string }, request) => {
  await authorizeInspection(id, agent.id)

  const inspection = await db.inspection.findUniqueOrThrow({
    where: { id },
    include: {
      tenancy: { include: { property: true, landlord: true, tenant: true } },
      rooms: {
        orderBy: { order: 'asc' },
        include: {
          captures: { select: { kind: true, processedAt: true } },
          _count: { select: { items: true } },
        },
      },
      signatures: { select: { stakeholderId: true, signedAt: true } },
      checkOut: { select: { id: true } },
      findings: {
        orderBy: { createdAt: 'asc' },
        include: {
          item: { include: { room: { select: { name: true } } } },
          baselineItem: { include: { room: { select: { name: true } } } },
          maintenanceCase: { select: { id: true, title: true } },
        },
      },
      assessments: { orderBy: { version: 'desc' }, take: 1, select: { version: true, publishedAt: true } },
    },
  })
  const maintenanceHistory = await db.maintenanceCase.findMany({
    where: { tenancyId: inspection.tenancyId },
    orderBy: { createdAt: 'desc' },
    include: {
      propertyAsset: { select: { name: true } },
      visits: { where: { completedAt: { not: null } }, select: { id: true } },
      _count: { select: { evidence: true } },
    },
  })

  return {
    id: inspection.id,
    tenancyRecordId: inspection.tenancyId,
    kind: inspection.kind,
    status: inspection.status,
    property: propertyLabel(inspection.tenancy.property),
    landlord: inspection.tenancy.landlord.name,
    landlordId: inspection.tenancy.landlordId,
    tenant: inspection.tenancy.tenant.name,
    tenantId: inspection.tenancy.tenantId,
    deposit: inspection.tenancy.deposit.toString(),
    summary: inspection.summary,
    baselineId: inspection.baselineId,
    checkOutId: inspection.checkOut?.id ?? null,
    aiConsentAt: inspection.aiConsentAt?.toISOString() ?? null,
    shareToken: inspection.shareToken,
    shareUrl: inspection.shareToken
      ? new URL(`/reports/${inspection.shareToken}`, request.url).toString()
      : null,
    signatures: inspection.signatures.map((signature) => ({
      stakeholderId: signature.stakeholderId,
      signedAt: signature.signedAt.toISOString(),
    })),
    latestAssessment: inspection.assessments[0]
      ? {
          version: inspection.assessments[0].version,
          publishedAt: inspection.assessments[0].publishedAt.toISOString(),
        }
      : null,
    assessmentDraftChanged:
      inspection.kind === 'CHECK_OUT' && inspection.summary !== null &&
      (!inspection.assessments[0] || inspection.findings.some(
        (finding) => finding.updatedAt > inspection.assessments[0].publishedAt,
      )),
    maintenanceHistory: maintenanceHistory.map((item) => ({
      id: item.id,
      title: item.title,
      status: item.status,
      asset: item.propertyAsset?.name ?? null,
      repairAttempts: item.visits.length,
      evidence: item._count.evidence,
      createdAt: item.createdAt.toISOString(),
    })),
    findings: inspection.findings.map((finding) => ({
      id: finding.id,
      changeType: finding.changeType,
      verdict: finding.verdict,
      rationale: finding.rationale,
      estimatedCost: finding.estimatedCost?.toString() ?? null,
      confidence: finding.confidence,
      editedByHuman: finding.editedByHuman,
      itemId: finding.itemId,
      baselineItemId: finding.baselineItemId,
      itemLabel: finding.item ? `${finding.item.room.name} · ${finding.item.name}` : null,
      baselineLabel: finding.baselineItem
        ? `${finding.baselineItem.room.name} · ${finding.baselineItem.name}`
        : null,
      baselineCondition: finding.baselineItem?.condition ?? null,
      currentCondition: finding.item?.condition ?? null,
      maintenanceCaseId: finding.maintenanceCaseId,
      maintenanceCaseTitle: finding.maintenanceCase?.title ?? null,
    })),
    rooms: inspection.rooms.map((room) => ({
      id: room.id,
      name: room.name,
      status: room.status,
      processingError: room.processingError,
      items: room._count.items,
      photos: room.captures.filter((capture) => capture.kind === 'PHOTO').length,
      videos: room.captures.filter((capture) => capture.kind === 'VIDEO').length,
      newSinceDraft:
        room.status === 'REVIEW' || room.status === 'REVIEWED'
          ? room.captures.filter((capture) => capture.processedAt === null).length
          : 0,
    })),
  }
})
