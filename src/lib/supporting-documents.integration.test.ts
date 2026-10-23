import { randomUUID } from 'node:crypto'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

const { stored } = vi.hoisted(() => ({ stored: new Map<string, { bytes: Uint8Array; mimeType: string; size?: number }>() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/headers', () => ({ headers: async () => new Headers() }))
vi.mock('@/lib/auth', async (original) => ({
  ...await original<typeof import('@/lib/auth')>(), currentStakeholder: vi.fn(),
}))
vi.mock('@/lib/agency', async (original) => {
  const actual = await original<typeof import('@/lib/agency')>()
  return { ...actual, lockAgencyTenancy: vi.fn(actual.lockAgencyTenancy) }
})
vi.mock('@/lib/agreement-clause-parser', () => ({
  analyzeAgreementPdf: vi.fn(async () => ({ status: 'TEXT', candidates: [{
    page: 2, text: 'The tenant shall pay the first $200 for each repair, except structural repairs.', suggestedTenantCap: '200.00',
  }] })),
}))
vi.mock('@/lib/storage', () => ({
  CAPTURE_BUCKET: 'captures',
  captureExists: vi.fn(async (path: string) => stored.has(path)),
  createUploadUrl: vi.fn(async (path: string) => ({ signedUrl: `https://storage.test/upload/${path}`, token: 'example' })),
  createDownloadUrl: vi.fn(async (path: string) => `https://storage.test/download/${path}`),
  serviceClient: () => ({ storage: { from: () => ({
    info: async (path: string) => {
      const object = stored.get(path)!
      return { data: { size: object.size ?? object.bytes.length, contentType: object.mimeType }, error: null }
    },
    download: vi.fn(async (path: string) => {
      const object = stored.get(path)!
      return { data: new Blob([Uint8Array.from(object.bytes)], { type: object.mimeType }), error: null }
    }),
  }) } }),
}))

import { db } from '@/lib/db'
import { currentStakeholder } from '@/lib/auth'
import { lockAgencyTenancy } from '@/lib/agency'
import { createDownloadUrl, createUploadUrl } from '@/lib/storage'
import {
  registerSupportingDocumentFile, requestSupportingDocument, requestSupportingDocumentUpload,
  supportingDocumentDownload, supportingDocumentsWorkspace, prepareTenancyAgreement, analyzeTenancyAgreement, confirmTenancyAgreementTerms,
} from '@/lib/supporting-documents'
import { analyzeAgreementPdf } from '@/lib/agreement-clause-parser'
import { createMaintenanceCase, maintenanceCaseDetail, tenancyDetail, updateTenancyTerms } from '@/lib/maintenance'
import { notificationCanBeDelivered } from '@/lib/notification-recipients'
import { reportFingerprint } from '@/lib/report-fingerprint'
import { propertyOverview } from '@/lib/property-work'
import { propertyHistory } from '@/lib/property-history'
import { signedReport } from '@/lib/report'
import { GET as workspaceRoute } from '@/app/api/v1/tenancies/[id]/documents/route'
import { POST as uploadRoute } from '@/app/api/v1/tenancies/[id]/documents/[requestId]/upload-url/route'

const people: string[] = []
const properties: string[] = []
const agencies: string[] = []
const teams: string[] = []
const pdf = new TextEncoder().encode('%PDF-1.7\nTest supporting document\n%%EOF')

async function fixture() {
  const actors = await Promise.all(['agent', 'tenant', 'landlord', 'collaborator', 'manager', 'ordinary', 'historic', 'billing'].map(async (name) => {
    const person = await db.stakeholder.create({ data: { name: `${name} ${randomUUID()}` } })
    people.push(person.id)
    return person
  }))
  const [agent, tenant, landlord, collaborator, manager, ordinary, historic, billing] = actors
  const team = await db.team.create({ data: { name: randomUUID() } })
  teams.push(team.id)
  await db.stakeholder.updateMany({ where: { id: { in: [agent.id, billing.id] } }, data: { teamId: team.id } })
  const agency = await db.agency.create({ data: { name: 'Document agency', members: { create: [
    { stakeholderId: manager.id, status: 'ACTIVE', role: 'MANAGER' },
    { stakeholderId: ordinary.id, status: 'ACTIVE', role: 'AGENT' },
  ] } } })
  agencies.push(agency.id)
  const property = await db.property.create({ data: { line1: 'Private document home', postalCode: '998432', type: 'HDB' } })
  properties.push(property.id)
  const tenancy = await db.tenancy.create({ data: {
    propertyId: property.id, agentId: agent.id, tenantId: tenant.id, landlordId: landlord.id, agencyId: agency.id,
    startDate: new Date('2020-01-01'), endDate: new Date('2021-01-01'), monthlyRent: '3000', deposit: '6000',
    collaborators: { create: { stakeholderId: collaborator.id } },
  } })
  const inspection = await db.inspection.create({ data: {
    tenancyId: tenancy.id, kind: 'CHECK_IN', status: 'COMPLETED', conductedById: historic.id,
    accessGrants: { create: { stakeholderId: historic.id } },
  } })
  return { agent, tenant, landlord, collaborator, manager, ordinary, historic, billing, tenancy, property, agency, inspection }
}

async function request(record: Awaited<ReturnType<typeof fixture>>, actorId = record.agent.id) {
  const workspace = await requestSupportingDocument(record.tenancy.id, actorId, { clientId: randomUUID() })
  return workspace.requests[0]
}

async function intent(record: Awaited<ReturnType<typeof fixture>>, requestId: string, overrides: Partial<{ fileName: string; mimeType: string; byteSize: number; clientId: string }> = {}) {
  const input = { clientId: randomUUID(), fileName: 'Payment proof.pdf', mimeType: 'application/pdf', byteSize: pdf.length, ...overrides }
  const upload = await requestSupportingDocumentUpload(record.tenancy.id, requestId, record.tenant.id, input)
  return { input, upload }
}

afterAll(async () => {
  await db.property.deleteMany({ where: { id: { in: properties } } })
  await db.agency.deleteMany({ where: { id: { in: agencies } } })
  await db.accountDeletionRequest.deleteMany({ where: { stakeholderId: { in: people } } })
  await db.stakeholder.deleteMany({ where: { id: { in: people } } })
  await db.team.deleteMany({ where: { id: { in: teams } } })
  await db.$disconnect()
})

beforeEach(() => vi.clearAllMocks())

describe('private supporting documents', () => {
  it('allows parties and full tenancy agents after the tenancy ends, excluding historical grants, billing and unassigned team members', async () => {
    const record = await fixture()
    for (const actor of [record.agent, record.collaborator, record.manager, record.tenant, record.landlord]) {
      const workspace = await supportingDocumentsWorkspace(record.tenancy.id, actor.id)
      expect(workspace).toMatchObject({ tenantName: record.tenant.name, startDate: record.tenancy.startDate.toISOString(), endDate: record.tenancy.endDate.toISOString() })
      expect(workspace.canUpload).toBe(actor.id === record.tenant.id)
      expect(workspace.canRequest).toBe([record.agent.id, record.collaborator.id, record.manager.id].includes(actor.id))
    }
    for (const actor of [record.historic, record.billing, record.ordinary]) {
      await expect(supportingDocumentsWorkspace(record.tenancy.id, actor.id)).rejects.toThrow('Tenancy not found')
    }
    for (const actor of [record.tenant, record.landlord]) await expect(request(record, actor.id)).rejects.toThrow('Tenancy not found')
    const archived = await db.property.update({ where: { id: record.property.id }, data: { archivedAt: new Date() } })
    expect(archived.archivedAt).not.toBeNull()
    await expect(supportingDocumentsWorkspace(record.tenancy.id, record.agent.id)).resolves.toBeTruthy()
    await db.property.update({ where: { id: record.property.id }, data: { trashedAt: new Date() } })
    for (const actor of [record.agent, record.tenant, record.manager]) await expect(supportingDocumentsWorkspace(record.tenancy.id, actor.id)).rejects.toThrow('Tenancy not found')
  })

  it('requests idempotently and queues one tenant notification without changing a completed report or its fingerprint', async () => {
    const record = await fixture()
    const beforeFingerprint = await reportFingerprint(db, record.inspection.id)
    const beforeReport = await signedReport(record.inspection.id, record.tenant.id)
    const input = { clientId: randomUUID() }
    const first = await requestSupportingDocument(record.tenancy.id, record.agent.id, input)
    const second = await requestSupportingDocument(record.tenancy.id, record.agent.id, input)
    expect(second.requests).toEqual(first.requests)
    expect(await db.notification.count({ where: { tenancyId: record.tenancy.id, kind: 'SUPPORTING_DOCUMENT_REQUESTED' } })).toBe(1)
    expect(await db.propertyEvent.count({ where: { tenancyId: record.tenancy.id, kind: 'SUPPORTING_DOCUMENT_REQUESTED' } })).toBe(1)
    expect(await db.notification.findFirst({ where: { tenancyId: record.tenancy.id, kind: 'SUPPORTING_DOCUMENT_REQUESTED' } })).toMatchObject({
      href: `/tenancies/${record.tenancy.id}/documents?requestId=${first.requests[0].id}`,
    })
    const { input: fileInput, upload } = await intent(record, first.requests[0].id)
    stored.set(upload.storagePath, { bytes: pdf, mimeType: 'application/pdf' })
    await registerSupportingDocumentFile(record.tenancy.id, first.requests[0].id, record.tenant.id, fileInput)
    expect(await reportFingerprint(db, record.inspection.id)).toBe(beforeFingerprint)
    expect(await signedReport(record.inspection.id, record.tenant.id)).toEqual(beforeReport)
    expect(JSON.stringify(beforeReport)).not.toContain('Payment proof')
  })

  it('persists pending upload ownership, hides it until storage confirms, and retries without overwriting or duplicate submissions', async () => {
    const record = await fixture()
    const requested = await request(record)
    const { input, upload } = await intent(record, requested.id)
    expect(upload).toMatchObject({ signedUrl: expect.any(String), token: 'example' })
    expect(await db.supportingDocumentFile.findUnique({ where: { clientId: input.clientId } })).toMatchObject({ submittedAt: null, submittedById: record.tenant.id })
    expect((await supportingDocumentsWorkspace(record.tenancy.id, record.landlord.id)).requests[0].files).toEqual([])
    await expect(registerSupportingDocumentFile(record.tenancy.id, requested.id, record.tenant.id, input)).rejects.toThrow('has not reached storage')
    stored.set(upload.storagePath, { bytes: pdf, mimeType: 'application/pdf' })
    expect(await requestSupportingDocumentUpload(record.tenancy.id, requested.id, record.tenant.id, input)).toMatchObject({ alreadyUploaded: true })
    expect(createUploadUrl).toHaveBeenCalledTimes(1)
    const id = await registerSupportingDocumentFile(record.tenancy.id, requested.id, record.tenant.id, input)
    expect(await registerSupportingDocumentFile(record.tenancy.id, requested.id, record.tenant.id, input)).toBe(id)
    expect(await requestSupportingDocumentUpload(record.tenancy.id, requested.id, record.tenant.id, input)).toMatchObject({ fileId: id, alreadyRegistered: true })
    const workspace = await supportingDocumentsWorkspace(record.tenancy.id, record.landlord.id)
    expect(workspace.requests[0].files).toMatchObject([{ id, fileName: input.fileName, submittedBy: { id: record.tenant.id }, submittedAt: expect.any(String) }])
    expect(JSON.stringify(workspace)).not.toContain(upload.storagePath)
    expect(await db.notification.count({ where: { tenancyId: record.tenancy.id, kind: 'SUPPORTING_DOCUMENT_UPLOADED' } })).toBe(1)
    expect(await db.propertyEvent.count({ where: { tenancyId: record.tenancy.id, kind: 'SUPPORTING_DOCUMENT_UPLOADED' } })).toBe(1)
    expect(await db.notification.findFirst({ where: { tenancyId: record.tenancy.id, kind: 'SUPPORTING_DOCUMENT_UPLOADED' } })).toMatchObject({
      href: `/tenancies/${record.tenancy.id}/documents?requestId=${requested.id}`,
    })
    await supportingDocumentDownload(record.tenancy.id, requested.id, id, record.landlord.id)
    expect(createDownloadUrl).toHaveBeenCalledWith(upload.storagePath, 600, 'Payment proof.pdf')
  })

  it('permits multiple submitted files but rejects changed metadata and cross-request client id reuse', async () => {
    const record = await fixture()
    const requested = await request(record)
    const { input, upload } = await intent(record, requested.id)
    for (const patch of [{ fileName: 'different.pdf' }, { byteSize: pdf.length + 1 }, { mimeType: 'image/png' }]) {
      await expect(requestSupportingDocumentUpload(record.tenancy.id, requested.id, record.tenant.id, { ...input, ...patch })).rejects.toThrow('different file details')
      await expect(registerSupportingDocumentFile(record.tenancy.id, requested.id, record.tenant.id, { ...input, ...patch })).rejects.toThrow('different file details')
    }
    const another = await request(record)
    await expect(requestSupportingDocumentUpload(record.tenancy.id, another.id, record.tenant.id, input)).rejects.toThrow('Document file not found')
    stored.set(upload.storagePath, { bytes: pdf, mimeType: 'application/pdf' })
    await registerSupportingDocumentFile(record.tenancy.id, requested.id, record.tenant.id, input)
    const next = await intent(record, requested.id)
    stored.set(next.upload.storagePath, { bytes: pdf, mimeType: 'application/pdf' })
    await registerSupportingDocumentFile(record.tenancy.id, requested.id, record.tenant.id, next.input)
    expect((await supportingDocumentsWorkspace(record.tenancy.id, record.agent.id)).requests.find((value) => value.id === requested.id)!.files).toHaveLength(2)
  })

  it.each(['wrong mime', 'wrong bytes', 'wrong size', 'too large'])('refuses %s from storage without marking the document submitted', async (failure) => {
    const record = await fixture()
    const requested = await request(record)
    const { input, upload } = await intent(record, requested.id)
    stored.set(upload.storagePath, {
      bytes: failure === 'wrong bytes' ? new Uint8Array(pdf.length) : pdf,
      mimeType: failure === 'wrong mime' ? 'text/html' : 'application/pdf',
      size: failure === 'wrong size' ? pdf.length + 1 : failure === 'too large' ? 20_000_000 : pdf.length,
    })
    await expect(registerSupportingDocumentFile(record.tenancy.id, requested.id, record.tenant.id, input)).rejects.toMatchObject({ code: 'invalid_document' })
    expect((await db.supportingDocumentFile.findUniqueOrThrow({ where: { clientId: input.clientId } })).submittedAt).toBeNull()
    expect(await db.notification.count({ where: { tenancyId: record.tenancy.id, kind: 'SUPPORTING_DOCUMENT_UPLOADED' } })).toBe(0)
  })

  it('only accepts the tenant upload and never mints a download for a pending file or another request', async () => {
    const record = await fixture()
    const requested = await request(record)
    const { input } = await intent(record, requested.id)
    for (const actor of [record.agent, record.manager, record.collaborator, record.landlord]) {
      await expect(requestSupportingDocumentUpload(record.tenancy.id, requested.id, actor.id, input)).rejects.toThrow('Document request not found')
      await expect(registerSupportingDocumentFile(record.tenancy.id, requested.id, actor.id, input)).rejects.toThrow('Document request not found')
    }
    const file = await db.supportingDocumentFile.findUniqueOrThrow({ where: { clientId: input.clientId } })
    await expect(supportingDocumentDownload(record.tenancy.id, requested.id, file.id, record.tenant.id)).rejects.toThrow('Document file not found')
    expect(createDownloadUrl).not.toHaveBeenCalled()
    const other = await fixture()
    await expect(requestSupportingDocumentUpload(other.tenancy.id, requested.id, other.tenant.id, input)).rejects.toThrow('Document request not found')
  })

  it('withdraws queued private notifications after access removal and stops minting downloads', async () => {
    const record = await fixture()
    const requested = await request(record, record.collaborator.id)
    const { input, upload } = await intent(record, requested.id)
    stored.set(upload.storagePath, { bytes: pdf, mimeType: 'application/pdf' })
    const fileId = await registerSupportingDocumentFile(record.tenancy.id, requested.id, record.tenant.id, input)
    const notice = await db.notification.findFirstOrThrow({ where: { tenancyId: record.tenancy.id, kind: 'SUPPORTING_DOCUMENT_UPLOADED' } })
    expect(await notificationCanBeDelivered(db, notice)).toBe(true)
    await db.tenancyCollaborator.deleteMany({ where: { tenancyId: record.tenancy.id, stakeholderId: record.collaborator.id } })
    expect(await notificationCanBeDelivered(db, notice)).toBe(false)
    await expect(supportingDocumentDownload(record.tenancy.id, requested.id, fileId, record.collaborator.id)).rejects.toThrow('Tenancy not found')
    expect(createDownloadUrl).not.toHaveBeenCalled()
  })

  it('rechecks authorization after waiting behind a tenancy-sharing change before minting a file URL', async () => {
    const record = await fixture()
    const requested = await request(record)
    const { input, upload } = await intent(record, requested.id)
    stored.set(upload.storagePath, { bytes: pdf, mimeType: 'application/pdf' })
    const fileId = await registerSupportingDocumentFile(record.tenancy.id, requested.id, record.tenant.id, input)
    let locked!: () => void
    let attempted!: () => void
    const lockHeld = new Promise<void>((resolve) => { locked = resolve })
    const lockAttempted = new Promise<void>((resolve) => { attempted = resolve })
    const original = vi.mocked(lockAgencyTenancy).getMockImplementation()!
    const removal = db.$transaction(async (tx) => {
      await original(record.tenancy.id, tx)
      locked()
      await lockAttempted
      await tx.tenancyCollaborator.deleteMany({ where: { tenancyId: record.tenancy.id, stakeholderId: record.collaborator.id } })
    })
    await lockHeld
    vi.mocked(lockAgencyTenancy).mockImplementationOnce(async (...args) => { attempted(); return original(...args) })
    await expect(supportingDocumentDownload(record.tenancy.id, requested.id, fileId, record.collaborator.id)).rejects.toThrow('Tenancy not found')
    await removal
    expect(createDownloadUrl).not.toHaveBeenCalled()
  })

  it('uses indistinguishable refusals and pins queued HTTP uploads to their signed-in owner', async () => {
    const record = await fixture()
    vi.mocked(currentStakeholder).mockResolvedValue(record.historic)
    const get = (id: string) => workspaceRoute(new Request('http://localhost/api'), { params: Promise.resolve({ id }) })
    const denied = await get(record.tenancy.id)
    const missing = await get('missing')
    expect(denied.status).toBe(404)
    expect(await denied.json()).toEqual(await missing.json())
    vi.mocked(currentStakeholder).mockResolvedValue(record.tenant)
    const requested = await request(record)
    const pinned = await uploadRoute(new Request('http://localhost/api', { method: 'POST', headers: { 'x-kivilo-owner': record.agent.id }, body: '{}' }), { params: Promise.resolve({ id: record.tenancy.id, requestId: requested.id }) })
    expect(pinned.status).toBe(401)
    expect(await db.supportingDocumentFile.count({ where: { requestId: requested.id } })).toBe(0)
    const invalid = await uploadRoute(new Request('http://localhost/api', { method: 'POST', body: JSON.stringify({ clientId: randomUUID(), fileName: '../bad.pdf', mimeType: 'application/pdf', byteSize: 1 }) }), { params: Promise.resolve({ id: record.tenancy.id, requestId: requested.id }) })
    expect(invalid.status).toBe(400)
  })

  it('refuses in-flight mutations and new downloads once an account deletion starts processing', async () => {
    const record = await fixture()
    const requested = await request(record)
    const { input, upload } = await intent(record, requested.id)
    stored.set(upload.storagePath, { bytes: pdf, mimeType: 'application/pdf' })
    const fileId = await registerSupportingDocumentFile(record.tenancy.id, requested.id, record.tenant.id, input)
    const queued = await intent(record, requested.id)
    await db.accountDeletionRequest.createMany({ data: [record.agent, record.tenant].map((person) => ({
      stakeholderId: person.id, status: 'PROCESSING', dueAt: new Date(),
    })) })
    await expect(request(record)).rejects.toThrow('Tenancy not found')
    await expect(requestSupportingDocumentUpload(record.tenancy.id, requested.id, record.tenant.id, queued.input)).rejects.toThrow('Tenancy not found')
    await expect(registerSupportingDocumentFile(record.tenancy.id, requested.id, record.tenant.id, queued.input)).rejects.toThrow('Tenancy not found')
    await expect(supportingDocumentDownload(record.tenancy.id, requested.id, fileId, record.tenant.id)).rejects.toThrow('Tenancy not found')
    expect(createDownloadUrl).not.toHaveBeenCalled()
    // A different party still has their shared record.
    await expect(supportingDocumentDownload(record.tenancy.id, requested.id, fileId, record.landlord.id)).resolves.toHaveProperty('url')
  })

  it('offers property-term documents independently of repairs and keeps document history confined to its tenancy', async () => {
    const record = await fixture()
    const requested = await request(record)
    expect((await propertyOverview(record.property.id, record.agent.id)).terms[0]).toMatchObject({ canOpenDocuments: true, tenancy: null })
    expect((await propertyOverview(record.property.id, record.historic.id)).terms[0]).toMatchObject({ canOpenDocuments: false, tenancy: null })
    expect((await propertyHistory(record.property.id, record.historic.id)).events).toHaveLength(0)
    await db.tenancy.create({ data: {
      propertyId: record.property.id, agentId: record.billing.id, tenantId: record.tenant.id, landlordId: record.landlord.id,
      startDate: new Date('2022-01-01'), endDate: new Date('2023-01-01'), monthlyRent: '3100', deposit: '6200',
    } })
    expect((await propertyHistory(record.property.id, record.billing.id)).events).toHaveLength(0)
    const events = (await propertyHistory(record.property.id, record.agent.id)).events
    expect(events).toMatchObject([{ kind: 'SUPPORTING_DOCUMENT_REQUESTED', tenancyId: record.tenancy.id }])
    expect(JSON.stringify(events)).not.toContain(requested.title)
    await db.inspection.update({ where: { id: record.inspection.id }, data: { status: 'DRAFT' } })
    expect((await propertyOverview(record.property.id, record.agent.id)).terms[0].canOpenDocuments).toBe(true)
    await db.property.update({ where: { id: record.property.id }, data: { trashedAt: new Date() } })
    expect((await propertyOverview(record.property.id, record.agent.id)).terms[0].canOpenDocuments).toBe(false)
  })
})

describe('tenancy agreement and reviewed maintenance clause', () => {
  async function agreementFile(record: Awaited<ReturnType<typeof fixture>>, actorId = record.tenant.id, mimeType = 'application/pdf') {
    const workspace = await prepareTenancyAgreement(record.tenancy.id, actorId)
    const requestId = workspace.agreement.requestId!
    const bytes = mimeType === 'image/jpeg' ? new Uint8Array([0xff, 0xd8, 0xff, 0x00]) : pdf
    const input = { clientId: randomUUID(), fileName: mimeType === 'image/jpeg' ? 'Agreement photo.jpg' : 'Tenancy agreement.pdf', mimeType, byteSize: bytes.length }
    const upload = await requestSupportingDocumentUpload(record.tenancy.id, requestId, actorId, input)
    stored.set(upload.storagePath, { bytes, mimeType })
    const fileId = await registerSupportingDocumentFile(record.tenancy.id, requestId, actorId, input)
    return { fileId, requestId }
  }

  const terms = (fileId: string) => ({
    fileId, page: 2, quote: 'The tenant shall pay the first $200 for each repair, except structural repairs.',
    rule: 'FIRST_AMOUNT' as const, tenantCap: '200', notes: 'Structural repairs are excluded.',
  })

  it('creates the agreement slot explicitly and once, separate from optional supporting requests', async () => {
    const record = await fixture()
    const before = await supportingDocumentsWorkspace(record.tenancy.id, record.agent.id)
    expect(before.agreement).toMatchObject({ requestId: null, currentFileId: null, files: [], canUpload: true, canReview: true })
    expect(await db.supportingDocumentRequest.count({ where: { tenancyId: record.tenancy.id } })).toBe(0)
    const workspaces = await Promise.all([record.agent, record.landlord, record.tenant].map((actor) => prepareTenancyAgreement(record.tenancy.id, actor.id)))
    expect(new Set(workspaces.map((workspace) => workspace.agreement.requestId)).size).toBe(1)
    expect(workspaces.every((workspace) => workspace.requests.length === 0)).toBe(true)
    expect(workspaces[2].agreement.canReview).toBe(false)
    expect(await db.notification.count({ where: { tenancyId: record.tenancy.id } })).toBe(0)
    for (const actor of [record.historic, record.billing, record.ordinary]) await expect(prepareTenancyAgreement(record.tenancy.id, actor.id)).rejects.toThrow('Tenancy not found')
    await request(record)
    expect((await supportingDocumentsWorkspace(record.tenancy.id, record.agent.id)).requests).toHaveLength(1)
  })

  it('lets every full participant upload an agreement, without relaxing tenant-only supporting uploads', async () => {
    const record = await fixture()
    for (const actor of [record.agent, record.landlord, record.tenant, record.collaborator, record.manager]) await agreementFile(record, actor.id)
    const workspace = await supportingDocumentsWorkspace(record.tenancy.id, record.tenant.id)
    expect(workspace.agreement.files).toHaveLength(5)
    expect(workspace.requests).toHaveLength(0)
    expect(new Set(workspace.agreement.files.map((file) => file.submittedBy.id)).size).toBe(5)
    expect(await db.propertyEvent.count({ where: { tenancyId: record.tenancy.id, kind: 'TENANCY_AGREEMENT_UPLOADED' } })).toBe(5)
    const requested = await request(record)
    await expect(requestSupportingDocumentUpload(record.tenancy.id, requested.id, record.agent.id, {
      clientId: randomUUID(), fileName: 'receipt.pdf', mimeType: 'application/pdf', byteSize: pdf.length,
    })).rejects.toThrow('Document request not found')
  })

  it('extracts suggestions without changing terms, confines analysis to agreement files, and falls back for images', async () => {
    const record = await fixture()
    const { fileId } = await agreementFile(record)
    expect(await analyzeTenancyAgreement(record.tenancy.id, fileId, record.tenant.id)).toMatchObject({ fileId, status: 'TEXT', candidates: [{ page: 2, suggestedTenantCap: '200.00' }] })
    expect(analyzeAgreementPdf).toHaveBeenCalledTimes(1)
    expect(await db.tenancy.findUniqueOrThrow({ where: { id: record.tenancy.id } })).toMatchObject({ minorRepairCap: null, minorRepairClause: null })
    const scanned = await agreementFile(record, record.agent.id, 'image/jpeg')
    expect(await analyzeTenancyAgreement(record.tenancy.id, scanned.fileId, record.landlord.id)).toEqual({ fileId: scanned.fileId, status: 'NO_TEXT', candidates: [] })
    expect(analyzeAgreementPdf).toHaveBeenCalledTimes(1)
    const requested = await request(record)
    const { input, upload } = await intent(record, requested.id)
    stored.set(upload.storagePath, { bytes: pdf, mimeType: 'application/pdf' })
    const receiptId = await registerSupportingDocumentFile(record.tenancy.id, requested.id, record.tenant.id, input)
    await expect(analyzeTenancyAgreement(record.tenancy.id, receiptId, record.agent.id)).rejects.toThrow('Agreement file not found')
    await expect(analyzeTenancyAgreement(record.tenancy.id, fileId, record.historic.id)).rejects.toThrow('Tenancy not found')
  })

  it('requires agent or landlord confirmation, preserves quote/source/exceptions, and only changes a proposal default', async () => {
    const record = await fixture()
    const fingerprint = await reportFingerprint(db, record.inspection.id)
    const { fileId } = await agreementFile(record)
    await expect(confirmTenancyAgreementTerms(record.tenancy.id, record.tenant.id, terms(fileId))).rejects.toThrow('Tenancy not found')
    const confirmed = await confirmTenancyAgreementTerms(record.tenancy.id, record.landlord.id, terms(fileId))
    expect(confirmed.currentMinorRepairCap).toBe('200')
    expect(confirmed.agreement).toMatchObject({ termsMatchCurrentFile: true, terms: {
      ...terms(fileId), tenantCap: '200.00', confirmedBy: { id: record.landlord.id }, sourceFileName: 'Tenancy agreement.pdf', confirmedAt: expect.any(String),
    } })
    const detail = await tenancyDetail(record.tenancy.id, record.tenant.id)
    expect(detail.maintenanceTerms).toMatchObject({ fileId, matchesCurrentAgreement: true, notes: 'Structural repairs are excluded.' })
    const repair = await createMaintenanceCase(record.tenancy.id, record.tenant.id, { category: 'PLUMBING', title: 'Dripping tap', description: 'Tap keeps dripping.' })
    const repairDetail = await maintenanceCaseDetail(repair.id, record.tenant.id)
    expect(repairDetail.responsibility).toMatchObject({ minorRepairCap: '200', maintenanceTerms: { fileId }, agreement: null, shares: null })
    expect(await reportFingerprint(db, record.inspection.id)).toBe(fingerprint)
    expect(await db.responsibilityProposal.count({ where: { caseId: repair.id } })).toBe(0)
    expect(await db.propertyEvent.findFirst({ where: { tenancyId: record.tenancy.id, kind: 'TENANCY_TERMS_CHANGED' } })).toMatchObject({
      actorId: record.landlord.id, summary: 'confirmed maintenance terms from the tenancy agreement',
      detail: { changes: [{ field: 'Minor repair cap', from: null, to: '200.00' }] },
    })
  })

  it('rejects stale agreement confirmation, keeps previous terms visibly sourced, and never treats a threshold as a first-amount contribution', async () => {
    const record = await fixture()
    const first = await agreementFile(record)
    await confirmTenancyAgreementTerms(record.tenancy.id, record.agent.id, terms(first.fileId))
    const replacement = await agreementFile(record, record.landlord.id)
    const workspace = await supportingDocumentsWorkspace(record.tenancy.id, record.tenant.id)
    expect(workspace).toMatchObject({ currentMinorRepairCap: '200', agreement: { currentFileId: replacement.fileId, termsMatchCurrentFile: false, terms: { fileId: first.fileId } } })
    await expect(confirmTenancyAgreementTerms(record.tenancy.id, record.agent.id, terms(first.fileId))).rejects.toMatchObject({ code: 'document_conflict' })
    const other = { fileId: replacement.fileId, page: 3, quote: 'Tenant pays repairs costing no more than $150. Landlord pays repairs above $150 in full.', rule: 'OTHER', tenantCap: null, notes: 'Tenant pays the whole bill only when it is $150 or less; the landlord pays the whole bill above that threshold.' }
    await expect(confirmTenancyAgreementTerms(record.tenancy.id, record.agent.id, { ...other, tenantCap: '150' })).rejects.toThrow()
    await expect(confirmTenancyAgreementTerms(record.tenancy.id, record.agent.id, { ...other, notes: null })).rejects.toThrow()
    const confirmed = await confirmTenancyAgreementTerms(record.tenancy.id, record.agent.id, other)
    expect(confirmed.currentMinorRepairCap).toBeNull()
    expect(confirmed.agreement.terms).toMatchObject({ rule: 'OTHER', tenantCap: null, notes: other.notes })
  })

  it('clears agreement provenance when the existing manual contribution setting is edited', async () => {
    const record = await fixture()
    const { fileId } = await agreementFile(record)
    await confirmTenancyAgreementTerms(record.tenancy.id, record.agent.id, terms(fileId))
    await updateTenancyTerms(record.tenancy.id, record.landlord.id, { minorRepairCap: '200.00', agentMayAgreeCosts: false })
    expect((await supportingDocumentsWorkspace(record.tenancy.id, record.tenant.id)).agreement.terms).toMatchObject({ fileId })
    await updateTenancyTerms(record.tenancy.id, record.landlord.id, { minorRepairCap: '125' })
    const workspace = await supportingDocumentsWorkspace(record.tenancy.id, record.tenant.id)
    expect(workspace.currentMinorRepairCap).toBe('125')
    expect(workspace.agreement.terms).toBeNull()
    expect((await tenancyDetail(record.tenancy.id, record.tenant.id)).maintenanceTerms).toBeNull()
    expect(await db.propertyEvent.findFirst({ where: { tenancyId: record.tenancy.id, kind: 'TENANCY_TERMS_CHANGED', summary: 'changed the tenancy terms' }, orderBy: { createdAt: 'desc' } })).toMatchObject({
      detail: { changes: [{ field: 'Minor repair cap', from: '200', to: '125' }] },
    })
  })
})
