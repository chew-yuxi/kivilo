import { authed } from '@/lib/api/route'
import { removeTenancyCollaborator } from '@/lib/tenancy-access-actions'

export const dynamic = 'force-dynamic'

export const DELETE = authed(async (_agent, { id, stakeholderId }: { id: string; stakeholderId: string }) =>
  removeTenancyCollaborator(id, stakeholderId))
