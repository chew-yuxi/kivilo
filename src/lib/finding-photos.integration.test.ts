import { randomUUID } from 'node:crypto'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

const { objects } = vi.hoisted(() => ({ objects: new Set<string>() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/headers', () => ({ headers: async () => new Headers() }))
vi.mock('@/lib/storage', () => ({
  CAPTURE_BUCKET: 'captures',
  captureExists: vi.fn(async (path: string) => objects.has(path)),
  createUploadUrl: vi.fn(async (path: string) => ({ signedUrl: `https://storage.test/upload/${path}`, token: 'test' })),
  createDownloadUrl: vi.fn(async (path: string) => `https://storage.test/download/${path}`),
  serviceClient: () => ({ storage: { from: () => ({ remove: async (paths: string[]) => { paths.forEach((path) => objects.delete(path)); return { error: null } } }) } }),
}))
vi.mock('@/lib/auth', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/auth')>()
  return { ...actual, authorizeInspection: vi.fn(actual.authorizeInspection), currentStakeholder: vi.fn(), requireAgent: vi.fn() }
})

import { db } from '@/lib/db'
import { authorizeInspection, currentStakeholder, requireAgent } from '@/lib/auth'
import { createUploadUrl } from '@/lib/storage'
import { createFinding, deleteFinding, updateFinding } from '@/lib/actions'
import {
  deleteFindingPhoto, discardFindingPhotoDraft, editFindingPhoto, findingPhotoDraft,
  registerFindingPhoto, requestFindingPhotoUpload, retireFindingDraftsForAccount,
} from '@/lib/finding-photos'
import { publishAssessment } from '@/lib/assessment-actions'
import { assessmentSnapshotSchema } from '@/lib/assessment-schema'
import { reportFingerprint } from '@/lib/report-fingerprint'
import { purgeStorageEntry } from '../../scripts/purge-storage'
import * as uploadRoute from '@/app/api/v1/inspections/[id]/finding-photo-drafts/[draftId]/upload-url/route'
import type { Stakeholder } from '@/generated/prisma'

const people: string[] = []
const properties: string[] = []
const paths: string[] = []
const annotation = { w: 1000, h: 800, marks: [{ shape: 'ring', cx: 0.5, cy: 0.4, rx: 0.1, ry: 0.1 }] }

function as(person: Stakeholder) {
  vi.mocked(currentStakeholder).mockResolvedValue(person)
  vi.mocked(requireAgent).mockResolvedValue(person)
}

async function fixture() {
  const run = randomUUID()
  const [agent, conductor, landlord, tenant, stranger] = await Promise.all(['agent', 'conductor', 'landlord', 'tenant', 'stranger'].map(async (role) => {
    const person = await db.stakeholder.create({ data: { name: `Finding photos ${role} ${run}` } })
    people.push(person.id)
    return person
  }))
  const property = await db.property.create({ data: { line1: `Finding photos ${run}`, postalCode: '997736', type: 'HDB' } })
  properties.push(property.id)
  const tenancy = await db.tenancy.create({ data: {
    propertyId: property.id, landlordId: landlord.id, tenantId: tenant.id, agentId: agent.id,
    startDate: new Date('2024-01-01'), endDate: new Date('2099-12-31'), monthlyRent: '3000', deposit: '6000',
  } })
  const inspection = await db.inspection.create({ data: { tenancyId: tenancy.id, kind: 'CHECK_OUT', status: 'COMPLETED', conductedById: conductor.id } })
  const room = await db.room.create({ data: { inspectionId: inspection.id, name: 'Kitchen', order: 0, status: 'REVIEWED' } })
  const item = await db.inspectionItem.create({ data: { roomId: room.id, name: 'Hob', category: 'APPLIANCE', condition: 'DAMAGED', notes: 'Cracked glass' } })
  as(agent)
  return { agent, conductor, landlord, tenant, stranger, tenancy, inspection, room, item }
}

function fields(record: Awaited<ReturnType<typeof fixture>>, photoDraftId?: string) {
  return { itemId: record.item.id, baselineItemId: null, changeType: 'DAMAGE' as const, verdict: 'TENANT_LIABLE' as const, rationale: 'Cracked glass', estimatedCost: '100', photoDraftId }
}

async function intent(record: Awaited<ReturnType<typeof fixture>>, draftId = randomUUID(), findingId?: string) {
  const clientId = randomUUID()
  const result = await requestFindingPhotoUpload(record.inspection.id, draftId, record.agent.id, { clientId, mimeType: 'image/jpeg', ...(findingId ? { findingId } : {}) })
  paths.push(result.storagePath)
  return { draftId, clientId, storagePath: result.storagePath, mimeType: 'image/jpeg', sizeBytes: 42, note: 'Crack close-up', annotations: annotation }
}

async function register(record: Awaited<ReturnType<typeof fixture>>, photo: Awaited<ReturnType<typeof intent>>) {
  objects.add(photo.storagePath)
  const { draftId, ...input } = photo
  return registerFindingPhoto(record.inspection.id, draftId, record.agent.id, input)
}

beforeEach(() => { objects.clear() })
afterAll(async () => {
  await db.property.deleteMany({ where: { id: { in: properties } } })
  await db.stakeholder.deleteMany({ where: { id: { in: people } } })
  await db.storagePurge.deleteMany({ where: { path: { in: paths } } })
  await db.$disconnect()
})

describe('finding-owned photos', () => {
  it('records upload intent without a visible finding, validates storage, and claims exactly once after registration', async () => {
    const record = await fixture()
    const fingerprint = await reportFingerprint(db, record.inspection.id)
    const photo = await intent(record)
    expect(await db.finding.count({ where: { inspectionId: record.inspection.id } })).toBe(0)
    expect(await db.findingPhoto.findUniqueOrThrow({ where: { clientId: photo.clientId } })).toMatchObject({ registeredAt: null, findingId: null, storagePath: photo.storagePath })
    expect(await findingPhotoDraft(record.inspection.id, photo.draftId, record.agent.id)).toMatchObject({ state: 'OPEN', photos: [{ id: photo.clientId, url: null }] })
    await expect(createFinding(record.inspection.id, fields(record, photo.draftId))).rejects.toThrow('still uploading')
    expect(await db.finding.count({ where: { inspectionId: record.inspection.id } })).toBe(0)
    const { draftId, ...input } = photo
    await expect(registerFindingPhoto(record.inspection.id, draftId, record.agent.id, input)).rejects.toThrow('has not reached storage')
    objects.add(photo.storagePath)
    await expect(registerFindingPhoto(record.inspection.id, draftId, record.agent.id, { ...input, storagePath: 'other/private.jpg' })).rejects.toThrow('Photo path is invalid')
    const result = await registerFindingPhoto(record.inspection.id, draftId, record.agent.id, { ...input, annotations: { ...annotation, by: 'forged', at: 'yesterday', v: 9 } })
    expect(result).toMatchObject({ id: photo.clientId, annotationsApplied: true })
    expect(await registerFindingPhoto(record.inspection.id, draftId, record.agent.id, input)).toMatchObject({ id: photo.clientId, annotationsApplied: true })
    const stored = await db.findingPhoto.findUniqueOrThrow({ where: { clientId: photo.clientId } })
    expect(stored.annotations).toMatchObject({ ...annotation, v: 1, by: record.agent.id })
    const [first, second] = await Promise.all([createFinding(record.inspection.id, fields(record, draftId)), createFinding(record.inspection.id, fields(record, draftId))])
    expect(second).toBe(first)
    expect(await createFinding(record.inspection.id, { ...fields(record, draftId), estimatedCost: '100.00' })).toBe(first)
    await expect(createFinding(record.inspection.id, { ...fields(record, draftId), rationale: 'Changed after the lost response' })).rejects.toThrow('Finding save conflict')
    await expect(createFinding(record.inspection.id, { ...fields(record, draftId), estimatedCost: '200' })).rejects.toThrow('Finding save conflict')
    expect(await db.finding.count({ where: { inspectionId: record.inspection.id } })).toBe(1)
    expect(await findingPhotoDraft(record.inspection.id, draftId, record.agent.id)).toMatchObject({ state: 'CLAIMED', findingId: first })
    expect((await db.findingPhoto.findUniqueOrThrow({ where: { clientId: photo.clientId } })).findingId).toBe(first)
    expect(await reportFingerprint(db, record.inspection.id)).toBe(fingerprint)
    await discardFindingPhotoDraft(record.inspection.id, draftId, record.agent.id)
    expect((await db.findingPhoto.findUniqueOrThrow({ where: { clientId: photo.clientId } })).deletedAt).toBeNull()
    expect(await requestFindingPhotoUpload(record.inspection.id, draftId, record.agent.id, { clientId: photo.clientId, mimeType: 'image/jpeg' })).toMatchObject({ alreadyRegistered: true })
    await expect(requestFindingPhotoUpload(record.inspection.id, draftId, record.agent.id, { clientId: randomUUID(), mimeType: 'image/jpeg' })).rejects.toThrow('draft is closed')
  })

  it('keeps inspection, personal drafts, photo ids and saved finding ownership scoped with identical route refusals', async () => {
    const record = await fixture()
    const other = await fixture()
    const photo = await intent(record)
    await register(record, photo)
    await expect(findingPhotoDraft(record.inspection.id, photo.draftId, record.conductor.id)).rejects.toThrow('draft not found')
    const { draftId, ...registration } = photo
    await expect(registerFindingPhoto(other.inspection.id, draftId, other.agent.id, registration)).rejects.toThrow('draft not found')
    const findingId = await createFinding(other.inspection.id, fields(other))
    await expect(editFindingPhoto(other.inspection.id, other.agent.id, photo.clientId, { findingId }, { note: 'Changed' })).rejects.toThrow('photo not found')
    as(record.stranger)
    const call = (id: string) => uploadRoute.POST(new Request('http://localhost/api', { method: 'POST', body: JSON.stringify({ clientId: randomUUID(), mimeType: 'image/jpeg' }) }), { params: Promise.resolve({ id, draftId: randomUUID() }) })
    const denied = await call(record.inspection.id)
    const missing = await call('missing')
    expect(denied.status).toBe(404)
    expect(await denied.json()).toEqual(await missing.json())
  })

  it.each(['upload', 'marks', 'create', 'update', 'delete', 'publish'] as const)('rechecks access after a queued %s waits behind access removal', async (operation) => {
    const record = await fixture()
    const photo = await intent(record)
    await register(record, photo)
    const findingId = await createFinding(record.inspection.id, fields(record, photo.draftId))
    const before = await db.findingPhoto.findUniqueOrThrow({ where: { clientId: photo.clientId } })
    const findingBefore = await db.finding.findUniqueOrThrow({ where: { id: findingId } })
    const uploadsBefore = vi.mocked(createUploadUrl).mock.calls.length
    const nextDraftId = randomUUID()
    let releaseAuthorization!: () => void
    let releaseLocks!: () => void
    const authorizationChecked = new Promise<void>((resolve) => { releaseAuthorization = resolve })
    const locksHeld = new Promise<void>((resolve) => { releaseLocks = resolve })
    const originalAuthorization = vi.mocked(authorizeInspection).getMockImplementation()!
    vi.mocked(authorizeInspection).mockImplementationOnce(async (...args) => {
      const authorized = await originalAuthorization(...args)
      releaseAuthorization()
      return authorized
    })
    const removal = db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Tenancy" WHERE "id" = ${record.tenancy.id} FOR UPDATE`
      await tx.$queryRaw`SELECT "id" FROM "Inspection" WHERE "id" = ${record.inspection.id} FOR UPDATE`
      releaseLocks()
      await authorizationChecked
      // Simulate the lead's access disappearing while the request is waiting. The
      // same tenancy lock serializes explicit collaborator removal after migration.
      await tx.tenancy.update({ where: { id: record.tenancy.id }, data: { agentId: record.stranger.id } })
    })
    await locksHeld
    const operations = {
      upload: () => requestFindingPhotoUpload(record.inspection.id, nextDraftId, record.agent.id, { clientId: randomUUID(), mimeType: 'image/jpeg' }),
      marks: () => editFindingPhoto(record.inspection.id, record.agent.id, photo.clientId, { findingId }, { annotations: null }),
      create: () => createFinding(record.inspection.id, fields(record)),
      update: () => updateFinding(findingId, record.inspection.id, { rationale: 'Changed after access was removed' }),
      delete: () => deleteFinding(findingId, record.inspection.id),
      publish: () => publishAssessment(record.inspection.id),
    }
    const pending = operations[operation]()
    const refused = expect(pending).rejects.toThrow('Inspection not found')
    await removal
    await refused
    expect(vi.mocked(createUploadUrl).mock.calls.length).toBe(uploadsBefore)
    expect(await db.findingPhotoDraft.findUnique({ where: { id: nextDraftId } })).toBeNull()
    expect(await db.findingPhoto.findUniqueOrThrow({ where: { clientId: photo.clientId } })).toEqual(before)
    expect(await db.finding.findMany({ where: { inspectionId: record.inspection.id } })).toEqual([findingBefore])
    expect(await db.assessmentVersion.count({ where: { inspectionId: record.inspection.id } })).toBe(0)
  })

  it('tombstones removed in-flight uploads and sweeps delayed bytes without ever recreating them', async () => {
    const record = await fixture()
    const photo = await intent(record)
    await deleteFindingPhoto(record.inspection.id, record.agent.id, photo.clientId, { draftId: photo.draftId })
    objects.add(photo.storagePath) // A previously minted PUT completes after Delete.
    const purge = await db.storagePurge.findUniqueOrThrow({ where: { path: photo.storagePath } })
    expect(purge.isPrefix).toBe(false)
    expect(await purgeStorageEntry(purge)).toBe('waiting')
    const ready = await db.storagePurge.update({ where: { id: purge.id }, data: { readyAt: new Date(0), createdAt: new Date(Date.now() - 4 * 3600_000) } })
    expect(await purgeStorageEntry(ready)).toBe('completed')
    expect(objects.has(photo.storagePath)).toBe(false)
    await expect(requestFindingPhotoUpload(record.inspection.id, photo.draftId, record.agent.id, { clientId: photo.clientId, mimeType: 'image/jpeg' })).rejects.toThrow('photo not found')
    const unused = randomUUID()
    await discardFindingPhotoDraft(record.inspection.id, unused, record.agent.id)
    await expect(requestFindingPhotoUpload(record.inspection.id, unused, record.agent.id, { clientId: randomUUID(), mimeType: 'image/jpeg' })).rejects.toThrow('draft is closed')
  })

  it('blocks publication of associated unsaved photo edits, including registered bytes, until Save or Discard', async () => {
    const record = await fixture()
    const findingId = await createFinding(record.inspection.id, fields(record))
    const photo = await intent(record, randomUUID(), findingId)
    await expect(publishAssessment(record.inspection.id)).rejects.toThrow('Finding photos are still uploading')
    await register(record, photo)
    await expect(publishAssessment(record.inspection.id)).rejects.toThrow('unsaved changes')
    await updateFinding(findingId, record.inspection.id, { photoDraftId: photo.draftId })
    await publishAssessment(record.inspection.id)
    const latest = await db.assessmentVersion.findFirstOrThrow({ where: { inspectionId: record.inspection.id }, orderBy: { version: 'desc' } })
    expect(assessmentSnapshotSchema.parse(latest.snapshot).findings[0].photos).toMatchObject([{ id: photo.clientId }])
    const next = await intent(record, randomUUID(), findingId)
    await discardFindingPhotoDraft(record.inspection.id, next.draftId, record.agent.id)
    await expect(publishAssessment(record.inspection.id)).resolves.toMatchObject({ version: 1 })
  })

  it('touches the saved finding on marks/removal and protects bytes referenced in any immutable assessment', async () => {
    const record = await fixture()
    const photo = await intent(record)
    await register(record, photo)
    const findingId = await createFinding(record.inspection.id, fields(record, photo.draftId))
    await publishAssessment(record.inspection.id)
    const old = await db.assessmentVersion.findFirstOrThrow({ where: { inspectionId: record.inspection.id } })
    await db.finding.update({ where: { id: findingId }, data: { updatedAt: new Date('2020-01-01') } })
    await editFindingPhoto(record.inspection.id, record.agent.id, photo.clientId, { findingId }, { note: 'Revised caption', annotations: null })
    expect((await db.finding.findUniqueOrThrow({ where: { id: findingId } })).updatedAt.getTime()).toBeGreaterThan(Date.parse('2020-01-01'))
    await expect(editFindingPhoto(record.inspection.id, record.agent.id, photo.clientId, { findingId }, { annotations: { ...annotation, w: 0 } })).rejects.toThrow()
    // Even a missing marker must not permit deleting bytes an older version names.
    await db.findingPhoto.update({ where: { clientId: photo.clientId }, data: { publishedAt: null } })
    await deleteFinding(findingId, record.inspection.id)
    const tombstone = await db.findingPhoto.findUniqueOrThrow({ where: { clientId: photo.clientId } })
    expect(tombstone).toMatchObject({ findingId: null })
    expect(tombstone.deletedAt).not.toBeNull()
    expect(await db.storagePurge.findUnique({ where: { path: photo.storagePath } })).toBeNull()
    expect((await db.assessmentVersion.findUniqueOrThrow({ where: { id: old.id } })).snapshot).toEqual(old.snapshot)
    const maliciousPurge = await db.storagePurge.create({ data: { path: photo.storagePath, isPrefix: false, readyAt: new Date(0), createdAt: new Date(Date.now() - 4 * 3600_000) } })
    await expect(purgeStorageEntry(maliciousPurge)).rejects.toThrow('still belongs to a report')
    expect(objects.has(photo.storagePath)).toBe(true)
    await expect(createFinding(record.inspection.id, fields(record, photo.draftId))).rejects.toThrow('draft not found')
  })

  it('cleans unsaved personal account drafts while preserving saved and other agents photos', async () => {
    const record = await fixture()
    const saved = await intent(record)
    await register(record, saved)
    const findingId = await createFinding(record.inspection.id, fields(record, saved.draftId))
    const personal = await intent(record)
    const otherDraftId = randomUUID()
    const otherClientId = randomUUID()
    const other = await requestFindingPhotoUpload(record.inspection.id, otherDraftId, record.conductor.id, { clientId: otherClientId, mimeType: 'image/png' })
    paths.push(other.storagePath)
    await retireFindingDraftsForAccount(record.agent.id)
    expect((await findingPhotoDraft(record.inspection.id, personal.draftId, record.agent.id)).state).toBe('DISCARDED')
    expect((await db.findingPhoto.findUniqueOrThrow({ where: { clientId: saved.clientId } })).findingId).toBe(findingId)
    expect((await db.findingPhoto.findUniqueOrThrow({ where: { clientId: otherClientId } })).deletedAt).toBeNull()
    expect(await db.storagePurge.findUnique({ where: { path: personal.storagePath } })).not.toBeNull()
    expect(await db.storagePurge.findUnique({ where: { path: saved.storagePath } })).toBeNull()
  })
})
