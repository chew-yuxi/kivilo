import { db } from '@/lib/db'
import { actsAsAgent, inspectionScope, managedTenancies, supportingDocumentTenancies } from '@/lib/auth'
import { inspectionWorkScope, type InspectionWorkFilters } from '@/lib/inspection-work'
import { listTenancies } from '@/lib/maintenance'
import { propertyState } from '@/lib/property-management'
import { propertyLabel } from '@/lib/format'
import { createDownloadUrl } from '@/lib/storage'
import { Prisma, type InspectionStatus } from '@/generated/prisma'

/// Where a property is, read from the newest tenancy the viewer can see. A renewal is a
/// new tenancy on the same property, so the card follows the work in front of the agent;
/// the property page lists every term.
export type PropertyStage =
  | 'CHECK_IN_IN_PROGRESS'
  | 'CHECK_IN_AWAITING'
  | 'RUNNING'
  | 'CHECK_OUT_DUE'
  | 'CHECK_OUT_IN_PROGRESS'
  | 'CHECK_OUT_AWAITING'
  | 'ENDED'

const stageLabels: Record<PropertyStage, string> = {
  CHECK_IN_IN_PROGRESS: 'Check-in in progress',
  CHECK_IN_AWAITING: 'Check-in awaiting signatures',
  RUNNING: 'Tenancy running',
  CHECK_OUT_DUE: 'Check-out due',
  CHECK_OUT_IN_PROGRESS: 'Check-out in progress',
  CHECK_OUT_AWAITING: 'Check-out awaiting signatures',
  ENDED: 'Ended',
}

const CHECK_OUT_NOTICE_DAYS = 30

type Report = { id: string; kind: 'CHECK_IN' | 'CHECK_OUT'; status: InspectionStatus; createdAt: Date }

export function propertyStage(reports: Report[], endDate: Date, now = new Date()): {
  stage: PropertyStage
  next: Report | null
} {
  const newest = (kind: Report['kind']) => reports
    .filter((report) => report.kind === kind)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null
  const checkOut = newest('CHECK_OUT')
  if (checkOut) {
    return {
      stage: checkOut.status === 'COMPLETED' ? 'ENDED'
        : checkOut.status === 'AWAITING_SIGNATURE' ? 'CHECK_OUT_AWAITING' : 'CHECK_OUT_IN_PROGRESS',
      next: checkOut,
    }
  }
  const checkIn = newest('CHECK_IN')
  if (checkIn && checkIn.status !== 'COMPLETED') {
    return { stage: checkIn.status === 'AWAITING_SIGNATURE' ? 'CHECK_IN_AWAITING' : 'CHECK_IN_IN_PROGRESS', next: checkIn }
  }
  const due = endDate.getTime() - now.getTime() <= CHECK_OUT_NOTICE_DAYS * 86_400_000
  return { stage: due ? 'CHECK_OUT_DUE' : 'RUNNING', next: checkIn }
}

const shortDate = new Intl.DateTimeFormat('en-SG', { dateStyle: 'medium', timeZone: 'Asia/Singapore' })

/// The card's line under the address: what is next and who it waits on, where the
/// stage label alone would be vague. Null where the stage label says it all.
export function propertyNextStep(
  stage: PropertyStage,
  input: {
    kind: 'CHECK_IN' | 'CHECK_OUT' | null
    rooms: { total: number; reviewed: number }
    unsigned: string[]
    endDate: Date
  },
  now = new Date(),
): string | null {
  const report = input.kind === 'CHECK_OUT' ? 'Check-out' : 'Check-in'
  switch (stage) {
    case 'CHECK_IN_IN_PROGRESS':
    case 'CHECK_OUT_IN_PROGRESS':
      return input.rooms.total === 0
        ? `${report} started, no rooms yet`
        : `${report}: ${input.rooms.reviewed} of ${input.rooms.total} rooms reviewed`
    case 'CHECK_IN_AWAITING':
    case 'CHECK_OUT_AWAITING':
      return input.unsigned.length === 0 ? null : `Waiting on ${input.unsigned.join(' and ')} to sign`
    case 'CHECK_OUT_DUE':
      return input.endDate < now
        ? `Lease ended ${shortDate.format(input.endDate)}, check-out not started`
        : `Check-out due by ${shortDate.format(input.endDate)}`
    default:
      return null
  }
}

export type PropertyWorkFilters = Omit<InspectionWorkFilters, 'state' | 'status'> & {
  state?: 'active' | 'archived' | 'trash'
}

