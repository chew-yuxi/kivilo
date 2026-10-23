import { db } from '@/lib/db'
import { actsAsAgent, inspectionScope, managedTenancies } from '@/lib/auth'
import { restoreAllowed } from '@/lib/bin-rules'
import type { Prisma } from '@/generated/prisma'

/// A burst of the same person's edits to one thing folds into a single line, so autosave
/// and a run of photos read as "Jac edited Fridge" rather than forty rows.
const FOLD_WINDOW_MS = 15 * 60 * 1000

export type FieldChange = { field: string; from: string | null; to: string | null }

type Where = { propertyId: string; tenancyId: string | null; inspectionId: string | null }

/// The property and tenancy an inspection belongs to, for recording against it.
export async function inspectionPlace(tx: Prisma.TransactionClient, inspectionId: string): Promise<Where> {
  const inspection = await tx.inspection.findUniqueOrThrow({
    where: { id: inspectionId },
    select: { tenancyId: true, tenancy: { select: { propertyId: true } } },
  })
  return { propertyId: inspection.tenancy.propertyId, tenancyId: inspection.tenancyId, inspectionId }
}

export async function tenancyPlace(tx: Prisma.TransactionClient, tenancyId: string): Promise<Where> {
  const tenancy = await tx.tenancy.findUniqueOrThrow({ where: { id: tenancyId }, select: { propertyId: true } })
  return { propertyId: tenancy.propertyId, tenancyId, inspectionId: null }
}

/// Records one line of history. Call it inside the transaction that makes the change,
/// so the change and its record commit or roll back together.
export async function recordEvent(tx: Prisma.TransactionClient, event: Where & {
  actorId: string
  kind: string
  summary: string
  changes?: FieldChange[]
  binItemId?: string
}) {
  const actor = await tx.stakeholder.findUnique({ where: { id: event.actorId }, select: { name: true } })
  await tx.propertyEvent.create({
    data: {
      propertyId: event.propertyId,
      tenancyId: event.tenancyId,
      inspectionId: event.inspectionId,
      actorId: event.actorId,
      actorName: actor?.name ?? 'Someone',
      kind: event.kind,
      summary: event.summary,
      detail: event.changes?.length ? { changes: event.changes } : undefined,
      binItemId: event.binItemId,
    },
  })
}

/// Folds into the same person's recent line about the same subject, or starts one.
/// Field changes keep the first `from` and the latest `to`; a count adds up.
export async function recordBurst(tx: Prisma.TransactionClient, event: Where & {
  actorId: string
  kind: string
  subjectKey: string
  summary: (count: number) => string
  changes?: FieldChange[]
}) {
  const recent = await tx.propertyEvent.findFirst({
    where: {
      subjectKey: event.subjectKey,
      actorId: event.actorId,
      kind: event.kind,
      updatedAt: { gt: new Date(Date.now() - FOLD_WINDOW_MS) },
    },
    orderBy: { updatedAt: 'desc' },
  })
  const previous = (recent?.detail ?? {}) as { changes?: FieldChange[]; count?: number }
  const count = (previous.count ?? 0) + 1
  const changes = mergeChanges(previous.changes ?? [], event.changes ?? [])
  const detail = { count, ...(changes.length ? { changes } : {}) }
  if (recent) {
    await tx.propertyEvent.update({ where: { id: recent.id }, data: { summary: event.summary(count), detail } })
    return
  }
  const actor = await tx.stakeholder.findUnique({ where: { id: event.actorId }, select: { name: true } })
  await tx.propertyEvent.create({
    data: {
      propertyId: event.propertyId,
      tenancyId: event.tenancyId,
      inspectionId: event.inspectionId,
      actorId: event.actorId,
      actorName: actor?.name ?? 'Someone',
      kind: event.kind,
      subjectKey: event.subjectKey,
      summary: event.summary(count),
      detail,
    },
  })
}

