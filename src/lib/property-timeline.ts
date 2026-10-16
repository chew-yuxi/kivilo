import { db } from '@/lib/db'
import { inspectionScope, tenancyScope } from '@/lib/auth'
import { propertyLabel } from '@/lib/format'
import { describeProposal } from '@/lib/maintenance'
import type { Prisma } from '@/generated/prisma'

const timelineInclude = {
  tenant: { select: { name: true } },
  inspections: {
    where: { status: 'COMPLETED' as const },
    select: {
      id: true,
      kind: true,
      signatures: { select: { signedAt: true } },
      assessments: { select: { version: true, publishedAt: true } },
      // Only once both parties have acknowledged it is an update a settled fact.
      addenda: {
        where: { acknowledgedAt: { not: null } },
        select: { id: true, number: true, title: true, acknowledgedAt: true },
      },
    },
  },
  maintenanceCases: {
    select: {
      id: true,
      title: true,
      status: true,
      createdAt: true,
      resolvedAt: true,
      visits: {
        where: { completedAt: { not: null } },
        select: {
          id: true,
          completedAt: true,
          cost: true,
          verification: { select: { outcome: true, createdAt: true } },
        },
      },
      // Accepted now, or accepted and later replaced. A superseded proposal that was
      // never answered has no respondedAt, so it never was an agreement.
      responsibilityProposals: {
        where: { status: { in: ['ACCEPTED' as const, 'SUPERSEDED' as const] }, respondedAt: { not: null } },
        select: { id: true, respondedAt: true, arrangedBy: true, payer: true, tenantCap: true },
      },
    },
  },
} satisfies Prisma.TenancyInclude

type TimelineTenancy = Prisma.TenancyGetPayload<{ include: typeof timelineInclude }>

export type TimelineEvent = {
  id: string
  at: string
  kind:
    | 'TENANCY_STARTED' | 'TENANCY_ENDED'
    | 'CHECK_IN_SIGNED' | 'CHECK_OUT_SIGNED' | 'ASSESSMENT_PUBLISHED' | 'REPORT_UPDATED'
    | 'PROBLEM_REPORTED' | 'REPAIRED' | 'CONFIRMED_FIXED' | 'NOT_FIXED'
    | 'COST_AGREED' | 'CLOSED_WITHOUT_REPAIR'
  title: string
  detail: string | null
  tenancyId: string
  link: { type: 'maintenance' | 'inspection'; id: string } | null
  /// The signed report behind the event, which every viewer of the feed may read
  /// (`authorizeReport`). Separate from `link`, which build 22 routes to the
  /// maintenance screen whenever it is not an inspection.
  reportId: string | null
}

