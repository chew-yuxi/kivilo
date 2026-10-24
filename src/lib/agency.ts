import { db } from '@/lib/db'
import { actsAsAgent } from '@/lib/auth'
import { propertyLabel } from '@/lib/format'
import { createDownloadUrl } from '@/lib/storage'
import type { Prisma } from '@/generated/prisma'

export async function agencyList(viewerId: string) {
  const memberships = await db.agencyMembership.findMany({
    where: { stakeholderId: viewerId, OR: [{ status: 'ACTIVE' }, { status: 'INVITED', expiresAt: { gt: new Date() } }] },
    include: { agency: { include: { _count: { select: { members: { where: { status: 'ACTIVE' } } } } } } },
    orderBy: { createdAt: 'asc' },
  })
  return {
    agencies: memberships.filter((member) => member.status === 'ACTIVE').map((member) => ({
      id: member.agencyId, name: member.agency.name, role: member.role, memberCount: member.agency._count.members,
    })),
    invitations: memberships.filter((member) => member.status === 'INVITED').map((member) => ({
      id: member.id, agencyId: member.agencyId, agencyName: member.agency.name,
      role: member.role, expiresAt: member.expiresAt!.toISOString(),
    })),
  }
}

export async function requireAgencyMembership(agencyId: string, stakeholderId: string, client: Prisma.TransactionClient = db) {
  const member = await client.agencyMembership.findFirst({ where: { agencyId, stakeholderId, status: 'ACTIVE' } })
  if (!member) throw new Error('Team not found')
  return member
}

/// All membership/assignment mutations lock the agency before any tenancy. This
/// serializes last-owner changes, acceptance, invitation revocation and offboarding.
export async function lockAgency(agencyId: string, client: Prisma.TransactionClient) {
  await client.$queryRaw`SELECT "id" FROM "Agency" WHERE "id" = ${agencyId} FOR NO KEY UPDATE`
}

export async function lockAgencyTenancy(
  tenancyId: string,
  client: Prisma.TransactionClient,
  options: { updateProperty?: boolean } = {},
) {
  const before = await client.tenancy.findUnique({ where: { id: tenancyId }, select: { agencyId: true, propertyId: true } })
  if (!before) throw new Error('Tenancy not found')
  // Ordinary work on different tenancies can proceed together. Membership changes
  // take NO KEY UPDATE, which waits for these in-flight authorized operations.
  if (before.agencyId) await client.$queryRaw`SELECT "id" FROM "Agency" WHERE "id" = ${before.agencyId} FOR SHARE`
  // Renewal inserts a new tenancy referencing this property. Take its FK lock
  // before the tenancy, matching lifecycle deletion's property→tenancy order.
  if (options.updateProperty) {
    await client.$queryRaw`SELECT "id" FROM "Property" WHERE "id" = ${before.propertyId} FOR UPDATE`
  } else {
    await client.$queryRaw`SELECT "id" FROM "Property" WHERE "id" = ${before.propertyId} FOR KEY SHARE`
  }
  await client.$queryRaw`SELECT "id" FROM "Tenancy" WHERE "id" = ${tenancyId} FOR UPDATE`
  const current = await client.tenancy.findUnique({ where: { id: tenancyId }, select: { agencyId: true } })
  if (!current || current.agencyId !== before.agencyId) throw new Error('Tenancy not found')
}

/// Old clients/servers may have sent a report during a rolling deployment. Freeze
/// its previous lead, including a deliberate null, before transferring the tenancy.
export async function freezeReportsBeforeHandover(
  tx: Prisma.TransactionClient,
  tenancyId: string,
  agentId: string | null,
  agencyId: string | null,
) {
  await tx.$queryRaw`SELECT "id" FROM "Inspection"
    WHERE "tenancyId" = ${tenancyId} AND "status" IN ('AWAITING_SIGNATURE', 'COMPLETED')
    ORDER BY "id" FOR UPDATE`
  await tx.inspection.updateMany({
    where: { tenancyId, status: { in: ['AWAITING_SIGNATURE', 'COMPLETED'] }, reportAgentFrozen: false },
    data: { reportAgentId: agentId, reportAgencyId: agencyId, reportAgentFrozen: true },
  })
}

export async function agencyDetail(agencyId: string, viewerId: string) {
  const membership = await requireAgencyMembership(agencyId, viewerId)
  const canManage = membership.role !== 'AGENT'
  const agency = await db.agency.findUniqueOrThrow({
    where: { id: agencyId },
    include: {
      members: {
        where: canManage ? {} : { status: 'ACTIVE' },
        include: { stakeholder: { select: { name: true, email: true, _count: { select: { tenanciesAsAgent: { where: { agencyId } } } } } } },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      },
      tenancies: {
        where: { AND: [actsAsAgent(viewerId), { property: { archivedAt: null } }] },
        include: { property: true, agent: { select: { name: true } }, inspections: { select: { id: true, kind: true, status: true } } },
        orderBy: { createdAt: 'desc' },
      },
      activity: { where: canManage ? {} : { actorId: viewerId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 50 },
      branding: true,
    },
  })
  return {
    id: agency.id, name: agency.name, role: membership.role, canManage,
    branding: {
      agencyName: agency.name,
      agencyLicence: agency.branding?.agencyLicence ?? null,
      ceaRegistration: null,
      phone: agency.branding?.phone ?? null,
      logoUrl: agency.branding?.logoPath ? await createDownloadUrl(agency.branding.logoPath) : null,
    },
    members: agency.members.map((member) => ({
      id: member.id, stakeholderId: member.stakeholderId, name: member.stakeholder.name,
      email: member.stakeholder.email, role: member.role, status: member.status,
      expiresAt: member.expiresAt?.toISOString() ?? null,
      assignedTenancies: member.stakeholder._count.tenanciesAsAgent,
      ownedTenancies: member.stakeholder._count.tenanciesAsAgent,
    })),
    tenancies: agency.tenancies.map((tenancy) => ({
      id: tenancy.id, propertyId: tenancy.propertyId, property: propertyLabel(tenancy.property),
      leadAgentId: tenancy.agentId, leadAgentName: tenancy.agent?.name ?? null,
      inspections: tenancy.inspections,
    })),
    activity: agency.activity.map((event) => ({
      id: event.id, action: event.action, actorName: event.actorName,
      subjectName: event.subjectName, createdAt: event.createdAt.toISOString(),
    })),
  }
}

export type AgencyDetail = Awaited<ReturnType<typeof agencyDetail>>
