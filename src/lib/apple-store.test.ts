import { afterEach, describe, expect, it, vi } from 'vitest'
import { Environment, InAppOwnershipType, NotificationTypeV2, SignedDataVerifier, Status, Type } from '@apple/app-store-server-library'
import { APPLE_APP_ID, APPLE_BUNDLE_ID } from '@/lib/apple-catalog'
import { appleSubscriptionState, verifyAppleNotification, verifyAppleTransaction } from '@/lib/apple-store'
import { subscriptionCanResume, subscriptionIsLive } from '@/lib/plan'

const transaction = {
  bundleId: 'one.kivilo.kivilo', type: Type.AUTO_RENEWABLE_SUBSCRIPTION,
  inAppOwnershipType: InAppOwnershipType.PURCHASED, quantity: 1,
  originalTransactionId: '100', transactionId: '101', productId: 'kivilo_pro_monthly',
  appAccountToken: 'A7EF9D30-25CA-40B0-B8DF-263DCB6F4D28', environment: Environment.SANDBOX,
  expiresDate: Date.now() + 86400000,
}
const renewal = { originalTransactionId: '100', autoRenewStatus: 1, environment: Environment.SANDBOX }

afterEach(() => vi.restoreAllMocks())

describe('Apple subscription validation', () => {
  it('uses the signed catalog and normalizes its opaque account binding', () => {
    expect(appleSubscriptionState(transaction, renewal, Status.ACTIVE)).toMatchObject({
      state: 'APPLE_ACTIVE', product: { seats: 1, kind: 'personal' }, accountId: transaction.appAccountToken.toLowerCase(),
    })
  })
  it.each([
    { bundleId: 'another.app' }, { productId: 'unknown' }, { quantity: 20 }, { quantity: undefined },
    { type: Type.CONSUMABLE }, { inAppOwnershipType: InAppOwnershipType.FAMILY_SHARED },
    { environment: Environment.XCODE }, { appAccountToken: undefined }, { expiresDate: undefined }, { isUpgraded: true },
  ])('rejects unsupported transaction fields %j', (fields) => {
    expect(() => appleSubscriptionState({ ...transaction, ...fields }, renewal, Status.ACTIVE)).toThrow()
  })
  it('rejects mismatched renewal ownership and environments', () => {
    expect(() => appleSubscriptionState(transaction, { ...renewal, originalTransactionId: 'another' }, 1)).toThrow()
    expect(() => appleSubscriptionState(transaction, { ...renewal, environment: Environment.PRODUCTION }, 1)).toThrow()
    expect(() => appleSubscriptionState(transaction, { ...renewal, appAccountToken: 'another' }, 1)).toThrow()
  })
  it('uses grace expiry, preserves a canceled term, and removes refunded access', () => {
    const grace = Date.now() + 3 * 86400000
    expect(appleSubscriptionState(transaction, { ...renewal, gracePeriodExpiresDate: grace }, 4)).toMatchObject({ state: 'APPLE_GRACE_PERIOD', expiresAt: new Date(grace) })
    expect(appleSubscriptionState(transaction, { ...renewal, autoRenewStatus: 0 }, 1).state).toBe('APPLE_CANCELED')
    expect(appleSubscriptionState({ ...transaction, revocationDate: Date.now() }, renewal, 1).state).toBe('APPLE_REVOKED')
  })
  it('never grants a forged transaction or notification', async () => {
    const forged = ['eyJhbGciOiJub25lIn0', Buffer.from(JSON.stringify(transaction)).toString('base64url'), 'fake'].join('.')
    await expect(verifyAppleTransaction(forged)).rejects.toMatchObject({ code: 'invalid_purchase' })
    await expect(verifyAppleNotification(forged)).rejects.toMatchObject({ code: 'invalid_purchase' })
  })
  it.each([
    { environment: Environment.SANDBOX, bundleId: APPLE_BUNDLE_ID },
    { environment: Environment.PRODUCTION, bundleId: APPLE_BUNDLE_ID, appAppleId: APPLE_APP_ID },
  ])('accepts verified $environment notifications with the identifiers Apple supplies', async (data) => {
    const payload = { notificationType: NotificationTypeV2.TEST, data }
    // Stub signature verification only. The SDK's real notification identifier
    // and environment checks reproduce Sandbox's missing appAppleId behavior.
    vi.spyOn(SignedDataVerifier.prototype as unknown as { verifyJWT: () => Promise<unknown> }, 'verifyJWT')
      .mockResolvedValue(payload)
    await expect(verifyAppleNotification('verified-test-notification')).resolves.toEqual(payload)
  })
  it.each([
    { environment: Environment.SANDBOX, bundleId: 'another.app' },
    { environment: Environment.PRODUCTION, bundleId: APPLE_BUNDLE_ID },
    { environment: Environment.PRODUCTION, bundleId: APPLE_BUNDLE_ID, appAppleId: APPLE_APP_ID + 1 },
    { environment: Environment.XCODE, bundleId: APPLE_BUNDLE_ID },
  ])('rejects a verified notification for unsupported identifiers %j', async (data) => {
    vi.spyOn(SignedDataVerifier.prototype as unknown as { verifyJWT: () => Promise<unknown> }, 'verifyJWT')
      .mockResolvedValue({ notificationType: NotificationTypeV2.TEST, data })
    await expect(verifyAppleNotification('verified-test-notification')).rejects.toMatchObject({ code: 'invalid_purchase' })
  })
  it('enforces expiry without a webhook and blocks a provider switch during billing retry', () => {
    const subscription = { applePurchaseId: 'apple', googlePlayPurchaseId: null, status: 'APPLE_ACTIVE', currentPeriodEnd: new Date(Date.now() - 1000) }
    expect(subscriptionIsLive(subscription)).toBe(false)
    expect(subscriptionCanResume({ ...subscription, status: 'APPLE_BILLING_RETRY' })).toBe(true)
    expect(subscriptionCanResume({ ...subscription, status: 'APPLE_CANCELED' })).toBe(false)
    expect(subscriptionCanResume({ ...subscription, status: 'APPLE_REVOKED' })).toBe(false)
  })
})
