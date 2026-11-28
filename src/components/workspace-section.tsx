import type { Messages } from '@/lib/i18n'
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
    moveOutHref: `/inspections/move-out?workspace=${encodeURIComponent(newWorkspace)}`,
    newHref: `/inspections/new?workspace=${encodeURIComponent(newWorkspace)}`,
  }
}

export function WorkspaceSection({
  w,
  agentId,
  chosen: { directory, workspace, asked },
  path,
}: {
  agentId: string
  w: Messages['pwa']
  chosen: Awaited<ReturnType<typeof chosenWorkspace>>
  path: string
}) {
  const selectedTeam = directory.agencies.find((team) => team.id === workspace)
  return (
    <section className="mb-6 rounded-lg border border-gray-200 bg-white p-4" aria-label={w.chooseWorkspace}>
      <div className="flex flex-wrap items-end gap-3">
        <WorkspaceSelector agentId={agentId} teams={directory.agencies} workspace={workspace} rememberInitial={asked !== undefined} path={path} />
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
        <Link href="/team" className="text-link mt-3 inline-flex min-h-11 items-center text-sm">{w.viewInvitations(directory.invitations.length)}
        </Link>
      )}
    </section>
  )
}
