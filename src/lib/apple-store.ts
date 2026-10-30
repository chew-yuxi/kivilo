import {
  AppStoreServerAPIClient, Environment, SignedDataVerifier, Status, Type,
  InAppOwnershipType, VerificationException, VerificationStatus,
  type JWSTransactionDecodedPayload, type JWSRenewalInfoDecodedPayload,
} from '@apple/app-store-server-library'
import { APPLE_APP_ID, APPLE_BUNDLE_ID, APPLE_PRODUCTS } from '@/lib/apple-catalog'
import { APPLE_ROOT_CERTIFICATES } from '@/lib/apple-root-certificates'
import { AppleBillingError } from '@/lib/apple-billing-errors'

const verifiers = new Map<Environment, SignedDataVerifier>()
function verifier(environment: Environment) {
  if (environment !== Environment.PRODUCTION && environment !== Environment.SANDBOX) {
    throw new AppleBillingError('invalid_purchase', 'This is not an App Store purchase.')
  }
  let value = verifiers.get(environment)
  if (!value) {
    value = new SignedDataVerifier(APPLE_ROOT_CERTIFICATES, true, environment, APPLE_BUNDLE_ID, APPLE_APP_ID)
    verifiers.set(environment, value)
  }
  return value
}

export function appleBillingOpen() {
  return process.env.APPLE_BILLING_ENABLED === 'true' && !!process.env.APPLE_IAP_PRIVATE_KEY &&
    !!process.env.APPLE_IAP_KEY_ID && !!process.env.APPLE_IAP_ISSUER_ID
}

function client(environment: Environment) {
  const key = process.env.APPLE_IAP_PRIVATE_KEY
  const keyId = process.env.APPLE_IAP_KEY_ID
  const issuer = process.env.APPLE_IAP_ISSUER_ID
  if (!key || !keyId || !issuer) throw new AppleBillingError('billing_unavailable', 'App Store billing is not available yet.')
  return new AppStoreServerAPIClient(key.replace(/\\n/g, '\n'), keyId, issuer, APPLE_BUNDLE_ID, environment)
}

// Apple review and TestFlight use Sandbox even against the production app backend.
// The signed environment is verified by Apple's library, never trusted from JSON.
export async function verifyAppleTransaction(signedTransaction: string) {
  for (const environment of [Environment.PRODUCTION, Environment.SANDBOX]) {
    try {
      return await verifier(environment).verifyAndDecodeTransaction(signedTransaction)
    } catch (error) {
      if (error instanceof VerificationException && error.status === VerificationStatus.INVALID_ENVIRONMENT) continue
      if (error instanceof VerificationException && error.status !== VerificationStatus.RETRYABLE_VERIFICATION_FAILURE) {
        throw new AppleBillingError('invalid_purchase', 'Could not verify this App Store purchase.')
      }
      throw new AppleBillingError('billing_unavailable', 'App Store verification is unavailable. Please try again.')
    }
  }
  throw new AppleBillingError('invalid_purchase', 'This is not an App Store purchase.')
}

export async function verifyAppleNotification(signedPayload: string) {
  for (const environment of [Environment.PRODUCTION, Environment.SANDBOX]) {
    try {
      return await verifier(environment).verifyAndDecodeNotification(signedPayload)
    } catch (error) {
      if (error instanceof VerificationException && error.status === VerificationStatus.INVALID_ENVIRONMENT) continue
      if (error instanceof VerificationException && error.status !== VerificationStatus.RETRYABLE_VERIFICATION_FAILURE) {
        throw new AppleBillingError('invalid_purchase', 'Invalid App Store notification.')
      }
      throw new AppleBillingError('billing_unavailable', 'App Store verification is unavailable.')
    }
  }
  throw new AppleBillingError('invalid_purchase', 'Invalid App Store notification.')
}

