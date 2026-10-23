import Link from 'next/link'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { agencyList } from '@/lib/agency'
import { preferredWorkspace, workspaceCookieName } from '@/lib/web-workspace'
import { WorkspaceSelector } from '@/components/workspace-selector'

/// The workspace a list page shows: the one asked for, else the remembered one, checked
/// against current membership. Only narrows; the data layer still authorizes every row.
export async function chosenWorkspace(agentId: string, requested: string | string[] | undefined) {
  const [directory, cookieStore] = await Promise.all([agencyList(agentId), cookies()])
  const asked = typeof requested === 'string' ? requested : undefined
  if (asked && asked !== 'personal' && asked !== 'all' && !directory.agencies.some((team) => team.id === asked)) notFound()
  const workspace = preferredWorkspace(asked ?? cookieStore.get(workspaceCookieName(agentId))?.value, directory.agencies)
  const filters = workspace === 'personal' ? { personal: true } : workspace === 'all' ? { mine: true } : { agencyId: workspace }
  const newWorkspace = workspace === 'all' ? preferredWorkspace(undefined, directory.agencies, false) : workspace
  return {
    directory,
    workspace,
    asked,
    filters,
    newHref: `/inspections/new?workspace=${encodeURIComponent(newWorkspace)}`,
  }
}

export function WorkspaceSection({
  agentId,
  chosen: { directory, workspace, asked },
  path,
}: {
  agentId: string
  chosen: Awaited<ReturnType<typeof chosenWorkspace>>
  path: string
}) {
  const selectedTeam = directory.agencies.find((team) => team.id === workspace)
  return (
    <section className="mb-6 rounded-lg border border-gray-200 bg-white p-4" aria-label="Choose workspace">
      <div className="flex flex-wrap items-end gap-3">
        <WorkspaceSelector agentId={agentId} teams={directory.agencies} workspace={workspace} rememberInitial={asked !== undefined} path={path} />
        {selectedTeam && <Link href={`/team/${selectedTeam.id}`} className="action-secondary">Manage team</Link>}
        <Link href="/team" className="action-secondary">Create or join a team</Link>
      </div>
      <p className="mt-3 text-sm text-gray-600">
        {selectedTeam
          ? selectedTeam.role === 'AGENT'
            ? 'Your assigned team properties. New check-ins belong to this team and are assigned to you.'
            : 'All team properties. Owners and managers oversee the team; agents see their assignments.'
          : workspace === 'personal'
            ? 'Personal properties stay outside your teams. Share individual tenancies only when you choose.'
            : 'Your assigned properties, shared tenancies and access to previous reports across workspaces.'}
      </p>
      {directory.agencies.length === 0 && (
        <p className="mt-2 text-sm text-gray-600">Create a team, invite colleagues, then add properties to its portfolio.</p>
      )}
      {directory.invitations.length > 0 && (
        <Link href="/team" className="text-link mt-3 inline-flex min-h-11 items-center text-sm">
          View {directory.invitations.length} team {directory.invitations.length === 1 ? 'invitation' : 'invitations'}
        </Link>
      )}
    </section>
  )
}
