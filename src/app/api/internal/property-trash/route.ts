import { emptyExpiredPropertyTrash } from '@/lib/property-trash'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }
  const result = await emptyExpiredPropertyTrash()
  return Response.json(result, { status: result.failed.length ? 503 : 200 })
}
