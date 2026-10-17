import { db } from '@/lib/db'
import { authorizeInspection } from '@/lib/auth'
import { propertyLabel } from '@/lib/format'
import { authed } from '@/lib/api/route'
import { assessmentSnapshotSchema } from '@/lib/assessment-schema'
import { costStanding, describeProposal } from '@/lib/maintenance'
import { createDownloadUrl } from '@/lib/storage'
import { toAnnotations } from '@/lib/annotations'
import { signingParties } from '@/lib/report-email'

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
        // The frozen check-in reference only `check-in-reference.ts` reads.
        omit: { baseline: true },
        include: {
          captures: {
            orderBy: { createdAt: 'desc' },
            select: { kind: true, storagePath: true, posterPath: true, annotations: true },
          },
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
      assessments: {
        orderBy: { version: 'desc' },
        take: 1,
        select: { version: true, publishedAt: true, snapshot: true },
      },
    },
  })
  const maintenanceHistory = await db.maintenanceCase.findMany({
    where: { tenancyId: inspection.tenancyId },
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

  // What the add-finding form offers: every item on both signed reports.
  const comparable = async (inspectionId: string | null) =>
    inspectionId && inspection.kind === 'CHECK_OUT' && inspection.status === 'COMPLETED'
      ? (
          await db.inspectionItem.findMany({
            where: { room: { inspectionId } },
            orderBy: [{ room: { order: 'asc' } }, { createdAt: 'asc' }],
            include: { room: { select: { name: true } } },
          })
        ).map((item) => ({ id: item.id, label: `${item.room.name} · ${item.name}` }))
      : []

  // Unpublished work: an edit or addition since the last version (updatedAt), or a
  // deletion, which leaves no row behind and shows only as a different count.
  const latest = inspection.assessments[0]
  const draftChanged = !latest ||
    inspection.findings.some((finding) => finding.updatedAt > latest.publishedAt) ||
    inspection.findings.length !== assessmentSnapshotSchema.parse(latest.snapshot).findings.length

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
    checkOutItems: await comparable(inspection.id),
    checkInItems: await comparable(inspection.baselineId),
    rooms: await Promise.all(inspection.rooms.map(async (room) => {
      const previews = room.captures
        .map((capture) => ({
          path: capture.kind === 'PHOTO' ? capture.storagePath : capture.posterPath,
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
