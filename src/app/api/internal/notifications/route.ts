import { deliverNotificationOutbox } from '@/lib/notification-outbox'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }
  const result = await deliverNotificationOutbox()
  return Response.json(result, {
    status: result.email.failed.length || result.push.failed.length ? 503 : 200,
  })
}
