import { db } from '@/lib/db'
import { tenancyAccessScope, managedTenancies } from '@/lib/auth'

/// Access can be reviewed for an ended tenancy too, alongside its historical reports.
/// The landlord and tenant's report access does not expose collaborators' addresses.
export async function tenancyAccess(tenancyId: string, viewerId: string) {
  const tenancy = await db.tenancy.findFirst({
    where: { AND: [{ id: tenancyId }, tenancyAccessScope(viewerId)] },
    select: {
      id: true,
      agentId: true,
      agency: { select: { id: true, name: true, members: { where: { status: 'ACTIVE' }, include: { stakeholder: { select: { name: true, email: true } } } } } },
      agent: { select: { id: true, name: true, email: true } },
      collaborators: {
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        select: {
          stakeholderId: true,
          createdAt: true,
          stakeholder: { select: { name: true, email: true } },
        },
      },
      inspections: {
        where: { accessGrants: { some: {} } },
        orderBy: { id: 'asc' },
        select: {
          id: true,
          accessGrants: {
            orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
            select: { stakeholderId: true, stakeholder: { select: { name: true, email: true } } },
          },
        },
      },
    },
  })
  if (!tenancy) throw new Error('Tenancy not found')

  const fullAccess = new Set([tenancy.agentId, ...tenancy.collaborators.map(({ stakeholderId }) => stakeholderId)])
  const agencyMembership = tenancy.agency?.members.find((member) => member.stakeholderId === viewerId)
  const canManageAccess = !!await db.tenancy.findFirst({ where: { id: tenancy.id, AND: [managedTenancies(viewerId)] }, select: { id: true } })
  const hasFullAccess = fullAccess.has(viewerId) || agencyMembership?.role === 'OWNER' || agencyMembership?.role === 'MANAGER'
  const inspectionOnly = new Map<string, { stakeholderId: string; name: string; email: string | null; inspectionIds: string[] }>()
  for (const inspection of tenancy.inspections) {
    for (const grant of inspection.accessGrants) {
      if (fullAccess.has(grant.stakeholderId)) continue
      if (!hasFullAccess && grant.stakeholderId !== viewerId) continue
      const existing = inspectionOnly.get(grant.stakeholderId)
      if (existing) existing.inspectionIds.push(inspection.id)
      else inspectionOnly.set(grant.stakeholderId, {
        stakeholderId: grant.stakeholderId,
        name: grant.stakeholder.name,
        email: grant.stakeholder.email,
        inspectionIds: [inspection.id],
      })
    }
  }

  return {
    tenancyId: tenancy.id,
    visibility: tenancy.agency || tenancy.collaborators.length || inspectionOnly.size ? 'SHARED' as const : 'PRIVATE' as const,
    scope: hasFullAccess ? 'TENANCY' as const : 'INSPECTION' as const,
    canManageAccess,
    canManageAssignment: canManageAccess,
    agency: tenancy.agency ? { id: tenancy.agency.id, name: tenancy.agency.name, role: agencyMembership?.role ?? null } : null,
    availableMembers: canManageAccess && tenancy.agency ? tenancy.agency.members.map((member) => ({
      stakeholderId: member.stakeholderId, name: member.stakeholder.name, email: member.stakeholder.email,
    })) : [],
    leadAgent: tenancy.agent,
    collaborators: hasFullAccess ? tenancy.collaborators.map((collaborator) => ({
      stakeholderId: collaborator.stakeholderId,
      name: collaborator.stakeholder.name,
      email: collaborator.stakeholder.email,
      addedAt: collaborator.createdAt.toISOString(),
    })) : [],
    inspectionOnly: [...inspectionOnly.values()],
  }
}

export type TenancyAccess = Awaited<ReturnType<typeof tenancyAccess>>