export function appleSubscriptionState(transaction: JWSTransactionDecodedPayload, renewal: JWSRenewalInfoDecodedPayload, status: number) {
  const product = APPLE_PRODUCTS.find((entry) => entry.productId === transaction.productId)
  if (!product || transaction.bundleId !== APPLE_BUNDLE_ID || transaction.type !== Type.AUTO_RENEWABLE_SUBSCRIPTION ||
      transaction.inAppOwnershipType !== InAppOwnershipType.PURCHASED || transaction.quantity !== 1 ||
      !transaction.originalTransactionId || !transaction.transactionId || !transaction.appAccountToken ||
      ![Environment.PRODUCTION, Environment.SANDBOX].includes(transaction.environment as Environment) ||
      renewal.environment !== transaction.environment || renewal.originalTransactionId !== transaction.originalTransactionId ||
      (renewal.appAccountToken && renewal.appAccountToken.toLowerCase() !== transaction.appAccountToken.toLowerCase()) ||
      ![0, 1].includes(renewal.autoRenewStatus ?? -1) || ![1, 2, 3, 4, 5].includes(status) || transaction.isUpgraded) {
    throw new AppleBillingError('invalid_purchase', 'This is not a supported Kivilo subscription.')
  }
  const revoked = transaction.revocationDate != null || status === Status.REVOKED
  const expiresAt = new Date(status === Status.BILLING_GRACE_PERIOD ? renewal.gracePeriodExpiresDate! : transaction.expiresDate!)
  if (!Number.isFinite(expiresAt.getTime())) throw new AppleBillingError('invalid_purchase', 'The subscription has no valid expiry.')
  const autoRenewing = renewal.autoRenewStatus === 1
  const state = revoked ? 'APPLE_REVOKED' : status === Status.ACTIVE ? autoRenewing ? 'APPLE_ACTIVE' : 'APPLE_CANCELED'
    : status === Status.BILLING_GRACE_PERIOD ? 'APPLE_GRACE_PERIOD' : status === Status.BILLING_RETRY ? 'APPLE_BILLING_RETRY' : 'APPLE_EXPIRED'
  return { product, accountId: transaction.appAccountToken.toLowerCase(), originalTransactionId: transaction.originalTransactionId,
    transactionId: transaction.transactionId, environment: transaction.environment, state, expiresAt, autoRenewing }
}

// Re-fetch inside the workspace lock, including for notifications and old restore
// receipts. Their event date and embedded entitlement never overwrite current state.
export async function readAppleSubscription(originalTransactionId: string, environment: Environment) {
  try {
    const response = await client(environment).getAllSubscriptionStatuses(originalTransactionId)
    if (response.bundleId !== APPLE_BUNDLE_ID || response.environment !== environment) {
      throw new AppleBillingError('invalid_purchase', 'This is not a Kivilo subscription.')
    }
    if (!response.data || response.data.some((group) => !group.lastTransactions)) {
      throw new AppleBillingError('invalid_purchase', 'The App Store returned no subscription history.')
    }
    const lines = response.data.flatMap((group) => group.lastTransactions!)
    const line = lines.find((entry) => entry.originalTransactionId === originalTransactionId)
    if (!line?.signedTransactionInfo || !line.signedRenewalInfo || !line.status) {
      throw new AppleBillingError('invalid_purchase', 'The App Store could not find this subscription.')
    }
    const verification = verifier(environment)
    const [transaction, renewal] = await Promise.all([
      verification.verifyAndDecodeTransaction(line.signedTransactionInfo),
      verification.verifyAndDecodeRenewalInfo(line.signedRenewalInfo),
    ])
    if (transaction.originalTransactionId !== originalTransactionId) throw new AppleBillingError('invalid_purchase', 'Invalid subscription history.')
    return appleSubscriptionState(transaction, renewal, line.status)
  } catch (error) {
    if (error instanceof AppleBillingError) throw error
    // SDK errors can include signed transactions. The route only receives safe text.
    throw new AppleBillingError('billing_unavailable', 'The App Store could not confirm your subscription. Please try again.')
  }
}
