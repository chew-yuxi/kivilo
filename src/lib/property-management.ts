import { db } from '@/lib/db'
import { inspectionScope, managedTenancies, tenancyAccessScope } from '@/lib/auth'
import { propertyLabel } from '@/lib/format'
import type { Prisma } from '@/generated/prisma'

export type PropertyListState = 'active' | 'archived' | 'trash'
export const PROPERTY_TRASH_DAYS = 30

export { PropertyLifecycleError } from '@/lib/property-errors'

export const protectedPropertyHistory: Prisma.PropertyWhereInput = {
  OR: [
    { assets: { some: {} } },
    { tenancies: { some: { maintenanceCases: { some: {} } } } },
    { tenancies: { some: { inspections: { some: { OR: [
      { status: { in: ['AWAITING_SIGNATURE', 'COMPLETED'] } },
      { signatures: { some: {} } },
      { shareToken: { not: null } },
      { sharedAt: { not: null } },
      { baselineId: { not: null } },
      { checkOut: { isNot: null } },
      { addenda: { some: {} } },
      { assessments: { some: {} } },
      { issuedReportFiles: { some: {} } },
      { reportEmails: { some: {} } },
    ] } } } } },
  ],
}

// Managing one term is never authority to remove another person's history at the
// same address. The nonempty check also prevents vacuous ownership of orphan rows.
export function manageableProperty(stakeholderId: string): Prisma.PropertyWhereInput {
  return { tenancies: { some: {}, every: { OR: [
    { agencyId: null, agentId: stakeholderId },
    { agency: { members: { some: { stakeholderId, status: 'ACTIVE', role: { in: ['OWNER', 'MANAGER'] } } } } },
  ] } } }
}

function visibleProperty(stakeholderId: string): Prisma.PropertyWhereInput {
  return { OR: [
    { trashedAt: null, tenancies: { some: tenancyAccessScope(stakeholderId) } },
    manageableProperty(stakeholderId),
  ] }
}

export function propertyState(property: { archivedAt: Date | null; trashedAt: Date | null }) {
  return property.trashedAt ? 'TRASHED' as const : property.archivedAt ? 'ARCHIVED' as const : 'ACTIVE' as const
}

export async function managedProperties(stakeholderId: string, state: PropertyListState = 'active') {
  const properties = await db.property.findMany({
    where: { AND: [visibleProperty(stakeholderId), state === 'trash'
      ? { trashedAt: { not: null } }
      : { trashedAt: null, archivedAt: state === 'archived' ? { not: null } : null }] },
    orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
    include: { tenancies: {
      where: { OR: [tenancyAccessScope(stakeholderId), managedTenancies(stakeholderId)] },
      select: { id: true, _count: { select: { inspections: { where: {
        OR: [inspectionScope(stakeholderId), { tenancy: managedTenancies(stakeholderId) }],
      } } } } },
    } },
  })
  const manageable = new Set((await db.property.findMany({
    where: { AND: [{ id: { in: properties.map(({ id }) => id) } }, manageableProperty(stakeholderId)] },
    select: { id: true },
  })).map(({ id }) => id))
  return { properties: properties.map((property) => ({
    id: property.id,
    label: propertyLabel(property),
    state: propertyState(property),
    archivedAt: property.archivedAt?.toISOString() ?? null,
    trashedAt: property.trashedAt?.toISOString() ?? null,
    trashExpiresAt: property.trashExpiresAt?.toISOString() ?? null,
    canManage: manageable.has(property.id),
    tenancyCount: property.tenancies.length,
    inspectionCount: property.tenancies.reduce((sum, tenancy) => sum + tenancy._count.inspections, 0),
  })) }
}

