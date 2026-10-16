import { z } from 'zod'
import { acknowledgeAddendumInPerson } from '@/lib/addendum-actions'
import { authed } from '@/lib/api/route'

export const dynamic = 'force-dynamic'

const body = z.object({ stakeholderId: z.string().min(1) }).strict()

/// The landlord or tenant acknowledges on the agent's phone, as `signatures` takes a
/// signature there. The token is the agent's; the data layer checks the party is the
/// tenancy's landlord or tenant, and anyone else is the same 404 as a missing update.
export const POST = authed(async (_agent, { id }: { id: string }, request) => {
  const { stakeholderId } = body.parse(await request.json())
  await acknowledgeAddendumInPerson(id, stakeholderId)
  return { ok: true }
})
