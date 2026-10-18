import { db } from '@/lib/db'
import { activeNotificationRecipients } from '@/lib/notification-recipients'
import type { Prisma } from '@/generated/prisma'

/// The report emails: "please review and sign" when a report is sent for signature, and
/// the tenant's handover after their signature, and the signed PDF when the second
/// signature lands. They are written to the ReportEmail
/// outbox inside the transaction that calls for them and delivered by
/// `/api/internal/report-emails` (`report-email-delivery.ts`, kept apart so the server
/// actions do not load the PDF renderer). A mail outage can delay an email but never
/// fail Send or a signature, and a committed Send can never lose its email.

/// Ten tries, waiting 1, 2, 4 ... 256 minutes between them: about eight and a half hours
/// before a row is given up on.
export const MAX_ATTEMPTS = 10

/// Queues a signing request to each of `partyIds` who has an email, has not signed, is
/// not deleting their account, and has no request already waiting to go. Send calls it
/// for both parties; the agent's resend for one.
export async function queueSignatureRequests(
  tx: Prisma.TransactionClient,
  inspectionId: string,
  partyIds: string[],
) {
  const people = await tx.stakeholder.findMany({
    where: {
      id: { in: partyIds },
      email: { not: null },
      signatures: { none: { inspectionId } },
      reportEmails: {
        none: { inspectionId, kind: 'SIGNATURE_REQUEST', sentAt: null, attempts: { lt: MAX_ATTEMPTS } },
      },
    },
    select: { id: true },
  })
  const recipients = await activeNotificationRecipients(tx, people.map((person) => person.id))
  await tx.reportEmail.createMany({
    data: recipients.map((recipientId) => ({ inspectionId, recipientId, kind: 'SIGNATURE_REQUEST' as const })),
  })
}

/// Queues the signed PDF to the landlord, the tenant and the agent who conducted the
/// inspection, once each however many times completion is retried.
export async function queueSignedCopies(tx: Prisma.TransactionClient, inspectionId: string) {
  const inspection = await tx.inspection.findUniqueOrThrow({
    where: { id: inspectionId },
    select: {
      conductedById: true,
      tenancy: { select: { landlordId: true, tenantId: true, agentId: true } },
    },
  })
  const { tenancy } = inspection
  const agentId = inspection.conductedById ?? tenancy.agentId
  const ids = [tenancy.landlordId, tenancy.tenantId, ...(agentId ? [agentId] : [])]
  const withEmail = await tx.stakeholder.findMany({
    where: { id: { in: ids }, email: { not: null } },
    select: { id: true },
  })
  const recipients = await activeNotificationRecipients(tx, withEmail.map((person) => person.id))
  await tx.reportEmail.createMany({
    data: recipients.map((recipientId) => ({
      inspectionId,
      recipientId,
      kind: 'SIGNED_COPY' as const,
      dedupeKey: `signed-copy:${inspectionId}:${recipientId}`,
    })),
    skipDuplicates: true,
  })
}

/// A tenant who signs gets their own handover link and move-in deadline immediately,
/// including when the landlord has not signed yet. The signed PDF follows separately
/// on countersignature. The row is made in the signature's transaction, once only.
export async function queueTenantHandover(tx: Prisma.TransactionClient, inspectionId: string) {
  const inspection = await tx.inspection.findUniqueOrThrow({
    where: { id: inspectionId },
    select: {
      kind: true,
      tenancy: { select: { tenantId: true, tenant: { select: { email: true } } } },
      signatures: { select: { stakeholderId: true } },
    },
  })
  const { tenantId, tenant } = inspection.tenancy
  if (
    inspection.kind !== 'CHECK_IN' || !tenant.email ||
    !inspection.signatures.some((signature) => signature.stakeholderId === tenantId)
  ) return
  const recipients = await activeNotificationRecipients(tx, [tenantId])
  await tx.reportEmail.createMany({
    data: recipients.map((recipientId) => ({
      inspectionId,
      recipientId,
      kind: 'TENANT_HANDOVER' as const,
      dedupeKey: `tenant-handover:${inspectionId}:${recipientId}`,
    })),
    skipDuplicates: true,
  })
}

export type SigningEmailState = 'QUEUED' | 'SENT' | 'FAILED'

/// Where each party stands: signed, emailed, or with no address to email. What the
/// agent sees beside each signature on the web and in the app.
export async function signingParties(inspectionId: string) {
  const inspection = await db.inspection.findUniqueOrThrow({
    where: { id: inspectionId },
    select: {
      tenancy: { select: { landlord: true, tenant: true } },
      signatures: { select: { stakeholderId: true, signedAt: true } },
      reportEmails: {
        where: { kind: 'SIGNATURE_REQUEST' },
        orderBy: { createdAt: 'desc' },
        select: { recipientId: true, createdAt: true, sentAt: true, attempts: true },
      },
    },
  })
  const parties = [
    { role: 'LANDLORD' as const, person: inspection.tenancy.landlord },
    { role: 'TENANT' as const, person: inspection.tenancy.tenant },
  ]
  return parties.map(({ role, person }) => {
    const latest = inspection.reportEmails.find((row) => row.recipientId === person.id)
    const email: { state: SigningEmailState; at: Date } | null = !latest
      ? null
      : latest.sentAt
        ? { state: 'SENT', at: latest.sentAt }
        : latest.attempts >= MAX_ATTEMPTS
          ? { state: 'FAILED', at: latest.createdAt }
          : { state: 'QUEUED', at: latest.createdAt }
    return {
      stakeholderId: person.id,
      role,
      name: person.name,
      email: person.email,
      signedAt: inspection.signatures.find((row) => row.stakeholderId === person.id)?.signedAt ?? null,
      signingEmail: email,
    }
  })
}
