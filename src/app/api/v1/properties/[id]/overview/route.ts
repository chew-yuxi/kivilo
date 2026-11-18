import { clientChecksEnabled } from '@/lib/cdd/availability'
import { authed } from '@/lib/api/route'
import { partyChecks } from '@/lib/cdd/cases'
import { propertyOverview } from '@/lib/property-work'
import { dueDiligenceApplies } from '@/lib/country'

export const dynamic = 'force-dynamic'

export const GET = authed(async (agent, { id }: { id: string }) => {
  const overview = await propertyOverview(id, agent.id)
  // CEA due diligence per party, on tenancies this agent works. None on a Malaysian
  // property, which every app build shows as no party rows.
  if (!('terms' in overview)) return overview
  const working = dueDiligenceApplies(overview.country)
    ? overview.terms.filter((term) => term.monthlyRent !== null).map((term) => term.tenancyId)
    : []
  const checks = clientChecksEnabled() ? await partyChecks(working, agent.id) : null
  return {
    ...overview,
    terms: overview.terms.map((term) => {
      const parties = checks?.get(term.tenancyId)
      return { ...term, verification: parties ? { enabled: true, ...parties } : null }
    }),
  }
})
