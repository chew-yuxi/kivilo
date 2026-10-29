import { z } from 'zod'

/// Singapore address lookup for New check-in, through OneMap Search, the Singapore Land
/// Authority's address service. Server only: the OneMap login never reaches a client,
/// and a signed-in agent is the only caller. It suggests the street address and postal
/// code and nothing else; the unit, property type, furnishing and people are always
/// the agent's own entry, and manual entry works without it.

const ONEMAP = 'https://www.onemap.gov.sg'

/// A OneMap token lasts three days. It is fetched with the account login when there is
/// none or it is within an hour of expiry, once at a time per instance.
let token: { value: string; expiresAt: number } | null = null
let pending: Promise<string> | null = null

async function accessToken(now = Date.now()) {
  if (token && token.expiresAt - now > 60 * 60 * 1000) return token.value
  pending ??= (async () => {
    const email = process.env.ONEMAP_EMAIL
    const password = process.env.ONEMAP_PASSWORD
    if (!email || !password) throw new Error('Address lookup is not configured')
    const response = await fetch(`${ONEMAP}/api/auth/post/getToken`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) throw new Error(`OneMap login failed with ${response.status}`)
    const body = z.object({ access_token: z.string().min(1), expiry_timestamp: z.coerce.number() }).parse(await response.json())
    token = { value: body.access_token, expiresAt: body.expiry_timestamp * 1000 }
    return token.value
  })().finally(() => {
    pending = null
  })
  return pending
}

/// Generous for a person typing, tight enough that one account cannot spend the shared
/// OneMap allowance. Per instance, which is all the protection a typing pace needs.
const LOOKUPS_PER_MINUTE = 60
const recent = new Map<string, number[]>()

function allow(stakeholderId: string, now = Date.now()) {
  const within = (recent.get(stakeholderId) ?? []).filter((at) => now - at < 60_000)
  if (within.length >= LOOKUPS_PER_MINUTE) return false
  within.push(now)
  recent.set(stakeholderId, within)
  return true
}

const result = z.object({
  BLK_NO: z.string(),
  ROAD_NAME: z.string(),
  BUILDING: z.string(),
  POSTAL: z.string(),
})

/// OneMap writes addresses in capitals; a report reads better as "23 Marina Way".
function titleCase(value: string) {
  return value.toLowerCase().replace(/(^|[\s(/-])([a-z])/g, (_, gap: string, letter: string) => gap + letter.toUpperCase())
}

export type AddressMatch = { line1: string; postalCode: string; building: string | null }

/// Up to ten addresses for a postal code, building or street. Places without their
/// own postal code (a shop listed by name) are left out, as are repeats.
export async function searchAddresses(stakeholderId: string, raw: string): Promise<AddressMatch[]> {
  const query = z.string().trim().min(2).max(80).parse(raw)
  if (!allow(stakeholderId)) throw new Error('Too many address lookups. Try again in a minute.')
  const url = new URL(`${ONEMAP}/api/common/elastic/search`)
  url.search = new URLSearchParams({ searchVal: query, returnGeom: 'N', getAddrDetails: 'Y', pageNum: '1' }).toString()
  const response = await fetch(url, {
    headers: { Authorization: await accessToken() },
    signal: AbortSignal.timeout(8000),
  })
  if (!response.ok) throw new Error(`OneMap search failed with ${response.status}`)
  const body = z.object({ results: z.array(result) }).parse(await response.json())
  const matches = new Map<string, AddressMatch>()
  for (const row of body.results) {
    if (!/^\d{6}$/.test(row.POSTAL) || row.BLK_NO === 'NIL' || row.ROAD_NAME === 'NIL') continue
    const line1 = `${row.BLK_NO} ${titleCase(row.ROAD_NAME)}`
    const key = `${line1}|${row.POSTAL}`
    if (matches.has(key)) continue
    matches.set(key, { line1, postalCode: row.POSTAL, building: row.BUILDING === 'NIL' ? null : titleCase(row.BUILDING) })
  }
  return [...matches.values()].slice(0, 10)
}
