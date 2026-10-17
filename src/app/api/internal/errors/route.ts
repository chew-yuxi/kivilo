import { alertNewErrors } from '@/lib/errors'
import { pruneProductEvents } from '@/lib/product-events'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }
  const [errors, usage] = await Promise.all([alertNewErrors(), pruneProductEvents()])
  return Response.json({ ...errors, usagePruned: usage.count })
}
