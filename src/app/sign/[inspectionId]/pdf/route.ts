import { currentStakeholder, signingRole } from '@/lib/auth'
import { reportPdfUrl } from '@/lib/report-pdf/render'

export const dynamic = 'force-dynamic'
/// A first download of a photo-heavy report draws it, which takes a while.
export const maxDuration = 300

/// The signed report as a file, for the landlord or tenant signed in on the signing page,
/// and where the signed-copy email links when the PDF is too large to attach. The rule is
/// the page's (`signingRole`), and `reportPdfUrl` is null until the report is
/// countersigned, so the signed-out, anyone else, a report still awaiting a signature and
/// an id that never existed all get one identical 404.
export async function GET(_request: Request, { params }: RouteContext<'/sign/[inspectionId]/pdf'>) {
  const { inspectionId } = await params
  const signer = await currentStakeholder()
  const url = signer && (await signingRole(inspectionId, signer.id)) && (await reportPdfUrl(inspectionId))
  if (!url) return new Response('Not found', { status: 404 })
  return Response.redirect(url, 303)
}
