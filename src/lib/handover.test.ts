import { afterEach, describe, expect, it, vi } from 'vitest'
import { handoverUrl } from '@/lib/handover'

afterEach(() => vi.unstubAllEnvs())

describe('handoverUrl', () => {
  it('contains only an inspection id on the configured origin, without email or share credentials', () => {
    vi.stubEnv('KIVILO_APP_URL', 'https://kivilo.test/ignored-path')
    expect(handoverUrl('check-in')).toBe('https://kivilo.test/handover/check-in')
  })

  it('refuses absent origins and origins containing credentials or a non-web scheme', () => {
    vi.stubEnv('KIVILO_APP_URL', '')
    expect(() => handoverUrl('id')).toThrow('KIVILO_APP_URL must be set')
    for (const value of ['file:///private', 'https://user:secret@kivilo.test']) {
      vi.stubEnv('KIVILO_APP_URL', value)
      expect(() => handoverUrl('id')).toThrow('KIVILO_APP_URL must be an HTTP origin')
    }
  })
})
