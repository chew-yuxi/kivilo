import { authed } from '@/lib/api/route'
import { messages } from '@/lib/i18n'
import { propertyTimeline } from '@/lib/property-timeline'

export const dynamic = 'force-dynamic'

/// In the language the person asking last reported, since the app shows these lines as
/// they arrive.
export const GET = authed(async (stakeholder, { id }: { id: string }) =>
  propertyTimeline(id, stakeholder.id, messages(stakeholder.locale)))
