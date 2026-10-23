import { authed } from '@/lib/api/route'
import { saveLocale } from '@/lib/language'

export const dynamic = 'force-dynamic'

/// The app reports the language it is showing: on sign-in, and whenever it changes.
export const PUT = authed(async (stakeholder, _params, request) =>
  saveLocale(stakeholder.id, await request.json()))
