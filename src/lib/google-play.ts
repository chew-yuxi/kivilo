import { JWT, OAuth2Client } from 'google-auth-library'
import { z } from 'zod'
import { GOOGLE_PLAY_PACKAGE_NAME } from '@/lib/google-play-catalog'
export { GOOGLE_PLAY_PACKAGE_NAME, GOOGLE_PLAY_BASE_PLAN_ID, GOOGLE_PLAY_PRODUCTS } from '@/lib/google-play-catalog'

// Only the fields consumed by reconciliation. The service validates the catalog,
// state, expiry and account binding before this resource can grant access.
export type GooglePlaySubscription = {
  kind?: string
  regionCode?: string
  startTime?: string
  subscriptionState?: string
  acknowledgementState?: string
  linkedPurchaseToken?: string
  testPurchase?: Record<string, unknown>
  externalAccountIdentifiers?: {
    obfuscatedExternalAccountId?: string
    obfuscatedExternalProfileId?: string
  }
  outOfAppPurchaseContext?: {
    expiredPurchaseToken?: string
    expiredExternalAccountIdentifiers?: {
      obfuscatedExternalAccountId?: string
      obfuscatedExternalProfileId?: string
    }
  }
  canceledStateContext?: {
    replacementCancellation?: Record<string, unknown>
    developerInitiatedCancellation?: Record<string, unknown>
    userInitiatedCancellation?: Record<string, unknown>
    systemInitiatedCancellation?: Record<string, unknown>
  }
  lineItems?: Array<{
    productId?: string
    expiryTime?: string
    latestSuccessfulOrderId?: string
    offerDetails?: { basePlanId?: string; offerId?: string; offerTags?: string[] }
    autoRenewingPlan?: {
      autoRenewEnabled?: boolean
      installmentDetails?: Record<string, unknown>
      recurringPrice?: { currencyCode?: string; units?: string; nanos?: number }
    }
    prepaidPlan?: Record<string, unknown>
    deferredItemReplacement?: { productId?: string }
    deferredItemRemoval?: Record<string, unknown>
  }>
}

const credentialSchema = z.object({
  type: z.literal('service_account'),
  client_email: z.email(),
  private_key: z.string().min(1),
})
const apiBase = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${GOOGLE_PLAY_PACKAGE_NAME}`
const oidc = new OAuth2Client()

// Deployment enables sales only after both the catalog and authenticated RTDN are
// configured. Existing purchases keep reconciling if sales are switched off later.
export function playBillingOpen() {
  return process.env.GOOGLE_PLAY_BILLING_ENABLED === 'true' &&
    !!process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON &&
    /^https:\/\//.test(process.env.GOOGLE_PLAY_RTDN_AUDIENCE ?? '') &&
    /@[^@]+\.iam\.gserviceaccount\.com$/.test(process.env.GOOGLE_PLAY_RTDN_SERVICE_ACCOUNT_EMAIL ?? '')
}

// Never propagate a Google SDK error: its request includes a bearer credential and
// a purchase token in the URL, and our error reporter persists thrown exceptions.
export class GooglePlayApiError extends Error {
  constructor(readonly operation: 'read' | 'acknowledge' | 'cancel' | 'revoke', readonly status?: number) {
    super(`Google Play ${operation} failed${status ? ` (HTTP ${status})` : ''}`)
    this.name = 'GooglePlayApiError'
  }
}

export function googlePlay() {
  let credentials: z.infer<typeof credentialSchema>
  try {
    credentials = credentialSchema.parse(JSON.parse(process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON ?? ''))
  } catch {
    throw new Error('Google Play service account is not configured')
  }
  // Explicitly construct a service-account client, rather than accepting arbitrary
  // credential types/URLs from JSON. This credential remains server-side only.
  const client = new JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ['https://www.googleapis.com/auth/androidpublisher'],
  })

  async function request<T>(operation: 'read' | 'acknowledge' | 'cancel' | 'revoke', path: string, data?: object) {
    try {
      const response = await client.request<T>({
        url: `${apiBase}${path}`,
        method: data ? 'POST' : 'GET',
        ...(data ? { data } : {}),
        timeout: 15_000,
      })
      return response.data
    } catch (error) {
      const status = (error as { response?: { status?: unknown } })?.response?.status
      throw new GooglePlayApiError(operation, typeof status === 'number' ? status : undefined)
    }
  }
  return {
    getSubscription: (token: string) => request<GooglePlaySubscription>(
      'read', `/purchases/subscriptionsv2/tokens/${encodeURIComponent(token)}`,
    ),
    acknowledgeSubscription: (productId: string, token: string) => request<void>(
      'acknowledge', `/purchases/subscriptions/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(token)}:acknowledge`, {},
    ),
    // Account erasure must stop future charges and prevent restoration of that
    // deleted account's subscription. Paid access otherwise lasts until expiry.
    cancelSubscription: (token: string) => request<void>(
      'cancel', `/purchases/subscriptionsv2/tokens/${encodeURIComponent(token)}:cancel`,
      { cancellationContext: { cancellationType: 'DEVELOPER_REQUESTED_STOP_PAYMENTS' } },
    ),
    // Only the reconciliation service's durable rejection path calls this: a
    // verified new purchase that we cannot fulfill must not keep the buyer's money.
    revokeSubscription: (token: string) => request<void>(
      'revoke', `/purchases/subscriptionsv2/tokens/${encodeURIComponent(token)}:revoke`,
      { revocationContext: { fullRefund: {} } },
    ),
  }
}

export async function verifyGooglePlayNotification(request: Request): Promise<boolean> {
  const audience = process.env.GOOGLE_PLAY_RTDN_AUDIENCE
  const email = process.env.GOOGLE_PLAY_RTDN_SERVICE_ACCOUNT_EMAIL
  if (!audience || !email) throw new Error('Google Play notification authentication is not configured')
  const token = /^Bearer ([^\s]+)$/i.exec(request.headers.get('authorization') ?? '')?.[1]
  if (!token) return false
  try {
    const ticket = await oidc.verifyIdToken({ idToken: token, audience })
    const payload = ticket.getPayload()
    return payload?.email === email && payload.email_verified === true
  } catch {
    // Invalid, expired or unverifiable credentials never authenticate a push. No
    // token or provider error is returned/logged; Pub/Sub retries failed deliveries.
    return false
  }
}