/// One row per property the viewer works, built from the same inspection scope as the
/// work list, so nothing appears or disappears compared with it. Recently deleted uses
/// the management scope, which is the only way to reach a trashed property.
export async function propertyWork(actorId: string, filters: PropertyWorkFilters = {}, now = new Date()) {
  const { state = 'active', ...narrow } = filters
  const where: Prisma.InspectionWhereInput = state === 'trash'
    ? {
      tenancy: {
        AND: [managedTenancies(actorId), { property: { trashedAt: { not: null } } }],
        ...(narrow.agencyId ? { agencyId: narrow.agencyId } : {}),
        ...(narrow.personal ? { agencyId: null } : {}),
      },
    }
    : inspectionWorkScope(actorId, { ...narrow, state })
  const inspections = await db.inspection.findMany({
    where,
    select: {
      id: true, kind: true, status: true, createdAt: true, conductedAt: true,
      tenancy: {
        select: {
          id: true, startDate: true, endDate: true, createdAt: true,
          property: true, landlordId: true, tenantId: true,
          landlord: { select: { name: true } },
          tenant: { select: { name: true } },
          agency: { select: { name: true } },
          agent: { select: { name: true } },
        },
      },
    },
  })
  const card = await cardDetails(actorId, inspections)

  const byProperty = new Map<string, typeof inspections>()
  for (const inspection of inspections) {
    const id = inspection.tenancy.property.id
    byProperty.set(id, [...(byProperty.get(id) ?? []), inspection])
  }

  return [...byProperty.values()].map((rows) => {
    const tenancies = new Map(rows.map((row) => [row.tenancy.id, row.tenancy]))
    const current = [...tenancies.values()].sort((a, b) =>
      b.startDate.getTime() - a.startDate.getTime() || b.createdAt.getTime() - a.createdAt.getTime())[0]
    const reports = rows.filter((row) => row.tenancy.id === current.id)
    const { stage, next } = propertyStage(reports, current.endDate, now)
    const lastActivity = rows.reduce((latest, row) => {
      const at = row.conductedAt ?? row.createdAt
      return at > latest ? at : latest
    }, rows[0].createdAt)
    const signed = next ? card.signatures.get(next.id) ?? new Set<string>() : new Set<string>()
    const newestFirst = [...rows].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    const covered = newestFirst.find((row) => row.kind === 'CHECK_IN' && card.covers.has(row.id))
      ?? newestFirst.find((row) => card.covers.has(row.id))
    const checkOut = reports.find((row) => row.kind === 'CHECK_OUT' && row.status === 'COMPLETED')
    return {
      id: current.property.id,
      address: propertyLabel(current.property),
      state: propertyState(current.property),
      trashExpiresAt: current.property.trashExpiresAt?.toISOString() ?? null,
      tenancyId: current.id,
      tenant: current.tenant.name,
      agencyName: current.agency?.name ?? null,
      leadAgentName: current.agent?.name ?? null,
      startDate: current.startDate.toISOString(),
      endDate: current.endDate.toISOString(),
      coverUrl: covered ? card.covers.get(covered.id)! : null,
      stage,
      stageLabel: stageLabels[stage],
      nextStep: propertyNextStep(stage, {
        kind: next?.kind ?? null,
        rooms: next ? card.rooms.get(next.id) ?? { total: 0, reviewed: 0 } : { total: 0, reviewed: 0 },
        unsigned: [
          ...(signed.has(current.landlordId) ? [] : [current.landlord.name]),
          ...(signed.has(current.tenantId) || current.tenantId === current.landlordId ? [] : [current.tenant.name]),
        ],
        endDate: current.endDate,
      }, now),
      attention: {
        openRepairs: card.openRepairs.get(current.id) ?? 0,
        pendingUpdates: reports.reduce((sum, row) => sum + (card.pendingUpdates.get(row.id) ?? 0), 0),
        depositAnswersMissing: checkOut ? card.depositAnswers.get(checkOut.id)?.(current.landlordId, current.tenantId) ?? 0 : 0,
      },
      nextInspectionId: next?.id ?? null,
      nextInspectionKind: next?.kind ?? null,
      reports: rows.length,
      tenancies: tenancies.size,
      lastActivityAt: lastActivity.toISOString(),
    }
  }).sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt))
}

type WorkRow = {
  id: string
  kind: 'CHECK_IN' | 'CHECK_OUT'
  status: InspectionStatus
  tenancy: { id: string }
}

