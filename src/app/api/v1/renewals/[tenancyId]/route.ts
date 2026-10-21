import { z } from 'zod'
import { authed } from '@/lib/api/route'
import { createRenewal, respondToRenewal } from '@/lib/renewal-actions'
import { authorizeAgentTenancy, authorizeLeadTenancy } from '@/lib/auth'
import { tenancyAccess } from '@/lib/tenancy-access'
import { propertyLabel } from '@/lib/format'

export const GET = authed<{ tenancyId: string }>(async (agent, { tenancyId }) => {
  await authorizeLeadTenancy(tenancyId, agent.id)
  const tenancy = await authorizeAgentTenancy(tenancyId, agent.id)
  const access = await tenancyAccess(tenancyId, agent.id)
  return {
    id: tenancy.id,
    property: propertyLabel(tenancy.property),
    tenant: tenancy.tenant.name,
    endDate: tenancy.endDate.toISOString().slice(0, 10),
    monthlyRent: tenancy.monthlyRent.toString(),
    deposit: tenancy.deposit.toString(),
    collaborators: access.collaborators.map(({ stakeholderId, name, email }) => ({ stakeholderId, name, email })),
  }
})

export const PATCH = authed<{ tenancyId: string }>(async (_agent, { tenancyId }, request) => {
  const { choice } = z.object({ choice: z.enum(['NOT_RENEWING', 'DISMISSED', 'LATER']) }).parse(await request.json())
  await respondToRenewal(tenancyId, choice)
  return { ok: true }
})

export const POST = authed<{ tenancyId: string }>(async (_agent, { tenancyId }, request) => {
  return { id: await createRenewal(tenancyId, await request.json()) }
})
