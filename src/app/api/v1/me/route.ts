import { db } from '@/lib/db'
import { tenancyScope } from '@/lib/auth'
import { authed } from '@/lib/api/route'

export const dynamic = 'force-dynamic'

/// The native client calls this once after sign-in to confirm the token resolves to a
/// Stakeholder, which is also what creates one on a first-ever sign-in.
export const GET = authed(async (stakeholder) => {
  const tenancies = await db.tenancy.findMany({
    where: tenancyScope(stakeholder.id),
    select: { id: true, landlordId: true, tenantId: true, agentId: true },
  })
  const roles = [...new Set(tenancies.map((tenancy) =>
    tenancy.landlordId === stakeholder.id
      ? 'LANDLORD'
      : tenancy.tenantId === stakeholder.id
        ? 'TENANT'
        : 'AGENT',
  ))]
  return {
    id: stakeholder.id,
    name: stakeholder.name,
    email: stakeholder.email,
    roles,
    capabilities: {
      reportMaintenance: roles.includes('TENANT') || roles.includes('LANDLORD') || roles.includes('AGENT'),
      manageMaintenance: roles.includes('LANDLORD') || roles.includes('AGENT'),
      verifyRepairs: roles.includes('TENANT'),
    },
  }
})
