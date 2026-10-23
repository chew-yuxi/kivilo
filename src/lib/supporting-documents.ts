import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { actsAsAgent, supportingDocumentTenancies } from '@/lib/auth'
import { lockAgencyTenancy } from '@/lib/agency'
import { propertyLabel } from '@/lib/format'
import { activeNotificationRecipients } from '@/lib/notification-recipients'
import { CAPTURE_BUCKET, captureExists, createDownloadUrl, createUploadUrl, serviceClient } from '@/lib/storage'
import { SupportingDocumentError } from '@/lib/supporting-documents-errors'
import { fieldChanges, recordEvent } from '@/lib/property-history'
import {
  SUPPORTING_DOCUMENT_MAX_BYTES, supportingDocumentRequestInput, supportingDocumentUploadInput,
  agreementTermsInput, confirmedAgreementTermsSchema,
  type AgreementAnalysis, type MaintenanceTermsView, type SupportingDocumentUploadInput, type SupportingDocumentsWorkspace,
} from '@/lib/supporting-documents-schema'
import { Prisma, type SupportingDocumentFile } from '@/generated/prisma'

const extension = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' } as const

async function authorizedTenancy(tenancyId: string, actorId: string, client: Prisma.TransactionClient = db) {
  const tenancy = await client.tenancy.findFirst({
    where: { id: tenancyId, AND: [supportingDocumentTenancies(actorId)] },
    include: { property: true },
  })
  if (!tenancy) throw new Error('Tenancy not found')
  return tenancy
}

async function withTenancy<T>(tenancyId: string, actorId: string, action: (tx: Prisma.TransactionClient, tenancy: Awaited<ReturnType<typeof authorizedTenancy>>) => Promise<T>) {
  await authorizedTenancy(tenancyId, actorId)
  return db.$transaction(async (tx) => {
    await lockAgencyTenancy(tenancyId, tx)
    // Authentication is memoized for the request. An in-flight request must not
    // recreate sole-party paperwork after account deletion has swept this tenancy.
    if (await tx.accountDeletionRequest.findFirst({
      where: { stakeholderId: actorId, status: { in: ['PROCESSING', 'COMPLETED'] } }, select: { id: true },
    })) throw new Error('Tenancy not found')
    return action(tx, await authorizedTenancy(tenancyId, actorId, tx))
  }, { timeout: 30_000 })
}

export async function supportingDocumentsWorkspace(tenancyId: string, actorId: string): Promise<SupportingDocumentsWorkspace> {
  const tenancy = await db.tenancy.findFirst({
    where: { id: tenancyId, AND: [supportingDocumentTenancies(actorId)] },
    include: {
      property: true,
      tenant: { select: { name: true } },
      supportingDocumentRequests: {
        orderBy: [{ requestedAt: 'desc' }, { id: 'desc' }],
        include: {
          requestedBy: { select: { id: true, name: true } },
          files: {
            where: { submittedAt: { not: null } },
            orderBy: [{ submittedAt: 'asc' }, { id: 'asc' }],
            include: { submittedBy: { select: { id: true, name: true } } },
          },
        },
      },
    },
  })
  if (!tenancy) throw new Error('Tenancy not found')
  const canRequest = Boolean(await db.tenancy.findFirst({ where: { id: tenancyId, AND: [actsAsAgent(actorId)] }, select: { id: true } }))
  const agreement = tenancy.supportingDocumentRequests.find((request) => request.kind === 'TENANCY_AGREEMENT')
  const agreementFiles = agreement ? [...agreement.files].reverse() : []
  const confirmedTerms = tenancy.minorRepairClause ? confirmedAgreementTermsSchema.parse(tenancy.minorRepairClause) : null
  const terms = confirmedTerms ? {
    ...confirmedTerms, sourceFileName: agreementFiles.find((file) => file.id === confirmedTerms.fileId)?.fileName ?? null,
  } : null
  const fileView = (file: typeof tenancy.supportingDocumentRequests[number]['files'][number]) => ({
    id: file.id, clientId: file.clientId, fileName: file.fileName, mimeType: file.mimeType,
    byteSize: file.byteSize, submittedAt: file.submittedAt!.toISOString(), submittedBy: file.submittedBy,
  })
  return {
    tenancyId,
    propertyLabel: propertyLabel(tenancy.property),
    tenantName: tenancy.tenant.name,
    startDate: tenancy.startDate.toISOString(),
    endDate: tenancy.endDate.toISOString(),
    role: tenancy.tenantId === actorId ? 'tenant' : tenancy.landlordId === actorId ? 'landlord' : 'agent',
    canRequest,
    canUpload: tenancy.tenantId === actorId,
    currentMinorRepairCap: tenancy.minorRepairCap?.toString() ?? null,
    agreement: {
      requestId: agreement?.id ?? null,
      files: agreementFiles.map(fileView),
      currentFileId: agreementFiles[0]?.id ?? null,
      canUpload: true,
      canReview: tenancy.landlordId === actorId || canRequest,
      terms,
      termsMatchCurrentFile: Boolean(terms && terms.fileId === agreementFiles[0]?.id),
    },
    requests: tenancy.supportingDocumentRequests.filter((request) => request.kind === 'SUPPORTING').map((request) => ({
      id: request.id, title: request.title, requestedAt: request.requestedAt.toISOString(), requestedBy: request.requestedBy,
      canUpload: tenancy.tenantId === actorId,
      files: request.files.map(fileView),
    })),
  }
}

