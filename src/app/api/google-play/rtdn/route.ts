import { z } from 'zod'
import { GOOGLE_PLAY_PACKAGE_NAME, verifyGooglePlayNotification } from '@/lib/google-play'
import { PlayBillingError } from '@/lib/play-billing-errors'
import { reconcilePlayPurchase } from '@/lib/play-billing'

export const runtime = 'nodejs'
const envelope = z.object({ message: z.object({ data: z.string().min(1).max(32_000), messageId: z.string().optional() }) })
const notification = z.object({
  packageName: z.string(),
  subscriptionNotification: z.object({ purchaseToken: z.string().min(1).max(4096) }).optional(),
  voidedPurchaseNotification: z.object({ purchaseToken: z.string().min(1).max(4096), productType: z.number() }).optional(),
  testNotification: z.object({}).optional(),
})

/// Pub/Sub identity is checked before the payload is decoded. Redelivery is safe: the
/// service fetches the current subscription; notification types never set entitlement.
export async function POST(request: Request) {
  if (!await verifyGooglePlayNotification(request)) return Response.json({ error: 'unauthorized' }, { status: 401 })
  const outer = envelope.safeParse(await request.json().catch(() => null))
  if (!outer.success) return Response.json({ error: 'invalid_notification' }, { status: 400 })
  let decoded: unknown
  try { decoded = JSON.parse(Buffer.from(outer.data.message.data, 'base64').toString('utf8')) }
  catch { return Response.json({ error: 'invalid_notification' }, { status: 400 }) }
  const parsed = notification.safeParse(decoded)
  if (!parsed.success) return Response.json({ error: 'invalid_notification' }, { status: 400 })
  if (parsed.data.packageName !== GOOGLE_PLAY_PACKAGE_NAME) return Response.json({ received: true })
  const token = parsed.data.subscriptionNotification?.purchaseToken ??
    (parsed.data.voidedPurchaseNotification?.productType === 1 ? parsed.data.voidedPurchaseNotification.purchaseToken : null)
  if (token) {
    try { await reconcilePlayPurchase(token) }
    catch (error) {
      // A completed rejection refund is fully processed. Retrying it forever would
      // hide real delivery failures; incomplete refunds still return 503.
      if (!(error instanceof PlayBillingError && error.notificationHandled)) {
        return Response.json({ error: 'verification_failed' }, { status: 503 })
      }
    }
  }
  return Response.json({ received: true })
}
