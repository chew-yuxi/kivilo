import { authed } from '@/lib/api/route'
import { getAgencyBranding, saveAgencyBranding } from '@/lib/branding'

export const dynamic = 'force-dynamic'

export const GET = authed(async (agent, { id }: { id: string }) =>
  ({ branding: await getAgencyBranding(id, agent.id) }))

export const PUT = authed(async (agent, { id }: { id: string }, request) =>
  ({ branding: await saveAgencyBranding(id, agent.id, await request.json()) }))
