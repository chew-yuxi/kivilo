import { authed } from '@/lib/api/route'
import { propertyManagement } from '@/lib/property-management'
import { updatePropertyLifecycle } from '@/lib/property-actions'

export const dynamic = 'force-dynamic'
export const GET = authed(async (actor, { id }: { id: string }) => propertyManagement(id, actor.id))
export const PATCH = authed(async (_actor, { id }: { id: string }, request) => updatePropertyLifecycle(id, await request.json()))
