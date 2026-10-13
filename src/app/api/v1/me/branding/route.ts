import { authed } from '@/lib/api/route'
import { getBranding, saveBranding } from '@/lib/branding'

export const dynamic = 'force-dynamic'

export const GET = authed(async (stakeholder) => ({ branding: await getBranding(stakeholder.id) }))

export const PUT = authed(async (stakeholder, _params, request) =>
  ({ branding: await saveBranding(stakeholder.id, await request.json()) }))
