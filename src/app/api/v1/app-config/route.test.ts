import { afterEach, describe, expect, it, vi } from 'vitest'
import { GET } from './route'

describe('GET /api/v1/app-config', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('retires no build until a floor is set', async () => {
    vi.stubEnv('KIVILO_MIN_BUILD_IOS', undefined)
    vi.stubEnv('KIVILO_MIN_BUILD_ANDROID', undefined)
    const body = await GET().json()
    expect(body.ios.minBuild).toBe(0)
    expect(body.android.minBuild).toBe(0)
  })

  /// Apple review lags Play, so one platform's floor must move without the other's.
  it('serves each platform its own floor and store', async () => {
    vi.stubEnv('KIVILO_MIN_BUILD_IOS', '22')
    vi.stubEnv('KIVILO_MIN_BUILD_ANDROID', '24')
    const body = await GET().json()
    expect(body.ios).toEqual({ minBuild: 22, storeUrl: 'https://apps.apple.com/app/id6821514302' })
    expect(body.android).toEqual({
      minBuild: 24,
      storeUrl: 'https://play.google.com/store/apps/details?id=one.kivilo.kivilo',
    })
  })

  /// The app fails open on a floor of 0, so a typo in the variable must not retire everyone.
  it('treats a floor that is not a number as no floor', async () => {
    vi.stubEnv('KIVILO_MIN_BUILD_IOS', 'twenty-two')
    expect((await GET().json()).ios.minBuild).toBe(0)
  })
})
