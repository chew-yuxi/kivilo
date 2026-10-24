import { authed } from '@/lib/api/route'
import { removeAgencyBrandingLogo, saveAgencyBrandingLogo } from '@/lib/branding'

export const POST = authed(async (agent, { id }: { id: string }, request) =>
  ({ branding: await saveAgencyBrandingLogo(id, agent.id, new Uint8Array(await request.arrayBuffer())) }))

export const DELETE = authed(async (agent, { id }: { id: string }) =>
  ({ branding: await removeAgencyBrandingLogo(id, agent.id) }))