export async function requestSupportingDocument(tenancyId: string, actorId: string, raw: unknown) {
  await withTenancy(tenancyId, actorId, async (tx, tenancy) => {
    if (!await tx.tenancy.findFirst({ where: { id: tenancyId, AND: [actsAsAgent(actorId)] }, select: { id: true } })) throw new Error('Tenancy not found')
    const input = supportingDocumentRequestInput.parse(raw)
    const existing = await tx.supportingDocumentRequest.findUnique({ where: { tenancyId_clientId: { tenancyId, clientId: input.clientId } } })
    if (existing) {
      if (existing.requestedById !== actorId) throw new Error('Document request not found')
      if (existing.title !== input.title) throw new SupportingDocumentError('document_conflict', 'This request was already saved with a different title.')
      return
    }
    const request = await tx.supportingDocumentRequest.create({ data: { ...input, tenancyId, requestedById: actorId } })
    await recordEvent(tx, {
      propertyId: tenancy.propertyId, tenancyId, inspectionId: null, actorId,
      kind: 'SUPPORTING_DOCUMENT_REQUESTED', summary: 'requested a supporting document',
    })
    if ((await activeNotificationRecipients(tx, [tenancy.tenantId])).length) await tx.notification.create({ data: {
      recipientId: tenancy.tenantId, tenancyId, kind: 'SUPPORTING_DOCUMENT_REQUESTED',
      title: 'Supporting document requested',
      body: `${input.title} was requested for ${propertyLabel(tenancy.property)}. You can upload it in Kivilo. This does not hold up signing.`,
      href: `/tenancies/${tenancyId}/documents?requestId=${request.id}`, dedupeKey: `supporting-document-request:${request.id}`,
    } })
  })
  revalidatePath(`/tenancies/${tenancyId}/documents`)
  return supportingDocumentsWorkspace(tenancyId, actorId)
}

async function uploadRequest(tx: Prisma.TransactionClient, tenancyId: string, requestId: string, actorId: string, tenantId: string) {
  const request = await tx.supportingDocumentRequest.findFirst({ where: { id: requestId, tenancyId } })
  if (!request) throw new Error('Document request not found')
  if (request.kind === 'SUPPORTING' && tenantId !== actorId) throw new Error('Document request not found')
  return request
}