/// What the cards show beyond the stage, fetched for every listed report at once. Each
/// read is limited to reports already in the viewer's scope, and repair counts to the
/// terms whose repairs the viewer may open.
async function cardDetails(actorId: string, rows: WorkRow[]) {
  const ids = rows.map((row) => row.id)
  const ofStatus = (...statuses: InspectionStatus[]) =>
    rows.filter((row) => statuses.includes(row.status)).map((row) => row.id)
  const completedCheckOuts = rows
    .filter((row) => row.kind === 'CHECK_OUT' && row.status === 'COMPLETED').map((row) => row.id)
  const [covers, rooms, signatures, openable, updates, versions] = await Promise.all([
    ids.length === 0 ? [] : db.$queryRaw<{ inspectionId: string; storagePath: string; posterPath: string | null }[]>`
      SELECT DISTINCT ON (r."inspectionId") r."inspectionId", c."storagePath", c."posterPath"
      FROM "Capture" c JOIN "Room" r ON r."id" = c."roomId"
      WHERE r."inspectionId" IN (${Prisma.join(ids)}) AND c."kind" = 'PHOTO'
      ORDER BY r."inspectionId", r."order", c."createdAt"`,
    db.room.groupBy({
      by: ['inspectionId', 'status'],
      where: { inspectionId: { in: ofStatus('DRAFT', 'CAPTURING', 'PROCESSING', 'REVIEW', 'FAILED') } },
      _count: { _all: true },
    }),
    db.signature.findMany({
      where: { inspectionId: { in: ofStatus('AWAITING_SIGNATURE') } },
      select: { inspectionId: true, stakeholderId: true },
    }),
    listTenancies(actorId),
    db.reportAddendum.groupBy({
      by: ['inspectionId'],
      where: { inspectionId: { in: ids }, publishedAt: { not: null }, acknowledgedAt: null, disputedAt: null },
      _count: { _all: true },
    }),
    completedCheckOuts.length === 0 ? [] : db.$queryRaw<{ id: string; inspectionId: string; hasDeposit: boolean }[]>`
      SELECT DISTINCT ON ("inspectionId") "id", "inspectionId", ("snapshot" ? 'deposit') AS "hasDeposit"
      FROM "AssessmentVersion" WHERE "inspectionId" IN (${Prisma.join(completedCheckOuts)})
      ORDER BY "inspectionId", "version" DESC`,
  ])
  const repairTenancies = [...new Set(rows.map((row) => row.tenancy.id))]
    .filter((id) => openable.some((tenancy) => tenancy.id === id))
  const [repairs, responses] = await Promise.all([
    db.maintenanceCase.groupBy({
      by: ['tenancyId'],
      where: { tenancyId: { in: repairTenancies }, status: { notIn: ['RESOLVED', 'CLOSED_NO_ACTION'] } },
      _count: { _all: true },
    }),
    db.assessmentResponse.findMany({
      where: { assessmentVersionId: { in: versions.filter((row) => row.hasDeposit).map((row) => row.id) } },
      select: { assessmentVersionId: true, stakeholderId: true },
    }),
  ])

  const roomCounts = new Map<string, { total: number; reviewed: number }>()
  for (const row of rooms) {
    const counts = roomCounts.get(row.inspectionId) ?? { total: 0, reviewed: 0 }
    counts.total += row._count._all
    if (row.status === 'REVIEWED') counts.reviewed += row._count._all
    roomCounts.set(row.inspectionId, counts)
  }
  const signed = new Map<string, Set<string>>()
  for (const row of signatures) signed.set(row.inspectionId, (signed.get(row.inspectionId) ?? new Set()).add(row.stakeholderId))
  // A version from before deposits were frozen has no statement to answer.
  const depositAnswers = new Map(versions.filter((row) => row.hasDeposit).map((row) => {
    const answered = new Set(responses.filter((each) => each.assessmentVersionId === row.id).map((each) => each.stakeholderId))
    return [row.inspectionId, (landlordId: string, tenantId: string) =>
      new Set([landlordId, tenantId].filter((id) => !answered.has(id))).size] as const
  }))

  return {
    covers: new Map(await Promise.all(covers.map(async (row) =>
      [row.inspectionId, await createDownloadUrl(row.posterPath ?? row.storagePath)] as const))),
    rooms: roomCounts,
    signatures: signed,
    openRepairs: new Map(repairs.map((row) => [row.tenancyId, row._count._all])),
    pendingUpdates: new Map(updates.map((row) => [row.inspectionId, row._count._all])),
    depositAnswers,
  }
}

