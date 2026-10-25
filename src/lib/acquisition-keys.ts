// Shared by the static marketing site and verified account creation. Only these
// categories cross the domain boundary; never a URL, search term or visitor ID.
export const ACQUISITION_COOKIE = 'kivilo_acquisition_v1'
export const ACQUISITION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60

export const ACQUISITION_SOURCES = [
  'direct', 'google', 'bing', 'duckduckgo', 'yahoo', 'brave',
  'chatgpt', 'perplexity', 'claude', 'gemini', 'copilot',
  'linkedin', 'facebook', 'instagram', 'x', 'youtube', 'newsletter',
  'other', 'unknown',
] as const
export const ACQUISITION_MEDIUMS = [
  'none', 'organic', 'ai', 'social', 'email', 'paid', 'referral', 'unknown',
] as const

// Exact public pages, deliberately not a route-prefix matcher. A private report,
// signing URL or an arbitrary path can never become an acquisition property.
export const ACQUISITION_LANDINGS = [
  '/', '/product', '/compare', '/guides',
  '/compare/kivilo-vs-report-and-run',
  '/compare/kivilo-vs-inventorybase',
  '/compare/kivilo-vs-inventory-hive',
  '/compare/kivilo-vs-chapps-rental-inspector',
  '/compare/kivilo-vs-snapinspect',
  '/compare/kivilo-vs-rentcheck',
  '/guides/rental-handover-checklist-singapore',
  '/guides/rental-inspection-app-singapore',
] as const

// Register campaign codes here before using them in published links. There are
// no campaigns yet; arbitrary utm_campaign text is always discarded.
export const ACQUISITION_CAMPAIGNS: readonly string[] = []

export type AcquisitionTouch = {
  source: string
  medium: string
  campaign: string | null
  landing: string
  capturedAt: number
}

const sources: readonly string[] = ACQUISITION_SOURCES
const mediums: readonly string[] = ACQUISITION_MEDIUMS
const landings: readonly string[] = ACQUISITION_LANDINGS
const keys = ['source', 'medium', 'campaign', 'landing', 'capturedAt']

export function parseAcquisitionCookie(raw: string | undefined, now = Date.now()): AcquisitionTouch | null {
  if (!raw || raw.length > 1024) return null
  let value: unknown
  try {
    // Browser cookie strings are encoded; server cookie readers may decode them.
    value = JSON.parse(raw.startsWith('{') ? raw : decodeURIComponent(raw))
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof URIError) return null
    throw error
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const touch = value as Record<string, unknown>
  if (Object.keys(touch).length !== keys.length || !keys.every(key => Object.hasOwn(touch, key))) return null
  if (typeof touch.source !== 'string' || !sources.includes(touch.source)) return null
  if (typeof touch.medium !== 'string' || !mediums.includes(touch.medium)) return null
  if (typeof touch.landing !== 'string' || !landings.includes(touch.landing)) return null
  if (touch.campaign !== null && (typeof touch.campaign !== 'string' || !ACQUISITION_CAMPAIGNS.includes(touch.campaign))) return null
  if (typeof touch.capturedAt !== 'number' || !Number.isSafeInteger(touch.capturedAt) || touch.capturedAt < 0) return null
  if (!Number.isFinite(now) || touch.capturedAt > now + 5 * 60 * 1000) return null
  if (now - touch.capturedAt >= ACQUISITION_MAX_AGE_SECONDS * 1000) return null
  return touch as AcquisitionTouch
}

const referrers = [
  { source: 'google', medium: 'organic', hosts: ['google.com', 'google.com.sg', 'google.co.uk', 'google.com.au', 'google.co.in'] },
  { source: 'bing', medium: 'organic', hosts: ['bing.com'] },
  { source: 'duckduckgo', medium: 'organic', hosts: ['duckduckgo.com'] },
  { source: 'yahoo', medium: 'organic', hosts: ['search.yahoo.com'] },
  { source: 'brave', medium: 'organic', hosts: ['search.brave.com'] },
  { source: 'chatgpt', medium: 'ai', hosts: ['chatgpt.com', 'chat.openai.com'] },
  { source: 'perplexity', medium: 'ai', hosts: ['perplexity.ai'] },
  { source: 'claude', medium: 'ai', hosts: ['claude.ai'] },
  { source: 'gemini', medium: 'ai', hosts: ['gemini.google.com'] },
  { source: 'copilot', medium: 'ai', hosts: ['copilot.microsoft.com'] },
  { source: 'linkedin', medium: 'social', hosts: ['linkedin.com', 'lnkd.in'] },
  { source: 'facebook', medium: 'social', hosts: ['facebook.com', 'fb.com'] },
  { source: 'instagram', medium: 'social', hosts: ['instagram.com'] },
  { source: 'x', medium: 'social', hosts: ['x.com', 'twitter.com', 't.co'] },
  { source: 'youtube', medium: 'social', hosts: ['youtube.com', 'youtu.be'] },
] as const

const mediumAliases: Readonly<Record<string, string>> = {
  none: 'none', organic: 'organic', ai: 'ai', social: 'social', email: 'email',
  newsletter: 'email', paid: 'paid', cpc: 'paid', ppc: 'paid', paid_social: 'paid',
  referral: 'referral',
}

/** Categorize one observed marketing entry. All incoming URL text is discarded. */
export function acquisitionTouchForEntry(entry: {
  origin: string
  pathname: string
  search: string
  referrer: string
}, now = Date.now()): AcquisitionTouch | null {
  if (entry.origin !== 'https://kivilo.app' || !landings.includes(entry.pathname)) return null
  let referred: { source: string; medium: string } = { source: 'direct', medium: 'none' }
  if (entry.referrer) {
    let referrer: URL
    try {
      referrer = new URL(entry.referrer)
    } catch (error) {
      if (error instanceof TypeError) return null
      throw error
    }
    if (referrer.protocol !== 'https:' && referrer.protocol !== 'http:') return null
    // A return from the app or an internal navigation is not a new acquisition.
    if (referrer.hostname === 'kivilo.app' || referrer.hostname.endsWith('.kivilo.app')) return null
    // Specific hosts such as Gemini take precedence over their search provider.
    const provider = [...referrers].reverse().find(candidate => candidate.hosts.some(
      host => referrer.hostname === host || referrer.hostname.endsWith(`.${host}`),
    ))
    referred = provider ?? { source: 'other', medium: 'referral' }
  }
  const params = new URLSearchParams(entry.search)
  const tagged = [...params.keys()].some(key => key.startsWith('utm_'))
  let source = referred.source
  let medium = referred.medium
  if (tagged) {
    const rawSource = (params.get('utm_source') ?? '').toLowerCase()
    const rawMedium = (params.get('utm_medium') ?? '').toLowerCase()
    const provider = referrers.find(candidate => candidate.source === rawSource || (candidate.hosts as readonly string[]).includes(rawSource))
    source = provider?.source ?? (rawSource === 'newsletter' ? 'newsletter' : 'unknown')
    medium = Object.hasOwn(mediumAliases, rawMedium) ? mediumAliases[rawMedium] : 'unknown'
    if (!rawMedium && referred.source === source) medium = referred.medium
  }
  const campaign = params.get('utm_campaign')
  return {
    source,
    medium,
    campaign: campaign && ACQUISITION_CAMPAIGNS.includes(campaign) ? campaign : null,
    landing: entry.pathname,
    capturedAt: now,
  }
}
