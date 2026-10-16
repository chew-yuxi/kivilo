import { db } from '@/lib/db'
import { propertyLabel } from '@/lib/format'
import { storedReportPdf } from '@/lib/report-pdf/render'
import { downloadCapture } from '@/lib/storage'
import { sendSignatureRequest, sendSignedCopy } from '@/lib/email'
import { MAX_ATTEMPTS } from '@/lib/report-email'

/// Resend refuses a message over 40 MB, counted after base64, which grows a file by a
/// third: an attachment of 30 MB already reaches 40 MB before the body and headers. 25 MB
/// encodes to about 33 MB, leaving room for those. A PDF past it is linked instead of
/// attached, rather than failing every retry until the row is given up on.
export const MAX_ATTACHMENT_BYTES = 25_000_000

/// The origin signing links point at. A cron run has no request worth trusting for it.
function appUrl() {
  const url = process.env.KIVILO_APP_URL
  if (!url) throw new Error('KIVILO_APP_URL must be set')
  return url
}

/// Delivers what is due. Requests whose party has signed since, or whose report is no
/// longer awaiting signature, are withdrawn rather than sent.
export async function deliverReportEmails(limit = 20) {
  const due = await db.reportEmail.findMany({
    where: {
      sentAt: null,
      attempts: { lt: MAX_ATTEMPTS },
      retryAt: { lte: new Date() },
      recipient: {
        email: { not: null },
        deletionRequests: { none: { status: { in: ['PROCESSING', 'COMPLETED'] } } },
      },
    },
    include: {
      recipient: true,
      inspection: {
        include: {
          tenancy: { include: { property: true, agent: { include: { branding: true } } } },
          conductedBy: { include: { branding: true } },
          signatures: { orderBy: { signedAt: 'asc' }, include: { stakeholder: true } },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
  })

  // Three recipients share one report, so it is fetched once per run. Null when it is
  // too large to attach.
  const pdfs = new Map<string, Promise<{ filename: string; content: Buffer } | null>>()
  const pdfFor = (inspectionId: string) => {
    if (!pdfs.has(inspectionId)) {
      pdfs.set(inspectionId, storedReportPdf(inspectionId).then(async (stored) => {
        if (!stored) throw new Error('Report is not countersigned')
        const content = Buffer.from(await downloadCapture(stored.path))
        return content.byteLength > MAX_ATTACHMENT_BYTES ? null : { filename: stored.filename, content }
      }))
    }
    return pdfs.get(inspectionId)!
  }

  let sent = 0
  let withdrawn = 0
  const failed: string[] = []
  for (const row of due) {
    const { inspection, recipient } = row
    const { tenancy } = inspection
    const to = recipient.email!
    const reportKind = inspection.kind === 'CHECK_OUT' ? 'Check-out' as const : 'Check-in' as const
    const address = propertyLabel(tenancy.property)
    try {
      if (row.kind === 'SIGNATURE_REQUEST') {
        const role = recipient.id === tenancy.landlordId ? 'landlord' as const
          : recipient.id === tenancy.tenantId ? 'tenant' as const : null
        if (
          inspection.status !== 'AWAITING_SIGNATURE' || !role ||
          inspection.signatures.some((signature) => signature.stakeholderId === recipient.id)
        ) {
          await db.reportEmail.delete({ where: { id: row.id } })
          withdrawn += 1
          continue
        }
        const agent = tenancy.agent ?? inspection.conductedBy
        const link = new URL(`/sign/${inspection.id}`, appUrl())
        link.searchParams.set('email', to)
        await sendSignatureRequest(to, {
          id: row.id,
          recipientName: recipient.name,
          role,
          reportKind,
          address,
          from: agent
            ? agent.branding ? `${agent.name} of ${agent.branding.agencyName}` : agent.name
            : 'Your agent',
          link: link.toString(),
        })
      } else {
        // Too large to attach: a link to where the recipient can download it once signed
        // in, which for a party is the signing page and for the agent the inspection.
        const party = recipient.id === tenancy.landlordId || recipient.id === tenancy.tenantId
        const link = new URL(party ? `/sign/${inspection.id}` : `/inspections/${inspection.id}`, appUrl())
        link.searchParams.set('email', to)
        await sendSignedCopy(to, {
          id: row.id,
          recipientName: recipient.name,
          reportKind,
          address,
          signatures: inspection.signatures.map((signature) => ({
            name: signature.stakeholder.name,
            role: signature.stakeholderId === tenancy.landlordId ? 'Landlord' : 'Tenant',
            signedAt: signature.signedAt,
          })),
        }, (await pdfFor(inspection.id)) ?? { link: link.toString() })
      }
      await db.reportEmail.update({
        where: { id: row.id },
        data: { emailTo: to, sentAt: new Date(), attempts: { increment: 1 }, error: null },
      })
      sent += 1
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      await db.reportEmail.update({
        where: { id: row.id },
        data: {
          emailTo: to,
          attempts: { increment: 1 },
          error: message.slice(0, 1000),
          retryAt: new Date(Date.now() + 2 ** row.attempts * 60_000),
        },
      })
      failed.push(row.id)
    }
  }
  return { attempted: due.length, sent, withdrawn, failed }
}
