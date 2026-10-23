import Link from 'next/link'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { requireAgent } from '@/lib/auth'
import { inspectionWorkScope } from '@/lib/inspection-work'
import { propertyLabel } from '@/lib/format'
import { StatusBadge } from '@/components/status-badge'
import { RenewalCards } from '@/components/renewal-cards'
import { dueRenewals } from '@/lib/renewals'
import { agencyList } from '@/lib/agency'
import { preferredWorkspace, workspaceCookieName } from '@/lib/web-workspace'
import { WorkspaceSelector } from '@/components/workspace-selector'
import { messages } from '@/lib/i18n'
import { requestLocale } from '@/lib/i18n/request'

export const dynamic = 'force-dynamic'

export default async function InspectionsPage({ searchParams }: PageProps<'/inspections'>) {
  const agent = await requireAgent()
  const w = messages(await requestLocale(agent)).pwa
  const [directory, query, cookieStore] = await Promise.all([agencyList(agent.id), searchParams, cookies()])
  const requested = typeof query.workspace === 'string' ? query.workspace : undefined
  if (requested && requested !== 'personal' && requested !== 'all' && !directory.agencies.some((team) => team.id === requested)) notFound()
  const workspace = preferredWorkspace(requested ?? cookieStore.get(workspaceCookieName(agent.id))?.value, directory.agencies)
  const selectedTeam = directory.agencies.find((team) => team.id === workspace)
  const filters = workspace === 'personal' ? { personal: true } : workspace === 'all' ? { mine: true } : { agencyId: workspace }
  const renewals = await dueRenewals(agent.id, new Date(), filters)
  const newWorkspace = workspace === 'all' ? preferredWorkspace(undefined, directory.agencies, false) : workspace
  const newHref = `/inspections/new?workspace=${encodeURIComponent(newWorkspace)}`

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
      <section className="mb-6 rounded-lg border border-gray-200 bg-white p-4" aria-label={w.chooseWorkspace}>
        <div className="flex flex-wrap items-end gap-3">
          <WorkspaceSelector agentId={agent.id} teams={directory.agencies} workspace={workspace} rememberInitial={requested !== undefined} />
          {selectedTeam && <Link href={`/team/${selectedTeam.id}`} className="action-secondary">{w.manageTeam}</Link>}
          <Link href="/team" className="action-secondary">{w.createOrJoinTeam}</Link>
        </div>
        <p className="mt-3 text-sm text-gray-600">
          {selectedTeam
            ? selectedTeam.role === 'AGENT'
              ? w.workspaceAgentNote
              : w.workspaceManagerNote
            : workspace === 'personal'
              ? w.workspacePersonalNote
              : w.workspaceAllNote}
        </p>
        {directory.agencies.length === 0 && (
          <p className="mt-2 text-sm text-gray-600">{w.noTeamsHint}</p>
        )}
        {directory.invitations.length > 0 && (
          <Link href="/team" className="text-link mt-3 inline-flex min-h-11 items-center text-sm">
            {w.viewInvitations(directory.invitations.length)}
          </Link>
        )}
      </section>
      <div className="mb-8 flex items-start justify-between gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{w.inspections}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {w.inspectionsIntro}
          </p>
        </div>
        <Link
          href={newHref}
          className="shrink-0 rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          {w.newCheckIn}
        </Link>
      </div>

      <RenewalCards renewals={renewals} />

      {inspections.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center">
          <p className="text-sm font-medium">{w.nothingYet}</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500">
            {w.nothingYetBody}
          </p>
          <Link
            href={newHref}
            className="mt-6 inline-block rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            New check-in
          </Link>
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