function sameUpload(file: SupportingDocumentFile, requestId: string, actorId: string, input: SupportingDocumentUploadInput) {
  if (file.requestId !== requestId || file.submittedById !== actorId) throw new Error('Document file not found')
  if (file.fileName !== input.fileName || file.mimeType !== input.mimeType || file.byteSize !== input.byteSize) {
    throw new SupportingDocumentError('document_conflict', 'This upload was already started with different file details.')
  }
}

export async function requestSupportingDocumentUpload(tenancyId: string, requestId: string, actorId: string, raw: unknown) {
  return withTenancy(tenancyId, actorId, async (tx, tenancy) => {
    await uploadRequest(tx, tenancyId, requestId, actorId, tenancy.tenantId)
    const input = supportingDocumentUploadInput.parse(raw)
    let file = await tx.supportingDocumentFile.findUnique({ where: { clientId: input.clientId } })
    if (file) sameUpload(file, requestId, actorId, input)
    else file = await tx.supportingDocumentFile.create({ data: {
      ...input, requestId, submittedById: actorId,
      storagePath: `supporting-documents/${tenancyId}/${requestId}/${input.clientId}.${extension[input.mimeType]}`,
    } })
    if (file.submittedAt) return { storagePath: file.storagePath, alreadyUploaded: true, alreadyRegistered: true, fileId: file.id }
    if (await captureExists(file.storagePath)) return { storagePath: file.storagePath, alreadyUploaded: true }
    const { signedUrl, token } = await createUploadUrl(file.storagePath)
    return { storagePath: file.storagePath, signedUrl, token }
  })
}

/// MIME headers and supplied filenames cannot prove that an uploaded file is safe to
/// serve. Restrict both stored metadata and the original file signature, and always
/// serve it as an attachment. No document bytes enter a report or report fingerprint.
export function supportingDocumentMagicMatches(bytes: Uint8Array, mimeType: string) {
  const starts = (signature: number[], offset = 0) => signature.every((byte, index) => bytes[offset + index] === byte)
  if (mimeType === 'application/pdf') return starts([0x25, 0x50, 0x44, 0x46, 0x2d])
  if (mimeType === 'image/jpeg') return starts([0xff, 0xd8, 0xff])
  if (mimeType === 'image/png') return starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  if (mimeType === 'image/webp') return starts([0x52, 0x49, 0x46, 0x46]) && starts([0x57, 0x45, 0x42, 0x50], 8)
  return false
}

async function verifyStoredFile(file: SupportingDocumentFile) {
  if (!await captureExists(file.storagePath)) throw new SupportingDocumentError('document_missing', 'The document has not reached storage. Retry the upload.')
  const storage = serviceClient().storage.from(CAPTURE_BUCKET)
  const info = await storage.info(file.storagePath)
  if (info.error) throw info.error
  // Reject an oversized object before downloading it into the serverless process.
  if (info.data.size !== file.byteSize || info.data.size > SUPPORTING_DOCUMENT_MAX_BYTES || info.data.contentType !== file.mimeType) {
    throw new SupportingDocumentError('invalid_document', 'The stored file does not match its size or file type. Choose the file again.')
  }
  const download = await storage.download(file.storagePath)
  if (download.error) throw download.error
  const bytes = new Uint8Array(await download.data.arrayBuffer())
  if (bytes.length !== file.byteSize || !supportingDocumentMagicMatches(bytes, file.mimeType)) {
    throw new SupportingDocumentError('invalid_document', 'Choose a PDF, JPEG, PNG or WebP file with matching file contents.')
  }
}

