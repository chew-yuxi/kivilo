import type { User } from '@supabase/supabase-js'
import { parseAcquisitionCookie } from '@/lib/acquisition-keys'

/// Exact operator lists and reserved fixture domains are the only email-based
/// exclusions. A comped plan is not evidence that an account is a test account.
export function acquisitionExcluded(email: string | null, appMetadata?: Record<string, unknown>): boolean {
  if (appMetadata?.kiviloReviewerTrack === 'apple' || appMetadata?.kiviloReviewerTrack === 'google') return true
  const normalized = email?.trim().toLowerCase()
  if (!normalized) return false
  const excluded = [process.env.ADMIN_EMAILS, process.env.ACQUISITION_EXCLUDED_EMAILS]
    .flatMap((value) => (value ?? '').split(','))
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
  if (excluded.includes(normalized)) return true
  const domain = normalized.split('@').at(-1)!
  return ['test', 'invalid', 'localhost', 'example', 'example.com', 'example.net', 'example.org']
    .some((reserved) => domain === reserved || domain.endsWith(`.${reserved}`))
}

/// Only called when a verified Auth identity first links to a Stakeholder. An old
/// Auth account keeps its actual verification date, and later marketing visits
/// cannot become the purported cause of that historical signup.
export function acquisitionForVerifiedUser(
  user: Pick<User, 'email' | 'email_confirmed_at' | 'app_metadata'>,
  entryPoint: 'WEB' | 'NATIVE',
  rawCookie?: string,
  now = new Date(),
) {
  const verifiedAt = user.email_confirmed_at ? new Date(user.email_confirmed_at) : null
  if (!user.email || !verifiedAt || !Number.isFinite(verifiedAt.getTime()) || verifiedAt > now) return undefined
  const touch = entryPoint === 'WEB' ? parseAcquisitionCookie(rawCookie, now.getTime()) : null
  const attribution = touch && touch.capturedAt <= verifiedAt.getTime() + 5 * 60_000 ? touch : null
  return {
    verifiedAt,
    source: attribution?.source ?? 'unattributed',
    medium: attribution?.medium ?? null,
    campaign: attribution?.campaign ?? null,
    landing: attribution?.landing ?? null,
    entryPoint,
    excluded: acquisitionExcluded(user.email, user.app_metadata),
  }
}
