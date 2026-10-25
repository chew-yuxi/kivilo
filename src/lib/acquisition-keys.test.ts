import { describe, expect, it } from 'vitest'
import sitemap from '../../marketing/app/sitemap'
import {
  ACQUISITION_CAMPAIGNS,
  ACQUISITION_LANDINGS,
  ACQUISITION_MAX_AGE_SECONDS,
  acquisitionTouchForEntry,
  parseAcquisitionCookie,
} from './acquisition-keys'

const now = Date.UTC(2026, 9, 26)
const touch = { source: 'google', medium: 'organic', campaign: null, landing: '/product', capturedAt: now }
const entry = { origin: 'https://kivilo.app', pathname: '/product', search: '', referrer: '' }

describe('acquisition cookie validation', () => {
  it('accepts browser-encoded and server-decoded finite fields', () => {
    const json = JSON.stringify(touch)
    expect(parseAcquisitionCookie(json, now)).toEqual(touch)
    expect(parseAcquisitionCookie(encodeURIComponent(json), now)).toEqual(touch)
  })

  it.each([undefined, '', '%bad', '{broken', 'null', '[]', '"text"', 'x'.repeat(1025)])('leaves absent or malformed attribution unknown: %s', raw => {
    expect(parseAcquisitionCookie(raw, now)).toBeNull()
  })

  it.each([
    { source: 'email@example.com' },
    { medium: 'private free text' },
    { campaign: 'tenant@example.com' },
    { landing: '/sign/private-id' },
    { landing: '/reports/bearer-token' },
    { landing: '/compare/arbitrary-private-text' },
    { landing: '/product?email=tenant@example.com' },
    { landing: 'https://kivilo.app/product' },
    { capturedAt: String(now) },
    { capturedAt: -1 },
    { capturedAt: now + 0.5 },
    { capturedAt: Number.MAX_SAFE_INTEGER + 1 },
    { email: 'tenant@example.com' },
  ])('refuses non-catalogue data or unexpected fields: %o', invalid => {
    expect(parseAcquisitionCookie(JSON.stringify({ ...touch, ...invalid }), now)).toBeNull()
  })

  it('requires every field, including explicit null campaign', () => {
    const missing: Partial<typeof touch> = { ...touch }
    delete missing.campaign
    expect(parseAcquisitionCookie(JSON.stringify(missing), now)).toBeNull()
  })

  it('expires after 30 days without a sliding window and bounds clock skew', () => {
    const raw = JSON.stringify(touch)
    expect(parseAcquisitionCookie(raw, now + ACQUISITION_MAX_AGE_SECONDS * 1000 - 1)).toEqual(touch)
    expect(parseAcquisitionCookie(raw, now + ACQUISITION_MAX_AGE_SECONDS * 1000)).toBeNull()
    expect(parseAcquisitionCookie(raw, now - 5 * 60 * 1000)).toEqual(touch)
    expect(parseAcquisitionCookie(raw, now - 5 * 60 * 1000 - 1)).toBeNull()
  })

  it('allows exactly the public sitemap and no unregistered campaign', () => {
    expect([...ACQUISITION_LANDINGS].sort()).toEqual(sitemap().map(page => new URL(page.url).pathname).sort())
    expect(ACQUISITION_CAMPAIGNS).toEqual([])
  })
})

describe('marketing entry categories', () => {
  it('records direct only for an observed public entry without referrer or UTM tags', () => {
    expect(acquisitionTouchForEntry(entry, now)).toEqual({
      source: 'direct', medium: 'none', campaign: null, landing: '/product', capturedAt: now,
    })
    expect(acquisitionTouchForEntry({ ...entry, search: '?utm_source=private-text' }, now)).toMatchObject({ source: 'unknown', medium: 'unknown' })
  })

  it.each([
    ['https://www.google.com/search?q=private+search', 'google', 'organic'],
    ['https://www.google.com.sg/search?q=private+search', 'google', 'organic'],
    ['https://www.bing.com/search?q=private+search', 'bing', 'organic'],
    ['https://search.brave.com/search?q=private+search', 'brave', 'organic'],
    ['https://chatgpt.com/c/private-conversation', 'chatgpt', 'ai'],
    ['https://chat.openai.com/c/private-conversation', 'chatgpt', 'ai'],
    ['https://www.perplexity.ai/search/private-conversation', 'perplexity', 'ai'],
    ['https://claude.ai/chat/private-conversation', 'claude', 'ai'],
    ['https://gemini.google.com/app/private-conversation', 'gemini', 'ai'],
    ['https://copilot.microsoft.com/chats/private-conversation', 'copilot', 'ai'],
    ['https://l.facebook.com/l.php?u=private', 'facebook', 'social'],
    ['https://t.co/private', 'x', 'social'],
    ['https://example.com/private?email=tenant@example.com', 'other', 'referral'],
    ['https://google.com.example.com/private', 'other', 'referral'],
  ])('reduces referrer %s to %s/%s', (referrer, source, medium) => {
    expect(acquisitionTouchForEntry({ ...entry, referrer }, now)).toEqual({
      source, medium, campaign: null, landing: '/product', capturedAt: now,
    })
  })

  it.each(['https://kivilo.app/compare', 'https://my.kivilo.app/sign/private?email=tenant@example.com'])('ignores an internal return from %s', referrer => {
    expect(acquisitionTouchForEntry({ ...entry, referrer }, now)).toBeNull()
  })

  it.each([
    { origin: 'https://my.kivilo.app' },
    { origin: 'https://kivilo.example.com' },
    { origin: 'http://kivilo.app' },
    { origin: 'http://localhost:3115' },
    { pathname: '/reports/private' },
    { pathname: '/sign/private' },
    { pathname: '/not-a-public-page' },
    { referrer: 'not a URL' },
    { referrer: 'javascript:alert(1)' },
  ])('does not capture unsupported entry data: %o', invalid => {
    expect(acquisitionTouchForEntry({ ...entry, ...invalid }, now)).toBeNull()
  })

  it('accepts known UTM categories and discards all unregistered text', () => {
    expect(acquisitionTouchForEntry({
      ...entry,
      search: '?utm_source=Google&utm_medium=cpc&utm_campaign=tenant@example.com&utm_term=private&email=secret&next=https://evil.example',
      referrer: 'https://www.bing.com/search?q=secret',
    }, now)).toEqual({ source: 'google', medium: 'paid', campaign: null, landing: '/product', capturedAt: now })
  })

  it('recognizes provider UTM aliases without inventing a missing medium', () => {
    expect(acquisitionTouchForEntry({ ...entry, search: '?utm_source=chatgpt.com' }, now)).toMatchObject({ source: 'chatgpt', medium: 'unknown' })
    expect(acquisitionTouchForEntry({ ...entry, search: '?utm_source=chatgpt.com', referrer: 'https://chatgpt.com/' }, now)).toMatchObject({ source: 'chatgpt', medium: 'ai' })
    expect(acquisitionTouchForEntry({ ...entry, search: '?utm_source=newsletter&utm_medium=email' }, now)).toMatchObject({ source: 'newsletter', medium: 'email' })
  })

  it('does not accept inherited object keys as a UTM medium', () => {
    expect(acquisitionTouchForEntry({ ...entry, search: '?utm_source=google&utm_medium=constructor' }, now)).toMatchObject({ source: 'google', medium: 'unknown' })
  })
})
