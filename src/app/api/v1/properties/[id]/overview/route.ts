import { authed } from '@/lib/api/route'
import { partyChecks } from '@/lib/cdd/cases'
import { propertyOverview } from '@/lib/property-work'

export const dynamic = 'force-dynamic'

export const GET = authed(async (agent, { id }: { id: string }) => {
  const overview = await propertyOverview(id, agent.id)
  // CEA due diligence per party, on tenancies this agent works.
  if (!('terms' in overview)) return overview
  const working = overview.terms.filter((term) => term.monthlyRent !== null).map((term) => term.tenancyId)
  const checks = await partyChecks(working, agent.id)
  return {
    ...overview,
    terms: overview.terms.map((term) => ({ ...term, verification: checks.get(term.tenancyId) ?? null })),
  }
})
