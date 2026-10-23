import { db } from '@/lib/db'
import { inspectionScope, managedTenancies, supportingDocumentTenancies } from '@/lib/auth'
import { inspectionWorkScope, type InspectionWorkFilters } from '@/lib/inspection-work'
import { listTenancies } from '@/lib/maintenance'
import { propertyState } from '@/lib/property-management'
import { propertyLabel } from '@/lib/format'
import type { InspectionStatus, Prisma } from '@/generated/prisma'

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
          property: true,
          tenant: { select: { name: true } },
          agency: { select: { name: true } },
          agent: { select: { name: true } },
        },
      },
    },
  })

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
    return {
      id: current.property.id,
      address: propertyLabel(current.property),
      state: propertyState(current.property),
      tenancyId: current.id,
      tenant: current.tenant.name,
      agencyName: current.agency?.name ?? null,
      leadAgentName: current.agent?.name ?? null,
      endDate: current.endDate.toISOString(),
      stage,
      stageLabel: stageLabels[stage],
      nextInspectionId: next?.id ?? null,
      nextInspectionKind: next?.kind ?? null,
      reports: rows.length,
      tenancies: tenancies.size,
      lastActivityAt: lastActivity.toISOString(),
    }
  }).sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt))
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
          id: true, startDate: true, endDate: true, createdAt: true,
          tenant: { select: { name: true } },
          landlord: { select: { name: true } },
          agency: { select: { name: true } },
          agent: { select: { name: true } },
        },
      },
    },
  })
  if (!property || inspections.length === 0) throw new Error('Property not found')

  // Repairs, assets and the timeline are tenancy screens with their own rule (a running
  // term), so each term says whether it can be opened rather than failing when tapped.
  const openable = new Map((await listTenancies(actorId)).filter((row) => row.propertyId === propertyId)
    .map((row) => [row.id, row]))
  // Documents also exist before signing and after a term ends. Do not reuse the
  // running-tenancy permission used by repairs, or an exact inspection grant.
  const documentTenancies = new Set((await db.tenancy.findMany({
    where: { propertyId, AND: [supportingDocumentTenancies(actorId)] }, select: { id: true },
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
    state: propertyState(property),
    stage,
    stageLabel: stageLabels[stage],
    nextInspectionId: next?.id ?? null,
    nextInspectionKind: next?.kind ?? null,
    canOpenTimeline: openable.size > 0,
    terms: ordered.map((term) => ({
      tenancyId: term.id,
      startDate: term.startDate.toISOString(),
      endDate: term.endDate.toISOString(),
      tenant: term.tenant.name,
      landlord: term.landlord.name,
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
    })),
  }
}
