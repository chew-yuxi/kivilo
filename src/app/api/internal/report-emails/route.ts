import { deliverReportEmails } from '@/lib/report-email-delivery'

export const dynamic = 'force-dynamic'
/// A signed copy draws the report PDF first if no stored copy matches, which takes a while.
export const maxDuration = 300

/// Every minute, because a party at the handover is waiting for "please sign" to arrive.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }
  const result = await deliverReportEmails()
  return Response.json(result, { status: result.failed.length ? 503 : 200 })
}
