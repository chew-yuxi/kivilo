import { authed } from '@/lib/api/route'
import { removeBrandingLogo, saveBrandingLogo } from '@/lib/branding'

/// The raw image is the request body; the server decides what it is from its bytes.
export const POST = authed(async (stakeholder, _params, request) =>
  ({ branding: await saveBrandingLogo(stakeholder.id, new Uint8Array(await request.arrayBuffer())) }))

export const DELETE = authed(async (stakeholder) =>
  ({ branding: await removeBrandingLogo(stakeholder.id) }))
