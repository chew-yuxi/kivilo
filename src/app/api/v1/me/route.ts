import { db } from '@/lib/db'
import { tenancyScope } from '@/lib/auth'
import { authed } from '@/lib/api/route'
import { homeContexts } from '@/lib/home-tasks'

export const dynamic = 'force-dynamic'

/// The native client calls this once after sign-in to confirm the token resolves to a
/// Stakeholder, which is also what creates one on a first-ever sign-in.
export const GET = authed(async (stakeholder) => {
  const [tenancies, teamMember, contexts] = await Promise.all([
    db.tenancy.findMany({
      where: tenancyScope(stakeholder.id),
      select: { id: true, landlordId: true, tenantId: true, agentId: true },
    }),
    db.agencyMembership.findFirst({
      where: { stakeholderId: stakeholder.id, status: 'ACTIVE' },
      select: { id: true },
    }),
    homeContexts(stakeholder.id),
  ])
  const roles = [...new Set(tenancies.map((tenancy) =>
    tenancy.landlordId === stakeholder.id
      ? 'LANDLORD'
      : tenancy.tenantId === stakeholder.id
        ? 'TENANT'
        : 'AGENT',
  ))]
  // Team members need their workspace even before their first assignment. This is
  // navigation metadata; every property still goes through the shared scopes.
  if (teamMember && !roles.includes('AGENT')) roles.push('AGENT')
  return {
    id: stakeholder.id,
    name: stakeholder.name,
    email: stakeholder.email,
    roles,
    /// Every relationship the account holds, for the context picker. `roles` keeps its
    /// one-role-per-tenancy meaning for released builds.
    contexts,
    capabilities: {
      reportMaintenance: roles.includes('TENANT') || roles.includes('LANDLORD') || roles.includes('AGENT'),
      manageMaintenance: roles.includes('LANDLORD') || roles.includes('AGENT'),
      verifyRepairs: roles.includes('TENANT'),
    },
  }
})
