import { requireAgent } from '@/lib/auth'
import { chosenWorkspace } from '@/components/workspace-section'
import { MoveOutWalkthrough } from '@/components/move-out-walkthrough'
import { moveOutTargets } from '@/lib/move-out-tenancies'

export const metadata = { title: 'Start check-out' }
export default async function MoveOutPage({ searchParams }: PageProps<'/inspections/move-out'>) {
  const agent = await requireAgent()
  const chosen = await chosenWorkspace(agent.id, (await searchParams).workspace)
  const team = chosen.workspace === 'all' ? chosen.directory.agencies[0]?.id : chosen.workspace
  const agencyId = team && team !== 'personal' ? team : null
  return (
    <MoveOutWalkthrough
      agentId={agent.id}
      agencyId={agencyId}
      country={agent.country ?? 'SG'}
      workspace={chosen.directory.agencies.find((a) => a.id === agencyId)?.name ?? 'Personal'}
      targets={await moveOutTargets(agencyId)}
    />
  )
}
