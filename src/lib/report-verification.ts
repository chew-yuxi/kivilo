import { db } from '@/lib/db'
import { propertyLabel } from '@/lib/format'
import { shortFingerprint } from '@/lib/report-fingerprint'

const when = new Intl.DateTimeFormat('en-SG', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Asia/Singapore' })

/// What a check of a report PDF can say, given the SHA-256 of its bytes, computed in the
/// checker's browser so the file itself never leaves their device. Holding the hash means
/// holding the file, so a match says only what that file already says: the property, the
/// parties who signed and when, and the fingerprint printed beside each signature. An
/// unknown hash and a file we never issued are the same answer.
export async function verifyReportFile(sha256: string) {
  const issued = await db.issuedReportFile.findUnique({
    where: { sha256 },
    include: {
      inspection: {
        include: {
          tenancy: { include: { property: true } },
          signatures: { include: { stakeholder: true }, orderBy: { signedAt: 'asc' } },
        },
      },
    },
  })
  if (!issued) return null

  const { inspection } = issued
  const { tenancy } = inspection
  // A later copy means the report has had something added since, such as an update
  // both parties acknowledged. This copy is still genuine, just not the latest.
  const newer = await db.issuedReportFile.findFirst({
    where: { inspectionId: inspection.id, issuedAt: { gt: issued.issuedAt } },
    orderBy: { issuedAt: 'desc' },
    select: { issuedAt: true },
  })

  return {
    kind: inspection.kind === 'CHECK_OUT' ? 'Check-out report' : 'Check-in report',
    property: propertyLabel(tenancy.property),
    issuedAt: when.format(issued.issuedAt),
    newerCopyIssuedAt: newer ? when.format(newer.issuedAt) : null,
    signatures: inspection.signatures.map((signature) => ({
      role:
        signature.stakeholderId === tenancy.landlordId
          ? 'Landlord'
          : signature.stakeholderId === tenancy.tenantId
            ? 'Tenant'
            : 'Agent',
      name: signature.stakeholder.name,
      signedAt: when.format(signature.signedAt),
      fingerprint: signature.contentHash ? shortFingerprint(signature.contentHash) : null,
    })),
  }
}

export type ReportVerification = NonNullable<Awaited<ReturnType<typeof verifyReportFile>>>
