import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { captureAcquisition } from '../../marketing/components/acquisition-capture'
import { ACQUISITION_COOKIE, ACQUISITION_MAX_AGE_SECONDS, parseAcquisitionCookie } from './acquisition-keys'

const now = Date.UTC(2026, 9, 26)
let cookie: string
let reader: ReturnType<typeof vi.fn<() => string>>
let writer: ReturnType<typeof vi.fn<(value: string) => void>>
let browserDocument: { referrer: string; cookie: string }
let location: { origin: string; pathname: string; search: string }

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(now)
  cookie = ''
  reader = vi.fn(() => cookie)
  writer = vi.fn((value: string) => { cookie = value.split(';')[0] })
  browserDocument = { referrer: '', get cookie() { return reader() }, set cookie(value) { writer(value) } }
  location = { origin: 'https://kivilo.app', pathname: '/product', search: '' }
  vi.stubGlobal('document', browserDocument)
  vi.stubGlobal('window', { location })
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('first-party acquisition transport', () => {
  it('writes only a bounded category cookie shared with the app domain', () => {
    location.search = '?utm_source=google&utm_medium=organic&email=private@example.com&next=https://evil.example'
    browserDocument.referrer = 'https://www.google.com/search?q=private+query'
    captureAcquisition()
    expect(writer).toHaveBeenCalledTimes(1)
    expect(writer.mock.calls[0][0]).toContain(`; Domain=kivilo.app; Path=/; Max-Age=${ACQUISITION_MAX_AGE_SECONDS}; SameSite=Lax; Secure`)
    expect(parseAcquisitionCookie(cookie.slice(ACQUISITION_COOKIE.length + 1), now)).toEqual({
      source: 'google', medium: 'organic', campaign: null, landing: '/product', capturedAt: now,
    })
    expect(decodeURIComponent(cookie)).not.toMatch(/private|email|next|evil/)
    expect(location.search).toContain('email=private@example.com')
  })

  it('preserves first touch and original expiry on later visits or internal navigation', () => {
    browserDocument.referrer = 'https://chatgpt.com/c/private'
    captureAcquisition()
    const firstCookie = cookie
    location.pathname = '/compare'
    location.search = '?utm_source=google&utm_medium=cpc'
    browserDocument.referrer = 'https://www.google.com/'
    vi.setSystemTime(now + 24 * 60 * 60 * 1000)
    cookie = `unrelated=kept; ${firstCookie}; later=value`
    captureAcquisition()
    expect(writer).toHaveBeenCalledTimes(1)
    expect(cookie).toContain(firstCookie)
  })

  it('replaces expired attribution only after a fresh public entry', () => {
    captureAcquisition()
    vi.setSystemTime(now + ACQUISITION_MAX_AGE_SECONDS * 1000)
    browserDocument.referrer = 'https://www.bing.com/'
    location.pathname = '/compare'
    captureAcquisition()
    expect(writer).toHaveBeenCalledTimes(2)
    expect(parseAcquisitionCookie(cookie.slice(ACQUISITION_COOKIE.length + 1))).toMatchObject({ source: 'bing', landing: '/compare', capturedAt: Date.now() })
  })

  it('replaces malformed cookies without carrying their content forward', () => {
    cookie = `${ACQUISITION_COOKIE}=%broken`
    captureAcquisition()
    expect(writer).toHaveBeenCalledTimes(1)
    expect(parseAcquisitionCookie(cookie.slice(ACQUISITION_COOKIE.length + 1))).toMatchObject({ source: 'direct' })
  })

  it('does not touch cookies on app, old-host or development origins', () => {
    for (const origin of ['https://my.kivilo.app', 'https://old-host.example', 'http://localhost:3115']) {
      location.origin = origin
      captureAcquisition()
    }
    expect(reader).not.toHaveBeenCalled()
    expect(writer).not.toHaveBeenCalled()
  })

  it('does not capture private paths or a return from the app', () => {
    location.pathname = '/sign/private'
    captureAcquisition()
    location.pathname = '/product'
    browserDocument.referrer = 'https://my.kivilo.app/inspections'
    captureAcquisition()
    expect(writer).not.toHaveBeenCalled()
  })

  it('keeps marketing usable when cookie reads are denied', () => {
    reader.mockImplementationOnce(() => { throw new DOMException('Denied', 'SecurityError') })
    expect(captureAcquisition).not.toThrow()
    expect(writer).not.toHaveBeenCalled()
  })

  it.each(['SecurityError', 'QuotaExceededError'])('keeps marketing usable when a cookie write fails with %s', name => {
    writer.mockImplementationOnce(() => { throw new DOMException('Denied', name) })
    expect(captureAcquisition).not.toThrow()
  })
})
