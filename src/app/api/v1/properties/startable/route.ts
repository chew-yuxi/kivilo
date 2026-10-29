import { authed } from '@/lib/api/route'
import { startableProperties } from '@/lib/property-work'

export const dynamic = 'force-dynamic'

/// The New check-in screen's existing-property picker.
export const GET = authed(async (agent) => startableProperties(agent.id))
