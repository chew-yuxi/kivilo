'use client'

import { useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { rememberWorkspace, type WorkspaceTeam } from '@/lib/web-workspace'

export function WorkspaceSelector({
  agentId,
  teams,
  workspace,
  rememberInitial,
}: {
  agentId: string
  teams: WorkspaceTeam[]
  workspace: string
  rememberInitial: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  useEffect(() => {
    if (rememberInitial) rememberWorkspace(agentId, workspace)
  }, [agentId, workspace, rememberInitial])

  return (
    <label className="block min-w-0 basis-full text-sm font-medium sm:flex-1">
      Workspace
      <select
        className="field mt-1"
        value={workspace}
        disabled={pending}
        onChange={(event) => {
          const next = event.target.value
          rememberWorkspace(agentId, next)
          startTransition(() => router.push(`/inspections?workspace=${encodeURIComponent(next)}`))
        }}
      >
        <option value="all">All properties</option>
        <option value="personal">Personal</option>
        {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
      </select>
    </label>
  )
}
