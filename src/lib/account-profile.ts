import { db } from '@/lib/db'
import { tenancyScope } from '@/lib/auth'
import { homeContexts } from '@/lib/home-tasks'
import type { Stakeholder } from '@/generated/prisma'

/// The account as the native client knows it: what `GET /api/v1/me` answers, and what
/// setting the country answers with, so the app keeps one saved copy either way.
export async function accountProfile(stakeholder: Stakeholder) {
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
    /// Where the account works, which its new properties are made in. Null until the app
    /// has asked; every account from before countries is Singapore.
    country: stakeholder.country,
    capabilities: {
      reportMaintenance: roles.includes('TENANT') || roles.includes('LANDLORD') || roles.includes('AGENT'),
      manageMaintenance: roles.includes('LANDLORD') || roles.includes('AGENT'),
      verifyRepairs: roles.includes('TENANT'),
    },
  }
}
