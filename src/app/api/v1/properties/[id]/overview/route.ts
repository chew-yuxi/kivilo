import { authed } from '@/lib/api/route'
import { propertyOverview } from '@/lib/property-work'

export const dynamic = 'force-dynamic'

export const GET = authed(async (agent, { id }: { id: string }) => propertyOverview(id, agent.id))