export async function registerSupportingDocumentFile(tenancyId: string, requestId: string, actorId: string, raw: unknown) {
  const id = await withTenancy(tenancyId, actorId, async (tx, tenancy) => {
    const request = await uploadRequest(tx, tenancyId, requestId, actorId, tenancy.tenantId)
    const input = supportingDocumentUploadInput.parse(raw)
    const file = await tx.supportingDocumentFile.findUnique({ where: { clientId: input.clientId } })
    if (!file) throw new Error('Document file not found')
    sameUpload(file, requestId, actorId, input)
    if (file.submittedAt) return file.id
    await verifyStoredFile(file)
    await tx.supportingDocumentFile.update({ where: { id: file.id }, data: { submittedAt: new Date() } })
    await recordEvent(tx, {
      propertyId: tenancy.propertyId, tenancyId, inspectionId: null, actorId,
      kind: request.kind === 'TENANCY_AGREEMENT' ? 'TENANCY_AGREEMENT_UPLOADED' : 'SUPPORTING_DOCUMENT_UPLOADED',
      summary: request.kind === 'TENANCY_AGREEMENT' ? 'uploaded a tenancy agreement' : 'submitted a supporting document',
    })
    // A requester may have left the tenancy since asking. Do not rebuild their inbox.
    if (request.kind === 'SUPPORTING' && await tx.tenancy.findFirst({ where: { id: tenancyId, AND: [actsAsAgent(request.requestedById)] }, select: { id: true } }) &&
        (await activeNotificationRecipients(tx, [request.requestedById])).length) await tx.notification.create({ data: {
      recipientId: request.requestedById, tenancyId, kind: 'SUPPORTING_DOCUMENT_UPLOADED',
      title: 'Supporting document submitted',
      body: `${request.title} was submitted for ${propertyLabel(tenancy.property)}.`,
      href: `/tenancies/${tenancyId}/documents?requestId=${request.id}`, dedupeKey: `supporting-document-file:${file.id}`,
    } })
    return file.id
  })
  revalidatePath(`/tenancies/${tenancyId}/documents`)
  return id
}

export async function supportingDocumentDownload(tenancyId: string, requestId: string, fileId: string, actorId: string) {
  return withTenancy(tenancyId, actorId, async (tx) => {
    const file = await tx.supportingDocumentFile.findFirst({ where: { id: fileId, requestId, request: { tenancyId }, submittedAt: { not: null } } })
    if (!file) throw new Error('Document file not found')
    // Storage's attachment header double-encodes punctuation. Keep a predictable
    // download name while preserving the original name in the authenticated view.
    const stem = file.fileName.replace(/\.[^.]+$/, '').replace(/[^A-Za-z0-9 .-]/g, '-').replace(/^\.+/, '').trim() || 'Supporting document'
    return { url: await createDownloadUrl(file.storagePath, 600, `${stem}.${extension[file.mimeType as keyof typeof extension]}`) }
  })
}

/// An agreement is a permanent typed slot, not a document request to the tenant.
/// Its creation is explicit so a read never writes or sends a notification.
export async function prepareTenancyAgreement(tenancyId: string, actorId: string) {
  await withTenancy(tenancyId, actorId, async (tx) => {
    if (!await tx.supportingDocumentRequest.findFirst({ where: { tenancyId, kind: 'TENANCY_AGREEMENT' }, select: { id: true } })) {
      await tx.supportingDocumentRequest.create({ data: {
        tenancyId, clientId: randomUUID(), title: 'Tenancy agreement', kind: 'TENANCY_AGREEMENT', requestedById: actorId,
      } })
    }
  })
  revalidatePath(`/tenancies/${tenancyId}/documents`)
  return supportingDocumentsWorkspace(tenancyId, actorId)
}

