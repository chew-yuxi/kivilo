import { db } from '@/lib/db'
import { authorizeInspection, inspectionScope, tenancyScope } from '@/lib/auth'
import { propertyLabel } from '@/lib/format'
import { authed } from '@/lib/api/route'
import { assessmentSnapshotSchema } from '@/lib/assessment-schema'
import { costStanding, describeProposal } from '@/lib/maintenance'
import { createDownloadUrl } from '@/lib/storage'
import { toAnnotations } from '@/lib/annotations'
import { signingParties } from '@/lib/report-email'
import { findingCheckInConditions } from '@/lib/check-in-reference'
import { comparableItemSelect, findingComparables } from '@/lib/finding-comparables'
import { findingPhotoView } from '@/lib/finding-photos'
import { tenancyAccess } from '@/lib/tenancy-access'
import { propertyState } from '@/lib/property-management'

export const dynamic = 'force-dynamic'

/// One inspection with its rooms, in walk order. Authorized through the same helper the
/// server actions use, so an id belonging to another agent is a 404 here exactly as it
/// is everywhere else.
export const GET = authed(async (agent, { id }: { id: string }, request) => {
  const authorized = await authorizeInspection(id, agent.id)
  const canCompare = authorized.kind === 'CHECK_OUT' && authorized.status === 'COMPLETED'

  const inspection = await db.inspection.findUniqueOrThrow({
    where: { id },
    include: {
      tenancy: { include: { property: true, landlord: true, tenant: true } },
      rooms: {
        orderBy: { order: 'asc' },
        omit: { baseline: !canCompare },
        include: {
          captures: {
            orderBy: { createdAt: 'desc' },
            select: { kind: true, storagePath: true, posterPath: true, annotations: true },
          },
          _count: { select: { items: true } },
          items: {
            where: canCompare ? {} : { id: { in: [] } },
            orderBy: { createdAt: 'asc' },
            select: comparableItemSelect,
          },
        },
      },
      // Conducting the check-out grants no access to its check-in. Its original rows
      // and frozen reference are exposed only through this independently scoped join.
      baseline: {
        where: inspectionScope(agent.id),
        select: {
          id: true,
          rooms: {
            where: canCompare ? {} : { id: { in: [] } },
            orderBy: { order: 'asc' },
            select: {
              id: true, name: true,
              items: { orderBy: { createdAt: 'asc' }, select: comparableItemSelect },
              captures: { where: { kind: 'PHOTO', processedAt: { not: null } }, select: { id: true } },
            },
          },
        },
      },
      signatures: { select: { stakeholderId: true, signedAt: true } },
      checkOut: { where: inspectionScope(agent.id), select: { id: true } },
      findings: {
        orderBy: { createdAt: 'asc' },
        include: {
          item: { include: { room: { select: { name: true } } } },
          baselineItem: { where: { room: { inspection: inspectionScope(agent.id) } }, include: { room: { select: { name: true } } } },
          maintenanceCase: { where: { tenancy: tenancyScope(agent.id) }, select: { id: true, title: true } },
          photos: { where: { deletedAt: null, registeredAt: { not: null } }, orderBy: [{ createdAt: 'asc' }, { clientId: 'asc' }] },
        },
      },
      assessments: {
        orderBy: { version: 'desc' },
        take: 1,
        select: { version: true, publishedAt: true, snapshot: true },
      },
    },
  })
  const maintenanceHistory = await db.maintenanceCase.findMany({
    where: { tenancyId: inspection.tenancyId, tenancy: tenancyScope(agent.id) },
    orderBy: { createdAt: 'desc' },
    include: {
      propertyAsset: { select: { name: true } },
      visits: { where: { completedAt: { not: null } }, select: { id: true } },
      _count: { select: { evidence: true } },
      responsibilityProposals: {
        orderBy: { createdAt: 'asc' },
        select: { status: true, arrangedBy: true, payer: true, tenantCap: true },
      },
    },
  })

  const comparable = await findingComparables(inspection)

  // Unpublished work: an edit or addition since the last version (updatedAt), or a
  // deletion, which leaves no row behind and shows only as a different count.
  const latest = inspection.assessments[0]
  const draftChanged = !latest ||
    inspection.findings.some((finding) => finding.updatedAt > latest.publishedAt) ||
    inspection.findings.length !== assessmentSnapshotSchema.parse(latest.snapshot).findings.length

  const checkInConditions = inspection.kind === 'CHECK_OUT' && inspection.findings.length > 0
    ? await findingCheckInConditions(id, agent.id) : null
  return {
    id: inspection.id,
    tenancyRecordId: inspection.tenancyId,
    propertyId: inspection.tenancy.propertyId,
    propertyState: propertyState(inspection.tenancy.property),
    access: await tenancyAccess(inspection.tenancyId, agent.id),
    kind: inspection.kind,
    status: inspection.status,
    property: propertyLabel(inspection.tenancy.property),
    landlord: inspection.tenancy.landlord.name,
    landlordId: inspection.tenancy.landlordId,
    tenant: inspection.tenancy.tenant.name,
    tenantId: inspection.tenancy.tenantId,
    deposit: inspection.tenancy.deposit.toString(),
    summary: inspection.summary,
    baselineId: inspection.baseline?.id ?? null,
    checkOutId: inspection.checkOut?.id ?? null,
    // Required by installed app builds up to 19; see the note on rooms below.
    aiConsentAt: inspection.aiConsentAt?.toISOString() ?? null,
    shareToken: inspection.shareToken,
    shareUrl: inspection.shareToken
      ? new URL(`/reports/${inspection.shareToken}`, request.url).toString()
      : null,
    signatures: inspection.signatures.map((signature) => ({
      stakeholderId: signature.stakeholderId,
      signedAt: signature.signedAt.toISOString(),
    })),
    // Whether each party has been emailed the signing link. Older app builds ignore it.
    signingParties: (await signingParties(id)).map((party) => ({
      stakeholderId: party.stakeholderId,
      role: party.role,
      email: party.email,
      signedAt: party.signedAt?.toISOString() ?? null,
      signingEmail: party.signingEmail && {
        state: party.signingEmail.state,
        at: party.signingEmail.at.toISOString(),
      },
    })),
    latestAssessment: inspection.assessments[0]
      ? {
          version: inspection.assessments[0].version,
          publishedAt: inspection.assessments[0].publishedAt.toISOString(),
        }
      : null,
    assessmentDraftChanged: inspection.kind === 'CHECK_OUT' && draftChanged,
    maintenanceHistory: maintenanceHistory.map((item) => {
      const agreed = item.responsibilityProposals.find((proposal) => proposal.status === 'ACCEPTED')
      return {
        id: item.id,
        title: item.title,
        status: item.status,
        asset: item.propertyAsset?.name ?? null,
        repairAttempts: item.visits.length,
        evidence: item._count.evidence,
        createdAt: item.createdAt.toISOString(),
        costStanding: costStanding(item.status, item.responsibilityProposals),
        costAgreement: agreed ? describeProposal(agreed) : null,
      }
    }),
    findings: await Promise.all(inspection.findings.map(async (finding) => ({
      id: finding.id,
      changeType: finding.changeType,
      verdict: finding.verdict,
      rationale: finding.rationale,
      estimatedCost: finding.estimatedCost?.toString() ?? null,
      confidence: finding.confidence,
      editedByHuman: finding.editedByHuman,
      itemId: finding.itemId,
      baselineItemId: inspection.baseline ? finding.baselineItem?.id ?? null : null,
      itemLabel: finding.item ? `${finding.item.room.name} · ${finding.item.name}` : null,
      baselineLabel: inspection.baseline && finding.baselineItem
        ? `${finding.baselineItem.room.name} · ${finding.baselineItem.name}`
        : null,
      baselineCondition: inspection.baseline
        ? checkInConditions?.get(finding.baselineItemId ? `item:${finding.baselineItemId}` : finding.item?.baselineKey ?? '')
          ?? finding.baselineItem?.condition ?? null
        : null,
      currentCondition: finding.item?.condition ?? null,
      maintenanceCaseId: finding.maintenanceCase?.id ?? null,
      maintenanceCaseTitle: finding.maintenanceCase?.title ?? null,
      photos: await Promise.all(finding.photos.map(findingPhotoView)),
    }))),
    checkOutItems: comparable.checkOutItems,
    checkInItems: comparable.checkInItems,
    rooms: await Promise.all(inspection.rooms.map(async (room) => {
      const previews = room.captures
        .map((capture) => ({
          // The strip's tiles are 92px wide, so a photo's poster whenever it has one.
          path: capture.posterPath ?? (capture.kind === 'PHOTO' ? capture.storagePath : null),
          annotations: capture.kind === 'PHOTO' ? toAnnotations(capture.annotations) : null,
        }))
        .filter((preview): preview is typeof preview & { path: string } => preview.path !== null)
        .slice(0, 4)
      const previewMedia = await Promise.all(
        previews.map(async (preview) => ({
          url: await createDownloadUrl(preview.path),
          annotations: preview.annotations,
        })),
      )
      const previewUrls = previewMedia.map((preview) => preview.url)
      return {
        id: room.id,
        name: room.name,
        status: room.status,
        items: room._count.items,
        photos: room.captures.filter((capture) => capture.kind === 'PHOTO').length,
        videos: room.captures.filter((capture) => capture.kind === 'VIDEO').length,
        // previewUrl keeps patches 18 and 19 working; newer clients use the strip.
        previewUrl: previewUrls[0] ?? null,
        previewUrls,
        previewMedia,
        // Installed app builds up to 19 parse these as required fields and cannot open an
        // inspection without them. Nothing drafts a room now, so they are constant.
        // Delete once no such build is in use.
        newSinceDraft: 0,
        processingError: null,
      }
    })),
  }
})