/// Turns the tenancies a viewer may see into one feed, newest first. Only settled facts:
/// drafts, open proposals and unsigned reports belong to the working screens.
export function timelineEvents(
  tenancies: TimelineTenancy[],
  workingCopies: Set<string>,
  now = new Date(),
): TimelineEvent[] {
  type Draft = Omit<TimelineEvent, 'at'> & { at: Date }
  const events: Draft[] = []
  const add = (event: Draft) => events.push(event)

  for (const tenancy of tenancies) {
    const tenancyId = tenancy.id
    if (tenancy.startDate <= now) {
      add({
        id: `${tenancyId}:start`, at: tenancy.startDate, kind: 'TENANCY_STARTED',
        title: 'Tenancy began', detail: tenancy.tenant.name, tenancyId, link: null, reportId: null,
      })
    }
    if (tenancy.endDate <= now) {
      add({
        id: `${tenancyId}:end`, at: tenancy.endDate, kind: 'TENANCY_ENDED',
        title: 'Tenancy ended', detail: tenancy.tenant.name, tenancyId, link: null, reportId: null,
      })
    }

    for (const inspection of tenancy.inspections) {
      const link = workingCopies.has(inspection.id)
        ? { type: 'inspection' as const, id: inspection.id }
        : null
      const signed = inspection.signatures.map((signature) => signature.signedAt.getTime())
      if (signed.length > 0) {
        const checkIn = inspection.kind === 'CHECK_IN'
        add({
          id: `${inspection.id}:signed`, at: new Date(Math.max(...signed)),
          kind: checkIn ? 'CHECK_IN_SIGNED' : 'CHECK_OUT_SIGNED',
          title: checkIn ? 'Check-in signed' : 'Check-out signed',
          detail: 'Signed by both parties', tenancyId, link, reportId: inspection.id,
        })
      }
      for (const assessment of inspection.assessments) {
        add({
          id: `${inspection.id}:assessment:${assessment.version}`, at: assessment.publishedAt,
          kind: 'ASSESSMENT_PUBLISHED',
          title: assessment.version === 1
            ? 'Check-out assessment published'
            : `Check-out assessment version ${assessment.version} published`,
          detail: null, tenancyId, link, reportId: inspection.id,
        })
      }
      for (const addendum of inspection.addenda) {
        add({
          id: `${addendum.id}:acknowledged`, at: addendum.acknowledgedAt!, kind: 'REPORT_UPDATED',
          title: `Check-in report updated: ${addendum.title}`,
          detail: `Update ${addendum.number}, acknowledged by both parties`, tenancyId, link, reportId: inspection.id,
        })
      }
    }

    for (const item of tenancy.maintenanceCases) {
      const link = { type: 'maintenance' as const, id: item.id }
      add({
        id: `${item.id}:reported`, at: item.createdAt, kind: 'PROBLEM_REPORTED',
        title: `Reported: ${item.title}`, detail: null, tenancyId, link, reportId: null,
      })
      for (const visit of item.visits) {
        add({
          id: `${visit.id}:repaired`, at: visit.completedAt!, kind: 'REPAIRED',
          title: `Repaired: ${item.title}`,
          detail: visit.cost ? `S$${visit.cost.toFixed(2)}` : null, tenancyId, link, reportId: null,
        })
        if (visit.verification) {
          const fixed = visit.verification.outcome === 'FIXED'
          add({
            id: `${visit.id}:verified`, at: visit.verification.createdAt,
            kind: fixed ? 'CONFIRMED_FIXED' : 'NOT_FIXED',
            title: fixed ? `Confirmed fixed: ${item.title}` : `Not fixed: ${item.title}`,
            detail: null, tenancyId, link, reportId: null,
          })
        }
      }
      for (const agreement of item.responsibilityProposals) {
        add({
          id: `${agreement.id}:agreed`, at: agreement.respondedAt!, kind: 'COST_AGREED',
          title: `Cost agreed: ${item.title}`, detail: describeProposal(agreement), tenancyId, link, reportId: null,
        })
      }
      if (item.status === 'CLOSED_NO_ACTION' && item.resolvedAt) {
        add({
          id: `${item.id}:closed`, at: item.resolvedAt, kind: 'CLOSED_WITHOUT_REPAIR',
          title: `Closed without repair: ${item.title}`, detail: null, tenancyId, link, reportId: null,
        })
      }
    }
  }

  return events
    .sort((a, b) => b.at.getTime() - a.at.getTime() || a.id.localeCompare(b.id))
    .map((event) => ({ ...event, at: event.at.toISOString() }))
}

/// Exactly the tenancies `tenancyScope` gives the viewer, so who sees what cannot drift
/// from maintenance. No tenancy in scope is the same 404 as no property.
export async function propertyTimeline(propertyId: string, stakeholderId: string) {
  const tenancies = await db.tenancy.findMany({
    where: { AND: [{ propertyId }, tenancyScope(stakeholderId)] },
    orderBy: { startDate: 'asc' },
    include: { ...timelineInclude, property: true },
  })
  if (tenancies.length === 0) throw new Error('Property not found')
  // The working copies this viewer may open, decided by the one inspection rule rather
  // than a second reading of it here.
  const workingCopies = await db.inspection.findMany({
    where: { AND: [{ tenancyId: { in: tenancies.map((tenancy) => tenancy.id) } }, inspectionScope(stakeholderId)] },
    select: { id: true },
  })
  return {
    property: propertyLabel(tenancies[0].property),
    tenancies: tenancies.map((tenancy) => ({
      id: tenancy.id,
      tenant: tenancy.tenant.name,
      startDate: tenancy.startDate.toISOString(),
      endDate: tenancy.endDate.toISOString(),
    })),
    events: timelineEvents(tenancies, new Set(workingCopies.map((inspection) => inspection.id))),
  }
}