function mergeChanges(before: FieldChange[], next: FieldChange[]) {
  const merged = new Map(before.map((change) => [change.field, change]))
  for (const change of next) {
    const first = merged.get(change.field)
    merged.set(change.field, { field: change.field, from: first ? first.from : change.from, to: change.to })
  }
  // An edit that ends where it began is no change worth showing.
  return [...merged.values()].filter((change) => change.from !== change.to)
}

/// The changes between two versions of a row, for the fields a person would recognise.
/// Numbers compare by value, so a cost saved as "120.00" over 120 is no change.
export function fieldChanges(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  labels: Record<string, string>,
): FieldChange[] {
  const changes: FieldChange[] = []
  for (const [key, label] of Object.entries(labels)) {
    if (!(key in after) || after[key] === undefined) continue
    const from = before[key] == null ? null : String(before[key])
    const to = after[key] == null ? null : String(after[key])
    if (from === to) continue
    if (from !== null && to !== null && from.trim() !== '' && Number(from) === Number(to)) continue
    changes.push({ field: label, from, to })
  }
  return changes
}

/// Who may read a property's history: anyone working any of its tenancies (lead,
/// collaborators, a team's owners and managers), and someone holding an exact grant to
/// an old inspection, who sees that inspection's lines only. Landlords and tenants read
/// signed reports, not the agents' working log.
export async function propertyHistory(propertyId: string, viewerId: string, filter: 'all' | 'deletions' = 'all') {
  const [property, fullTenancies, grantedInspections] = await Promise.all([
    db.property.findUnique({ where: { id: propertyId }, select: { id: true, line1: true, unit: true, postalCode: true } }),
    db.tenancy.findMany({
      where: { propertyId, OR: [actsAsAgent(viewerId), managedTenancies(viewerId)] },
      select: { id: true },
    }),
    db.inspection.findMany({
      where: { tenancy: { propertyId, property: { trashedAt: null } }, accessGrants: { some: { stakeholderId: viewerId } } },
      select: { id: true },
    }),
  ])
  if (!property || (fullTenancies.length === 0 && grantedInspections.length === 0)) {
    throw new Error('Property not found')
  }
  const tenancyIds = fullTenancies.map((tenancy) => tenancy.id)
  const visible: Prisma.PropertyEventWhereInput[] = [
    { tenancyId: { in: tenancyIds } },
    { inspectionId: { in: grantedInspections.map((inspection) => inspection.id) } },
  ]
  if (tenancyIds.length) visible.push({ tenancyId: null })
  const events = await db.propertyEvent.findMany({
    where: {
      propertyId,
      OR: visible,
      ...(filter === 'deletions' ? { kind: { endsWith: '_DELETED' } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: { binItem: { select: { id: true, kind: true, expiresAt: true, restoredAt: true, inspectionId: true } } },
  })
  // Restoring is editing that inspection, so it follows the same rule as deleting did.
  const workable = new Map((await db.inspection.findMany({
    where: {
      AND: [
        { id: { in: events.flatMap((event) => event.binItem ? [event.binItem.inspectionId] : []) } },
        inspectionScope(viewerId),
      ],
    },
    select: { id: true, status: true },
  })).map((inspection) => [inspection.id, inspection.status]))
  const now = new Date()
  return {
    property: {
      id: property.id,
      address: [property.line1, property.unit].filter(Boolean).join(' '),
      postalCode: property.postalCode,
    },
    events: events.map((event) => ({
      id: event.id,
      at: event.updatedAt.toISOString(),
      actorName: event.actorName,
      kind: event.kind,
      summary: event.summary,
      changes: ((event.detail ?? {}) as { changes?: FieldChange[] }).changes ?? [],
      tenancyId: event.tenancyId,
      inspectionId: event.inspectionId,
      bin: event.binItem ? {
        id: event.binItem.id,
        expiresAt: event.binItem.expiresAt.toISOString(),
        restoredAt: event.binItem.restoredAt?.toISOString() ?? null,
        restorable: !event.binItem.restoredAt && event.binItem.expiresAt > now &&
          restoreAllowed(event.binItem.kind, workable.get(event.binItem.inspectionId)),
      } : null,
    })),
  }
}
