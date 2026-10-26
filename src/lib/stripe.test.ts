import { afterEach, describe, expect, it, vi } from 'vitest'
import { assertStripeMode, stripe, stripeModeMatches } from './stripe'

afterEach(() => vi.unstubAllEnvs())

describe('Stripe environment boundary', () => {
  it.each([
    ['development', 'rk_test_unused', false, true],
    ['development', 'rk_test_unused', true, false],
    ['development', 'sk_live_unused', true, true],
    ['production', 'rk_test_unused', false, false],
    ['production', 'rk_live_unused', false, false],
    ['production', 'rk_live_unused', true, true],
    ['production', 'pk_live_unused', true, false],
    ['development', '', false, false],
  ] as const)('%s rejects resources outside the configured key mode', (environment, key, livemode, matches) => {
    vi.stubEnv('VERCEL_ENV', environment)
    vi.stubEnv('STRIPE_SECRET_KEY', key)
    expect(stripeModeMatches(livemode)).toBe(matches)
    if (matches) expect(() => assertStripeMode({ livemode })).not.toThrow()
    else expect(() => assertStripeMode({ livemode })).toThrow('mode does not match')
  })

  it('does not create a production Stripe client with a sandbox key', () => {
    vi.stubEnv('VERCEL_ENV', 'production')
    vi.stubEnv('STRIPE_SECRET_KEY', 'rk_test_unused')
    expect(() => stripe()).toThrow('not configured for this environment')
  })
})
