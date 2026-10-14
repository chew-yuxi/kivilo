import { describe, expect, it } from 'vitest'
import { fingerprint, redactPath, redactSecrets } from './errors'

describe('fingerprint', () => {
  it('groups one bug across inspections, rooms and counts', () => {
    const on = (message: string, path: string) =>
      fingerprint({ source: 'SERVER', name: 'Error', message, path })

    expect(on('Room cmgp1k2ab0000l70812345678 has 3 captures', '/inspections/cmgp1k2ab0000l70887654321'))
      .toBe(on('Room cmgq9z8yx0000ab12abcdefgh has 12 captures', '/inspections/cmgq9z8yx0000ab12hgfedcba'))
    expect(on('Capture 0b6f1f3e-9a51-4c4f-8f8e-2f1d1c0b9a77 missing', '/x'))
      .toBe(on('Capture 7c9e6679-7425-40de-944b-e07fc1f90ae7 missing', '/x'))
  })

  it('keeps different errors, places and sources apart', () => {
    const base = { source: 'SERVER' as const, name: 'TypeError', message: 'x is undefined', path: '/inspections' }
    expect(fingerprint(base)).not.toBe(fingerprint({ ...base, message: 'y is undefined' }))
    expect(fingerprint(base)).not.toBe(fingerprint({ ...base, path: '/login' }))
    expect(fingerprint(base)).not.toBe(fingerprint({ ...base, source: 'WEB' }))
  })
})

describe('redactPath', () => {
  /// The share token is the only thing guarding a report, so it must never be stored
  /// beside an error or mailed in an alert.
  it('drops a report token and any query string', () => {
    expect(redactPath('/reports/AbC_d-123xyz/print?render=secret#top')).toBe('/reports/:token/print')
    expect(redactPath('/inspections/abc?tab=rooms')).toBe('/inspections/abc')
  })
})

describe('redactSecrets', () => {
  /// An app error quotes the signed URL an upload or a photo failed on, and the token in
  /// it opens the object until it expires.
  it('cuts a signed storage token out of a message', () => {
    const url = 'https://x.supabase.co/storage/v1/object/upload/sign/captures/r/a.jpg' +
      '?token=eyJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJjYXB0dXJlcy9yL2EuanBnIn0.c2lnbmF0dXJlX2hlcmU'
    expect(redactSecrets(`Upload failed: 400 ${url}`)).toBe(
      'Upload failed: 400 https://x.supabase.co/storage/v1/object/upload/sign/captures/r/a.jpg?token=:jwt',
    )
  })
})
