import { sendDueReminders } from '@/lib/cdd/cases'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/// Hourly: reminds clients who have not sent their due-diligence particulars.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }
  return Response.json({ reminded: await sendDueReminders() })
}
