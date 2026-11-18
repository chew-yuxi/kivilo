import { clientChecksEnabled } from '@/lib/cdd/availability'
import { z } from 'zod'
import { authed } from '@/lib/api/route'
import { partyChecks, verifyTenancyParties } from '@/lib/cdd/cases'
import { actsAsAgent } from '@/lib/auth'
import { dueDiligenceApplies } from '@/lib/country'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

/// The landlord's and tenant's due-diligence checks on this tenancy. `enabled` is false on
/// a Malaysian property, where CEA due diligence does not apply; every app build shows
/// nothing then, as it did during the operators' preview. A tenancy this agent does not
/// work reads as before, so the answer cannot tell anyone where it is.
export const GET = authed(async (agent, { id }: { id: string }) => {
  if (!clientChecksEnabled()) return { enabled: false }
  const tenancy = await db.tenancy.findFirst({ where: { id, ...actsAsAgent(agent.id) }, select: { property: { select: { country: true } } } })
  const checks = (await partyChecks([id], agent.id)).get(id)!
  return { enabled: tenancy ? dueDiligenceApplies(tenancy.property.country) : true, ...checks }
})

/// Starts the checks this tenancy is missing and emails each party with an address.
export const POST = authed(async (agent, { id }: { id: string }, request) => {
  const { roles } = z.object({ roles: z.array(z.enum(['LANDLORD', 'TENANT'])).min(1).optional() }).strict().parse(await request.json())
  return { started: await verifyTenancyParties(agent.id, id, roles) }
})
