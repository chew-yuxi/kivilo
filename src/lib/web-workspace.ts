export type WorkspaceTeam = { id: string; name: string }

// A preference only: every page validates the selection against current membership,
// and the data layer applies authorization independently.
export const workspaceCookieName = (agentId: string) => `kivilo-workspace-${agentId}`

export function preferredWorkspace(
  saved: string | undefined,
  teams: WorkspaceTeam[],
  allowAll = true,
) {
  if (saved && (saved === 'personal' || (allowAll && saved === 'all') || teams.some((team) => team.id === saved))) {
    return saved
  }
  return teams[0]?.id ?? 'personal'
}

export function rememberWorkspace(agentId: string, workspace: string) {
  document.cookie = `${workspaceCookieName(agentId)}=${encodeURIComponent(workspace)}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`
}
