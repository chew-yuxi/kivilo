import { requireAgent } from '@/lib/auth'
import { agencyList } from '@/lib/agency'
import { TeamDirectory } from '@/components/team-management'
import { messages } from '@/lib/i18n'
import { requestLocale } from '@/lib/i18n/request'

export const dynamic = 'force-dynamic'
export async function generateMetadata() {
  return { title: messages(await requestLocale(await requireAgent())).pwa.team }
}

export default async function TeamPage() {
  const agent = await requireAgent()
  return <TeamDirectory data={await agencyList(agent.id)} />
}
