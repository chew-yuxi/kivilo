import { Environment, NotificationTypeV2 } from '@apple/app-store-server-library'
import { z } from 'zod'
import { AppleBillingError } from '@/lib/apple-billing-errors'
import { reconcileApplePurchase } from '@/lib/apple-billing'
import { verifyAppleNotification, verifyAppleTransaction } from '@/lib/apple-store'
import { recordServerError } from '@/lib/errors'

export const runtime = 'nodejs'
export const maxDuration = 60
const input = z.object({ signedPayload: z.string().min(1).max(100000) })

export async function POST(request: Request) {
  try {
    const { signedPayload } = input.parse(await request.json())
    const notification = await verifyAppleNotification(signedPayload)
    if (notification.notificationType === NotificationTypeV2.TEST) return Response.json({ received: true })
    if (notification.data?.signedTransactionInfo) {
      const transaction = await verifyAppleTransaction(notification.data.signedTransactionInfo)
      if (!transaction.originalTransactionId || transaction.environment !== notification.data.environment) {
        return Response.json({ error: 'invalid_notification' }, { status: 400 })
      }
      await reconcileApplePurchase(transaction.originalTransactionId, transaction.environment as Environment)
    }
    return Response.json({ received: true })
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError ||
        (error instanceof AppleBillingError && error.code === 'invalid_purchase')) {
      return Response.json({ error: 'invalid_notification' }, { status: 400 })
    }
    // Apple retries delivery. Provider errors are already converted to safe text;
    // do not attach the signed payload to the operational failure report.
    await recordServerError(error, { context: 'apple_notification', path: '/api/apple/notifications', userAgent: null })
    return Response.json({ error: 'verification_unavailable' }, { status: 503 })
  }
}
