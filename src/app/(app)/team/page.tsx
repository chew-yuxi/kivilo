import { requireAgent } from '@/lib/auth'
import { agencyList } from '@/lib/agency'
import { TeamDirectory } from '@/components/team-management'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Team' }

export default async function TeamPage() {
  const agent = await requireAgent()
  return <TeamDirectory data={await agencyList(agent.id)} />
}
