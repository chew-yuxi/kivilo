import { refreshSanctionsLists } from '@/lib/screening/lists'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/// Daily. A failed source throws after the others are stored, so error tracking emails
/// the alert: screening keeps using the last good version, but someone must know.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }
  const results = await refreshSanctionsLists()
  const failed = results.filter((result) => 'error' in result)
  if (failed.length) {
    throw new Error(`Sanctions list refresh failed: ${failed.map((result) => `${result.source} ${'error' in result ? result.error : ''}`).join('; ')}`)
  }
  return Response.json(results)
}
