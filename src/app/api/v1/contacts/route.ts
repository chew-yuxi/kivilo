import { authed } from '@/lib/api/route'
import { contactSuggestions } from '@/lib/contacts'

export const dynamic = 'force-dynamic'

/// New check-in's "Choose from your contacts".
export const GET = authed(async (agent) => contactSuggestions(agent.id))
