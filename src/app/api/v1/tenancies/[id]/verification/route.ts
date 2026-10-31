import { z } from 'zod'
import { authed } from '@/lib/api/route'
import { partyChecks, verifyTenancyParties } from '@/lib/cdd/cases'

export const dynamic = 'force-dynamic'

/// The landlord's and tenant's due-diligence checks on this tenancy. `enabled` stays for
/// the app, which showed nothing when it was false during the operators' preview.
export const GET = authed(async (agent, { id }: { id: string }) => {
  const checks = (await partyChecks([id], agent.id)).get(id)!
  return { enabled: true, ...checks }
})

/// Starts the checks this tenancy is missing and emails each party with an address.
export const POST = authed(async (agent, { id }: { id: string }, request) => {
  const { roles } = z.object({ roles: z.array(z.enum(['LANDLORD', 'TENANT'])).min(1).optional() }).strict().parse(await request.json())
  return { started: await verifyTenancyParties(agent.id, id, roles) }
})
