import { messages } from '@/lib/i18n'
import { requestLocale } from '@/lib/i18n/request'
import Link from 'next/link'
import { db } from '@/lib/db'
import { requireAgent } from '@/lib/auth'
import { inspectionWorkScope } from '@/lib/inspection-work'
import { propertyLabel } from '@/lib/format'
import { StatusBadge } from '@/components/status-badge'
import { RenewalCards } from '@/components/renewal-cards'
import { dueRenewals } from '@/lib/renewals'
import { chosenWorkspace, WorkspaceSection } from '@/components/workspace-section'

export const dynamic = 'force-dynamic'

export default async function InspectionsPage({ searchParams }: PageProps<'/inspections'>) {
  const agent = await requireAgent()
  const w = messages(await requestLocale(agent)).pwa
  const chosen = await chosenWorkspace(agent.id, (await searchParams).workspace)
  const { directory, filters, newHref } = chosen
  const renewals = await dueRenewals(agent.id, new Date(), filters)

  const inspections = await db.inspection.findMany({
    where: inspectionWorkScope(agent.id, filters),
    orderBy: { createdAt: 'desc' },
    include: {
      tenancy: {
        include: {
          property: true,
          agency: { select: { id: true, name: true } },
          tenant: true,
          agent: { select: { id: true, name: true } },
          collaborators: {
            orderBy: { createdAt: 'asc' },
            select: { stakeholderId: true, stakeholder: { select: { name: true } } },
          },
        },
      },
      accessGrants: { select: { stakeholderId: true, stakeholder: { select: { name: true } } } },
      _count: { select: { rooms: true } },
    },
  })

  return (
    <div>

      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{w.inspections}</h1>
          <p className="mt-1 text-sm text-gray-500">{w.photographEachRoomAndWriteTheInventory}</p>
        </div>
        <div className="flex flex-wrap w-full gap-2 sm:w-auto">
          <Link href={newHref} className="action-secondary flex-1 sm:flex-none">{w.newCheckIn}</Link>
          <Link href={chosen.moveOutHref} className="action-secondary flex-1 sm:flex-none">{w.startCheckOut}</Link>
        </div>
      </div>


      <WorkspaceSection w={w} agentId={agent.id} chosen={chosen} path="/inspections" />

      <RenewalCards renewals={renewals} />

      {inspections.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center">
          <p className="text-sm font-medium">{w.nothingYet}</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500">{w.startACheckInWhenYouNext}</p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-200 overflow-hidden rounded-lg border border-gray-200 bg-white">
          {inspections.map((inspection) => {
            const { tenancy } = inspection
            const fullAccess = new Set([tenancy.agentId, ...tenancy.collaborators.map((person) => person.stakeholderId)])
            const teamRole = directory.agencies.find((team) => team.id === tenancy.agencyId)?.role
            const overseesTeam = teamRole === 'OWNER' || teamRole === 'MANAGER'
            const inspectionOnly = inspection.accessGrants.filter((person) => !fullAccess.has(person.stakeholderId))
            const sharedWith = [
              ...(tenancy.agent && tenancy.agent.id !== agent.id ? [tenancy.agent.name] : []),
              ...tenancy.collaborators.filter((person) => person.stakeholderId !== agent.id)
                .map((person) => person.stakeholder.name),
            ]
            const accessLabel = !fullAccess.has(agent.id) && !overseesTeam
              ? w.previousReportsAccess
              : tenancy.agency
                ? w.teamResponsible(tenancy.agency.name, tenancy.agent?.name ?? w.unassigned)
                : tenancy.collaborators.length
                  ? sharedWith.length ? w.sharedWith(sharedWith.join(w.listSeparator)) : w.sharedTenancy
                  : inspectionOnly.length
                    ? w.previousShared(inspectionOnly.map((person) => person.stakeholder.name).join(w.listSeparator))
                    : w.private
            return (
              <li key={inspection.id}>
                <Link
                  href={`/inspections/${inspection.id}`}
                  className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-gray-50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {propertyLabel(inspection.tenancy.property)}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {inspection.kind === 'CHECK_IN' ? w.checkIn : w.checkOut} ·{' '}
                      {inspection.tenancy.tenant.name}
                      {inspection._count.rooms > 0 &&
                        ` · ${w.roomCount(inspection._count.rooms)}`}
                    </p>
                    <span className="mt-2 inline-block rounded-md bg-gray-100 px-2 py-1 text-xs break-words text-gray-600">
                      {accessLabel}
                    </span>
                  </div>
                  <StatusBadge status={inspection.status} />
                  <span aria-hidden="true" className="text-xl text-gray-500">›</span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
