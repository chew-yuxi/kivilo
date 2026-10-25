import { afterEach, describe, expect, it, vi } from 'vitest'
import { acquisitionExcluded, acquisitionForVerifiedUser } from '@/lib/acquisition'

afterEach(() => vi.unstubAllEnvs())

describe('acquisition eligibility and verified attribution', () => {
  it('excludes explicit internal/reviewer accounts and reserved fixture domains only', () => {
    vi.stubEnv('ADMIN_EMAILS', ' Admin@agency.sg ')
    vi.stubEnv('ACQUISITION_EXCLUDED_EMAILS', 'qa@agency.sg')
    expect(acquisitionExcluded('admin@agency.sg')).toBe(true)
    expect(acquisitionExcluded('QA@agency.sg')).toBe(true)
    expect(acquisitionExcluded('other@agency.sg')).toBe(false)
    expect(acquisitionExcluded('x@kivilo.test')).toBe(true)
    expect(acquisitionExcluded('x@sub.example.com')).toBe(true)
    expect(acquisitionExcluded('x@notexample.com')).toBe(false)
    expect(acquisitionExcluded('x@agency.sg', { kiviloReviewerTrack: 'apple' })).toBe(true)
    expect(acquisitionExcluded('x@agency.sg', { kiviloReviewerTrack: 'google' })).toBe(true)
  })

  it('accepts only signup-time browser attribution, with bounded clock skew', () => {
    const now = new Date('2026-10-26T12:00:00.000Z')
    const user = { email: 'agent@agency.sg', email_confirmed_at: now.toISOString(), app_metadata: {} }
    const cookie = (capturedAt: number) => JSON.stringify({
      source: 'google', medium: 'organic', campaign: null, landing: '/product', capturedAt,
    })
    expect(acquisitionForVerifiedUser(user, 'WEB', cookie(now.getTime()), now)?.source).toBe('google')
    expect(acquisitionForVerifiedUser(user, 'NATIVE', cookie(now.getTime()), now)?.source).toBe('unattributed')
    const old = { ...user, email_confirmed_at: new Date(now.getTime() - 6 * 60_000).toISOString() }
    expect(acquisitionForVerifiedUser(old, 'WEB', cookie(now.getTime()), now)?.source).toBe('unattributed')
    expect(acquisitionForVerifiedUser(user, 'WEB', cookie(now.getTime() + 4 * 60_000), now)?.source).toBe('google')
  })
})