/// Everything at one address the viewer works: every term, newest first, with the
/// reports in each that they can open, and which linked screens they may open.
export async function propertyOverview(propertyId: string, actorId: string, now = new Date()) {
  const property = await db.property.findUnique({ where: { id: propertyId } })
  const inspections = await db.inspection.findMany({
    where: {
      AND: [
        { tenancy: { propertyId } },
        { OR: [inspectionScope(actorId), { tenancy: managedTenancies(actorId) }] },
      ],
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, kind: true, status: true, createdAt: true, conductedAt: true,
      tenancy: {
        select: {
          id: true, startDate: true, endDate: true, createdAt: true, monthlyRent: true, deposit: true,
          tenant: { select: { name: true, email: true } },
          landlord: { select: { name: true, email: true } },
          agency: { select: { name: true } },
          agent: { select: { name: true } },
        },
      },
    },
  })
  if (!property || inspections.length === 0) throw new Error('Property not found')
  const propertyDetailsFrozen = await db.inspection.count({ where: {
    tenancy: { propertyId }, status: { in: ['AWAITING_SIGNATURE', 'COMPLETED'] },
  } }) > 0

  // Repairs, assets and the timeline are tenancy screens with their own rule (a running
  // term), so each term says whether it can be opened rather than failing when tapped.
  const openable = new Map((await listTenancies(actorId)).filter((row) => row.propertyId === propertyId)
    .map((row) => [row.id, row]))
  // Documents also exist before signing and after a term ends. Do not reuse the
  // running-tenancy permission used by repairs, or an exact inspection grant.
  const documentTenancies = new Set((await db.tenancy.findMany({
    where: { propertyId, AND: [supportingDocumentTenancies(actorId)] }, select: { id: true },
  })).map((tenancy) => tenancy.id))
  const editableTenancies = new Set((await db.tenancy.findMany({
    where: { propertyId, AND: [actsAsAgent(actorId)] }, select: { id: true },
  })).map((tenancy) => tenancy.id))
  const terms = new Map<string, (typeof inspections)[number]['tenancy']>()
  for (const inspection of inspections) terms.set(inspection.tenancy.id, inspection.tenancy)
  const ordered = [...terms.values()].sort((a, b) =>
    b.startDate.getTime() - a.startDate.getTime() || b.createdAt.getTime() - a.createdAt.getTime())
  const currentReports = inspections.filter((row) => row.tenancy.id === ordered[0].id)
  const { stage, next } = propertyStage(currentReports, ordered[0].endDate, now)

  return {
    id: property.id,
    address: propertyLabel(property),
    line1: property.line1,
    unit: property.unit,
    postalCode: property.postalCode,
    propertyType: property.type,
    state: propertyState(property),
    stage,
    stageLabel: stageLabels[stage],
    nextInspectionId: next?.id ?? null,
    nextInspectionKind: next?.kind ?? null,
    canOpenTimeline: openable.size > 0,
    canEditPropertyDetails: editableTenancies.has(ordered[0].id) && !propertyDetailsFrozen,
    propertyDetailsLockedReason: !editableTenancies.has(ordered[0].id)
      ? 'Only an agent working this tenancy can edit the property details.'
      : propertyDetailsFrozen ? 'Property details are fixed because a report was sent for signature.' : null,
    terms: ordered.map((term) => {
      const fullAccess = editableTenancies.has(term.id)
      const detailsFrozen = inspections.some((inspection) => inspection.tenancy.id === term.id &&
        (inspection.status === 'AWAITING_SIGNATURE' || inspection.status === 'COMPLETED'))
      return {
        tenancyId: term.id,
        startDate: term.startDate.toISOString(),
        endDate: term.endDate.toISOString(),
        tenant: term.tenant.name,
        landlord: term.landlord.name,
        landlordEmail: fullAccess ? term.landlord.email : null,
        tenantEmail: fullAccess ? term.tenant.email : null,
        monthlyRent: fullAccess ? term.monthlyRent.toString() : null,
        deposit: fullAccess ? term.deposit.toString() : null,
        canEditDetails: fullAccess && !detailsFrozen,
        detailsLockedReason: !fullAccess
          ? 'Only an agent working this tenancy can edit these details.'
          : detailsFrozen ? 'These details are fixed because a report was sent for signature.' : null,
        agencyName: term.agency?.name ?? null,
        leadAgentName: term.agent?.name ?? null,
        canOpenDocuments: documentTenancies.has(term.id),
        /// The same shape as GET /api/v1/tenancies, for the repairs and assets screen.
        tenancy: openable.get(term.id) ?? null,
        reports: inspections.filter((row) => row.tenancy.id === term.id).map((row) => ({
          id: row.id,
          kind: row.kind,
          status: row.status,
          createdAt: row.createdAt.toISOString(),
          conductedAt: row.conductedAt?.toISOString() ?? null,
        })),
      }
    }),
  }
}
