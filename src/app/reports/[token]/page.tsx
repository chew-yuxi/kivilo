import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { db } from '@/lib/db'
import { reportInclude } from '@/lib/report'
import { ReportDocument } from '@/components/report-document'

export const dynamic = 'force-dynamic'

/// The token is the credential, so the page must never be indexed or cached by an
/// intermediary. A condition report names both parties and their unit.
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
}

export default async function ReportPage({ params }: PageProps<'/reports/[token]'>) {
  const { token } = await params

  const inspection = await db.inspection.findUnique({
    where: { shareToken: token },
    include: reportInclude,
  })

  // An unknown or revoked token is indistinguishable from a report that never existed.
  if (!inspection) notFound()

  return <ReportDocument inspection={inspection} pdfHref={`/reports/${token}/pdf`} />
}
