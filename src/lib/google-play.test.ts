import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({ request: vi.fn(), verifyIdToken: vi.fn() }))
vi.mock('google-auth-library', () => ({
  JWT: class { request = api.request },
  OAuth2Client: class { verifyIdToken = api.verifyIdToken },
}))

import { googlePlay, GooglePlayApiError, playBillingOpen, verifyGooglePlayNotification } from './google-play'

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON', JSON.stringify({
    type: 'service_account', client_email: 'billing@example.iam.gserviceaccount.com', private_key: 'test-only',
  }))
  vi.stubEnv('GOOGLE_PLAY_RTDN_AUDIENCE', 'https://my.kivilo.app/api/google-play/notifications')
  vi.stubEnv('GOOGLE_PLAY_RTDN_SERVICE_ACCOUNT_EMAIL', 'push@example.iam.gserviceaccount.com')
  vi.stubEnv('GOOGLE_PLAY_BILLING_ENABLED', 'true')
})
afterEach(() => vi.unstubAllEnvs())

describe('Google Play server transport', () => {
  it('reads v2, encodes token path segments, and pins the app package', async () => {
    const resource = { subscriptionState: 'SUBSCRIPTION_STATE_ACTIVE' }
    api.request.mockResolvedValue({ data: resource })
    expect(await googlePlay().getSubscription('token/with?reserved')).toEqual(resource)
    expect(api.request).toHaveBeenCalledWith(expect.objectContaining({
      method: 'GET',
      url: 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications/one.kivilo.kivilo/purchases/subscriptionsv2/tokens/token%2Fwith%3Freserved',
    }))
  })

  it('acknowledges with the supported endpoint and cancels deletion subscriptions irreversibly', async () => {
    api.request.mockResolvedValue({ data: '' })
    await googlePlay().acknowledgeSubscription('kivilo_pro', 'token')
    expect(api.request).toHaveBeenLastCalledWith(expect.objectContaining({
      method: 'POST', data: {}, url: expect.stringContaining('/purchases/subscriptions/kivilo_pro/tokens/token:acknowledge'),
    }))
    await googlePlay().cancelSubscription('token')
    expect(api.request).toHaveBeenLastCalledWith(expect.objectContaining({
      method: 'POST', data: { cancellationContext: { cancellationType: 'DEVELOPER_REQUESTED_STOP_PAYMENTS' } },
      url: expect.stringContaining('/purchases/subscriptionsv2/tokens/token:cancel'),
    }))
  })

  it('does not leak provider request credentials, purchase tokens or causes into error tracking', async () => {
    api.request.mockRejectedValue({ response: { status: 403 }, message: 'secret-key secret-token', config: { headers: { authorization: 'secret-key' } } })
    let caught: unknown
    try { await googlePlay().getSubscription('secret-token') } catch (error) { caught = error }
    expect(caught).toBeInstanceOf(GooglePlayApiError)
    expect((caught as Error).message).toBe('Google Play read failed (HTTP 403)')
    expect((caught as Error).cause).toBeUndefined()
    expect(JSON.stringify(caught)).not.toContain('secret')
  })

  it('revokes an unfulfilled purchase with the explicit full-refund v2 request', async () => {
    api.request.mockResolvedValue({ data: '' })
    await googlePlay().revokeSubscription('token')
    expect(api.request).toHaveBeenCalledWith(expect.objectContaining({
      method: 'POST', data: { revocationContext: { fullRefund: {} } },
      url: expect.stringContaining('/purchases/subscriptionsv2/tokens/token:revoke'),
    }))
  })

  it('rejects alternate credential types and never leaks malformed JSON', () => {
    vi.stubEnv('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON', '{secret-invalid-json')
    expect(() => googlePlay()).toThrow('Google Play service account is not configured')
    vi.stubEnv('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON', JSON.stringify({ type: 'external_account', credential_source: { url: 'https://example.com' } }))
    expect(() => googlePlay()).toThrow('Google Play service account is not configured')
  })

  it('keeps sales disabled without explicit enablement and notification configuration', () => {
    expect(playBillingOpen()).toBe(true)
    vi.stubEnv('GOOGLE_PLAY_BILLING_ENABLED', 'false')
    expect(playBillingOpen()).toBe(false)
    vi.stubEnv('GOOGLE_PLAY_BILLING_ENABLED', 'true')
    vi.stubEnv('GOOGLE_PLAY_RTDN_AUDIENCE', '')
    expect(playBillingOpen()).toBe(false)
  })
})

describe('authenticated Pub/Sub push', () => {
  const request = () => new Request('https://my.kivilo.app/api/google-play/notifications', { headers: { authorization: 'Bearer signed-token' } })

  it('requires a Google-verified token for the exact audience and verified service-account email', async () => {
    api.verifyIdToken.mockResolvedValue({ getPayload: () => ({ email: 'push@example.iam.gserviceaccount.com', email_verified: true }) })
    expect(await verifyGooglePlayNotification(request())).toBe(true)
    expect(api.verifyIdToken).toHaveBeenCalledWith({ idToken: 'signed-token', audience: 'https://my.kivilo.app/api/google-play/notifications' })
  })

  it.each([
    { email: 'other@example.iam.gserviceaccount.com', email_verified: true },
    { email: 'push@example.iam.gserviceaccount.com', email_verified: false },
    undefined,
  ])('rejects an untrusted service identity: %j', async (payload) => {
    api.verifyIdToken.mockResolvedValue({ getPayload: () => payload })
    expect(await verifyGooglePlayNotification(request())).toBe(false)
  })

  it('fails closed for missing, expired and invalid signatures without logging the token', async () => {
    expect(await verifyGooglePlayNotification(new Request('https://example.com'))).toBe(false)
    expect(api.verifyIdToken).not.toHaveBeenCalled()
    api.verifyIdToken.mockRejectedValue(new Error('invalid signed-token'))
    expect(await verifyGooglePlayNotification(request())).toBe(false)
  })
})
