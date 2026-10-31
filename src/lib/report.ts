import { db } from '@/lib/db'
import { authorizeReport } from '@/lib/auth'
import { createDownloadUrl } from '@/lib/storage'
import { posterUrls } from '@/lib/poster-urls'
import { propertyLabel } from '@/lib/format'
import { toAnnotations } from '@/lib/annotations'
import { assessmentSnapshotSchema, depositStatement } from '@/lib/assessment-schema'
import { addendumView, publishedAddenda } from '@/lib/addenda'
import type { Prisma } from '@/generated/prisma'
import { reportAgent } from '@/lib/report-agent'

/// What a report contains, shared by the link page and the app so the two can never show
/// different documents. Late phone uploads may finish after Send; their bytes stay safely
/// in private storage, but evidence not stamped at review is not part of what was agreed.
export const reportInclude = {
  tenancy: {
    include: {
      property: true, landlord: true, tenant: true,
      agent: { include: { branding: true } },
      agency: { include: { branding: true } },
      // CEA due diligence the agent completed on either party; never anything about screening.
      cddCases: { where: { status: 'COMPLETE' }, orderBy: { completedAt: 'desc' }, select: { clientRole: true, completedAt: true } },
    },
  },
  conductedBy: true,
  reportAgent: { include: { branding: true } },
  reportAgency: { include: { branding: true } },
  checkOut: { select: { status: true } },
  rooms: {
    orderBy: { order: 'asc' },
    // The frozen check-in reference only `check-in-reference.ts` reads.
    omit: { baseline: true },
    include: {
      items: { orderBy: { createdAt: 'asc' }, include: { evidence: { select: { captureId: true } } } },
      captures: { where: { kind: 'PHOTO', processedAt: { not: null } }, orderBy: { createdAt: 'asc' } },
    },
  },
  signatures: { include: { stakeholder: true } },
  assessments: {
    orderBy: { version: 'desc' },
    take: 1,
    include: { responses: { include: { stakeholder: { select: { name: true } } }, orderBy: { respondedAt: 'asc' } } },
  },
  addenda: publishedAddenda,
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
    agent: reportAgent(inspection)?.name ?? null,
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
        // For the app's photo tiles; null until the poster cron has made it.
        posterUrl: capture.posterPath ? await createDownloadUrl(capture.posterPath) : null,
        note: capture.note,
        annotations: toAnnotations(capture.annotations),
      }))),
    }))),
    signatures: inspection.signatures.map((signature) => ({
      name: signature.stakeholder.name,
      signedAt: signature.signedAt.toISOString(),
      imageData: signature.imageData,
      contentHash: signature.contentHash,
    })),
    // Updates since signing, oldest first. A party sees `acknowledgeAs` on each one still
    // waiting for them. The agent, who is no party, sees `acknowledgeInPerson` while
    // either party is still pending, to take it on their phone.
    addenda: await Promise.all(inspection.addenda.map(async (row) => {
      const view = addendumView(row, tenancy)
      const mine = view.acknowledgements.find((ack) => ack.role.toUpperCase() === party)
      const isMoveInDefect = view.source === 'MOVE_IN_DEFECT'
      const canAnswer = !view.dispute && (!isMoveInDefect || inspection.checkOut?.status !== 'COMPLETED')
      return {
        ...view,
        acknowledgeAs: canAnswer && party && mine && !mine.acknowledgedAt && (!isMoveInDefect || party === 'LANDLORD') ? party : null,
        acknowledgeInPerson: !isMoveInDefect && !party && view.acknowledgements.some((ack) => !ack.acknowledgedAt),
        disputeAs: isMoveInDefect && canAnswer && party === 'LANDLORD' && !view.acknowledgedAt ? party : null,
        entries: await Promise.all(view.entries.map(async (entry) => ({
          ...entry,
          photos: await Promise.all(entry.photos.map(async ({ storagePath, ...photo }) => ({
            ...photo,
            url: await createDownloadUrl(storagePath),
            posterUrl: (await posterUrls([storagePath])).get(storagePath) ?? null,
          }))),
        }))),
      }
    })),
    assessment: assessment && published && {
      version: published.version,
      publishedAt: published.publishedAt.toISOString(),
      summary: assessment.summary,
      statement: depositStatementView(assessment, published.responses, tenancy, party),
      findings: await Promise.all(assessment.findings.map(async (finding) => ({
        id: finding.id,
        itemLabel: finding.itemLabel,
        verdict: finding.verdict,
        estimatedCost: finding.estimatedCost,
        rationale: finding.rationale,
        maintenanceTitle: finding.maintenanceEvidence?.title ?? null,
        photos: await Promise.all((finding.photos ?? []).map(async ({ storagePath, ...photo }) => ({
          ...photo,
          url: await createDownloadUrl(storagePath),
          posterUrl: (await posterUrls([storagePath])).get(storagePath) ?? null,
        }))),
        evidence: await Promise.all((finding.maintenanceEvidence?.evidence ?? []).map(async (item) => ({
          id: item.id,
          purpose: item.purpose,
          mimeType: item.mimeType,
          note: item.note,
          annotations: item.annotations ?? null,
          url: await createDownloadUrl(item.storagePath),
          posterUrl: (await posterUrls([item.storagePath])).get(item.storagePath) ?? null,
        }))),
      }))),
    },
  }
}

/// The deposit statement as the app shows it, or null on a version published before
/// deposits were frozen. A party who has not answered sees `answerAs`; the agent, who is
/// no party, sees `answerInPerson` for each party still to answer, to take it on their
/// phone. The answer names `version`, which the server checks is still the latest.
function depositStatementView(
  assessment: ReturnType<typeof assessmentSnapshotSchema.parse>,
  responses: { stakeholderId: string; answer: 'AGREED' | 'DISPUTED'; reason: string | null; method: string; respondedAt: Date }[],
  tenancy: { landlordId: string; tenantId: string; landlord: { name: string }; tenant: { name: string } },
  party: 'LANDLORD' | 'TENANT' | null,
) {
  const statement = depositStatement(assessment)
  if (!statement) return null
  const parties = [
    { stakeholderId: tenancy.landlordId, name: tenancy.landlord.name, role: 'LANDLORD' as const },
    { stakeholderId: tenancy.tenantId, name: tenancy.tenant.name, role: 'TENANT' as const },
  ]
  const answered = (id: string) => responses.some((response) => response.stakeholderId === id)
  return {
    deposit: statement.deposit,
    deductions: statement.deductions,
    toReturn: statement.toReturn,
    deductedCount: statement.deducted.length,
    responses: parties.map((row) => {
      const response = responses.find((candidate) => candidate.stakeholderId === row.stakeholderId)
      return {
        name: row.name,
        role: row.role,
        answer: response?.answer ?? null,
        reason: response?.reason ?? null,
        inPerson: response?.method === 'IN_PERSON',
        respondedAt: response?.respondedAt.toISOString() ?? null,
      }
    }),
    answerAs: party && !answered(party === 'LANDLORD' ? tenancy.landlordId : tenancy.tenantId) ? party : null,
    answerInPerson: party ? [] : parties.filter((row) => !answered(row.stakeholderId)),
  }
}

/// When the agent completed CEA customer due diligence on each party, or null. Only a
/// completed check is shown, so the report never says anything about one in progress.
export function verifiedParties(cases: { clientRole: 'LANDLORD' | 'TENANT'; completedAt: Date | null }[]) {
  const at = (role: 'LANDLORD' | 'TENANT') => cases.find((found) => found.clientRole === role)?.completedAt ?? null
  return { landlord: at('LANDLORD'), tenant: at('TENANT') }
}
