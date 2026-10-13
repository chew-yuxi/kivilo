import { createHmac, timingSafeEqual } from 'node:crypto'

/// Lets the PDF renderer open one report that may never have been shared by link,
/// without minting a share link nobody asked for. It names one inspection, expires in
/// two minutes, and is useless without the server secret. A share token is base64url
/// and never contains a dot, so the prefix cannot collide with one.
const PREFIX = 'render.'
const LIFETIME_MS = 2 * 60 * 1000

function key() {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) throw new Error('SUPABASE_SERVICE_ROLE_KEY must be set')
  // Derived, so the service-role key itself never signs anything that leaves the server.
  return createHmac('sha256', secret).update('kivilo report render token v1').digest()
}

function sign(body: string) {
  return createHmac('sha256', key()).update(body).digest('base64url')
}

export function mintRenderToken(inspectionId: string, now = Date.now()) {
  const body = `${inspectionId}.${now + LIFETIME_MS}`
  return `${PREFIX}${body}.${sign(body)}`
}

/// The inspection id a valid, unexpired render token names, or null for anything else.
export function readRenderToken(token: string, now = Date.now()): string | null {
  if (!token.startsWith(PREFIX)) return null
  const parts = token.slice(PREFIX.length).split('.')
  if (parts.length !== 3) return null
  const [inspectionId, expires, signature] = parts
  const expected = Buffer.from(sign(`${inspectionId}.${expires}`))
  const given = Buffer.from(signature)
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null
  if (!(Number(expires) > now)) return null
  return inspectionId
}