export async function analyzeTenancyAgreement(tenancyId: string, fileId: string, actorId: string): Promise<AgreementAnalysis> {
  const bytes = await withTenancy(tenancyId, actorId, async (tx) => {
    const file = await tx.supportingDocumentFile.findFirst({ where: {
      id: fileId, submittedAt: { not: null }, request: { tenancyId, kind: 'TENANCY_AGREEMENT' },
    } })
    if (!file) throw new Error('Agreement file not found')
    if (file.mimeType !== 'application/pdf') return null
    const storage = serviceClient().storage.from(CAPTURE_BUCKET)
    const info = await storage.info(file.storagePath)
    if (info.error) throw info.error
    if (info.data.size !== file.byteSize || info.data.size > SUPPORTING_DOCUMENT_MAX_BYTES || info.data.contentType !== file.mimeType) {
      throw new SupportingDocumentError('invalid_document', 'The agreement file does not match its saved size or file type.')
    }
    const download = await storage.download(file.storagePath)
    if (download.error) throw download.error
    const downloaded = new Uint8Array(await download.data.arrayBuffer())
    if (downloaded.byteLength !== file.byteSize || downloaded.byteLength > SUPPORTING_DOCUMENT_MAX_BYTES) {
      throw new SupportingDocumentError('invalid_document', 'The agreement file does not match its saved size.')
    }
    return downloaded
  })
  const analysis = bytes
    ? await (await import('@/lib/agreement-clause-parser')).analyzeAgreementPdf(bytes)
    : { status: 'NO_TEXT' as const, candidates: [] }
  // A long PDF must not deliver private text after this reader's access was revoked.
  return withTenancy(tenancyId, actorId, async () => ({ fileId, ...analysis }))
}

export async function confirmTenancyAgreementTerms(tenancyId: string, actorId: string, raw: unknown) {
  await withTenancy(tenancyId, actorId, async (tx, tenancy) => {
    if (tenancy.landlordId !== actorId && !await tx.tenancy.findFirst({
      where: { id: tenancyId, AND: [actsAsAgent(actorId)] }, select: { id: true },
    })) throw new Error('Tenancy not found')
    const input = agreementTermsInput.parse(raw)
    const file = await tx.supportingDocumentFile.findFirst({
      where: { submittedAt: { not: null }, request: { tenancyId, kind: 'TENANCY_AGREEMENT' } },
      orderBy: [{ submittedAt: 'desc' }, { id: 'desc' }],
    })
    if (!file || file.id !== input.fileId) {
      throw new SupportingDocumentError('document_conflict', 'The tenancy agreement changed. Review the current agreement before confirming its terms.')
    }
    const actor = await tx.stakeholder.findUniqueOrThrow({ where: { id: actorId }, select: { id: true, name: true } })
    const tenantCap = input.tenantCap === null ? null : new Prisma.Decimal(input.tenantCap).toFixed(2)
    await tx.tenancy.update({ where: { id: tenancyId }, data: {
      minorRepairCap: tenantCap,
      minorRepairClause: {
        ...input, tenantCap, confirmedAt: new Date().toISOString(), confirmedBy: actor,
      },
    } })
    await recordEvent(tx, {
      propertyId: tenancy.propertyId, tenancyId, inspectionId: null, actorId,
      kind: 'TENANCY_TERMS_CHANGED', summary: 'confirmed maintenance terms from the tenancy agreement',
      changes: fieldChanges({ minorRepairCap: tenancy.minorRepairCap }, { minorRepairCap: tenantCap }, { minorRepairCap: 'Minor repair cap' }),
    })
  })
  revalidatePath(`/tenancies/${tenancyId}/documents`)
  revalidatePath(`/tenancies/${tenancyId}`)
  return supportingDocumentsWorkspace(tenancyId, actorId)
}

/// Call only after authorizing the containing tenancy/repair. This view adds source
/// context to the existing proposal default; it never changes an agreed repair split.
export async function tenancyMaintenanceTerms(tenancy: { id: string; minorRepairClause: Prisma.JsonValue | null }): Promise<MaintenanceTermsView | null> {
  if (!tenancy.minorRepairClause) return null
  const terms = confirmedAgreementTermsSchema.parse(tenancy.minorRepairClause)
  const files = await db.supportingDocumentFile.findMany({
    where: { submittedAt: { not: null }, request: { tenancyId: tenancy.id, kind: 'TENANCY_AGREEMENT' } },
    orderBy: [{ submittedAt: 'desc' }, { id: 'desc' }],
    select: { id: true, fileName: true },
  })
  return { ...terms, sourceFileName: files.find((file) => file.id === terms.fileId)?.fileName ?? null, matchesCurrentAgreement: files[0]?.id === terms.fileId }
}
