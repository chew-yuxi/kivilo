import type { InspectionStatus, Prisma } from '@/generated/prisma'
import { inspectionScope } from '@/lib/auth'

export type InspectionWorkFilters = {
  agencyId?: string
  personal?: boolean
  assigneeId?: string
  mine?: boolean
  state?: 'active' | 'archived'
  status?: InspectionStatus
}

// Filters only narrow the shared authorization boundary. Agency membership lets a
// person select a workspace; it never exposes other agents' assigned work by itself.
export function inspectionWorkScope(actorId: string, filters: InspectionWorkFilters = {}): Prisma.InspectionWhereInput {
  const and: Prisma.InspectionWhereInput[] = [inspectionScope(actorId), {
    tenancy: { property: { trashedAt: null, archivedAt: filters.state === 'archived' ? { not: null } : null } },
  }]
  if (filters.agencyId) and.push({ tenancy: {
    agencyId: filters.agencyId, agency: { members: { some: { stakeholderId: actorId, status: 'ACTIVE' } } },
  } })
  if (filters.personal) and.push({ tenancy: { agencyId: null } })
  if (filters.mine ?? !filters.agencyId) and.push({ OR: [
    { tenancy: { agentId: actorId } },
    { tenancy: { collaborators: { some: { stakeholderId: actorId } } } },
    { accessGrants: { some: { stakeholderId: actorId } } },
  ] })
  if (filters.assigneeId) and.push({ tenancy: { agentId: filters.assigneeId } })
  if (filters.status) and.push({ status: filters.status })
  return { AND: and }
}
