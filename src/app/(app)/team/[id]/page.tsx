import { notFound } from 'next/navigation'
import { requireAgent } from '@/lib/auth'
import { agencyDetail } from '@/lib/agency'
import { TeamWorkspace } from '@/components/team-management'

export const dynamic = 'force-dynamic'

export default async function TeamPage({ params }: PageProps<'/team/[id]'>) {
  const agent = await requireAgent()
  const { id } = await params
  let data
  try {
    data = await agencyDetail(id, agent.id)
  } catch (error) {
    if (error instanceof Error && /not found/i.test(error.message)) notFound()
    throw error
  }
  return <TeamWorkspace data={data} viewerId={agent.id} />
}
