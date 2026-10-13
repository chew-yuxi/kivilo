import { db } from '@/lib/db'
import { reportPdfUrl } from '@/lib/report-pdf/render'

export const dynamic = 'force-dynamic'
/// A first download of a photo-heavy report draws it, which takes a while.
export const maxDuration = 300

/// The shared report as a file. The token is the credential exactly as it is for the
/// page: an unknown or revoked token is the same 404 as a report that never existed.
export async function GET(_request: Request, { params }: RouteContext<'/reports/[token]/pdf'>) {
  const { token } = await params
  const inspection = await db.inspection.findUnique({ where: { shareToken: token }, select: { id: true } })
  const url = inspection && (await reportPdfUrl(inspection.id))
  if (!url) return new Response('Not found', { status: 404 })
  return Response.redirect(url, 303)
}