export async function propertyManagement(
  propertyId: string,
  stakeholderId: string,
  client: Prisma.TransactionClient = db,
) {
  const property = await client.property.findFirst({
    where: { AND: [{ id: propertyId }, visibleProperty(stakeholderId)] },
    include: { tenancies: {
      where: { OR: [tenancyAccessScope(stakeholderId), managedTenancies(stakeholderId)] },
      orderBy: { startDate: 'desc' },
      select: {
        id: true, agentId: true, agent: { select: { name: true } },
        agency: { select: { name: true, members: {
          where: { status: 'ACTIVE', role: { in: ['OWNER', 'MANAGER'] } },
          select: { stakeholderId: true, stakeholder: { select: { name: true } } },
        } } },
        inspections: {
          where: { OR: [inspectionScope(stakeholderId), { tenancy: managedTenancies(stakeholderId) }] },
          select: { id: true, kind: true, status: true, rooms: { select: { _count: { select: { captures: { where: { kind: 'PHOTO' } } } } } } },
        },
      },
    } },
  })
  if (!property) throw new Error('Property not found')
  const canManage = !!await client.property.findFirst({
    where: { AND: [{ id: propertyId }, manageableProperty(stakeholderId)] }, select: { id: true },
  })
  const hasHistory = canManage && !!await client.property.findFirst({
    where: { AND: [{ id: propertyId }, protectedPropertyHistory] }, select: { id: true },
  })
  const deleteBlockedReason = !canManage
    ? 'Only the personal lead or an agency manager responsible for every tenancy can manage this property.'
    : hasHistory
      ? 'This property has sent or signed reports, shared history, or repair records. Archive it to preserve those records.'
      : null
  // Who to ask when this viewer cannot manage it: each visible tenancy's personal lead,
  // or its team's owners and managers. Never names from tenancies the viewer cannot see.
  const askNames = canManage ? [] : [...new Set(property.tenancies.flatMap((tenancy) => tenancy.agency
    ? tenancy.agency.members.filter((member) => member.stakeholderId !== stakeholderId).map((member) => member.stakeholder.name)
    : tenancy.agentId && tenancy.agentId !== stakeholderId && tenancy.agent ? [tenancy.agent.name] : []))]
  return {
    id: property.id,
    label: propertyLabel(property),
    state: propertyState(property),
    canManage,
    askNames,
    canDelete: canManage && !hasHistory,
    deleteBlockedReason,
    archivedAt: property.archivedAt?.toISOString() ?? null,
    trashedAt: property.trashedAt?.toISOString() ?? null,
    trashExpiresAt: property.trashExpiresAt?.toISOString() ?? null,
    confirmationLabel: propertyLabel(property),
    counts: {
      tenancies: property.tenancies.length,
      inspections: property.tenancies.reduce((sum, tenancy) => sum + tenancy.inspections.length, 0),
      photos: property.tenancies.reduce((sum, tenancy) => sum + tenancy.inspections.reduce((total, inspection) =>
        total + inspection.rooms.reduce((count, room) => count + room._count.captures, 0), 0), 0),
    },
    tenancies: property.tenancies.map((tenancy) => ({
      id: tenancy.id, leadAgentName: tenancy.agent?.name ?? null, agencyName: tenancy.agency?.name ?? null,
      inspections: tenancy.inspections.map(({ id, kind, status }) => ({ id, kind, status })),
    })),
  }
}

// All lifecycle changes take the same locks, in order. Tenancy creation (renewal)
// and inspection completion already use these parent locks too.
export async function lockPropertyRecords(tx: Prisma.TransactionClient, propertyId: string) {
  await tx.$queryRaw`SELECT "id" FROM "Property" WHERE "id" = ${propertyId} FOR UPDATE`
  await tx.$queryRaw`SELECT "id" FROM "Tenancy" WHERE "propertyId" = ${propertyId} ORDER BY "id" FOR UPDATE`
  await tx.$queryRaw`
    SELECT i."id" FROM "Inspection" i JOIN "Tenancy" t ON i."tenancyId" = t."id"
    WHERE t."propertyId" = ${propertyId} ORDER BY i."id" FOR UPDATE OF i
  `
}
