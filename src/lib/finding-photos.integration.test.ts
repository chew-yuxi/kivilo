import { randomUUID } from 'node:crypto'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

const { storageRemove } = vi.hoisted(() => ({ storageRemove: vi.fn(async () => ({ error: null })) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/storage', () => ({
  CAPTURE_BUCKET: 'captures',
  serviceClient: () => ({ storage: { from: () => ({ remove: storageRemove }) } }),
  createUploadUrl: vi.fn(async () => ({ signedUrl: 'https://storage.test/upload', token: 'token' })),
  captureExists: vi.fn(async () => true),
  createDownloadUrl: vi.fn(async (path: string) => `https://storage.test/${path}`),
  removePrefix: vi.fn(),
}))
vi.mock('@/lib/auth', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/auth')>()
  return { ...actual, requireAgent: vi.fn(), currentStakeholder: vi.fn() }
})

import { db } from '@/lib/db'
import { requireAgent, currentStakeholder } from '@/lib/auth'
import { captureExists, createUploadUrl } from '@/lib/storage'
import { createFinding, deleteFinding, requestUploadUrl } from '@/lib/actions'
import { findingPhotos, registerFindingPhoto, requestFindingPhotoUpload } from '@/lib/finding-photos'
import { publishAssessment } from '@/lib/assessment-actions'
import { assessmentSnapshotSchema } from '@/lib/assessment-schema'
import { reportFingerprint } from '@/lib/report-fingerprint'
import { reportInclude, signedReport } from '@/lib/report'
import { ReportDocument } from '@/components/report-document'
import { purgeStorageEntry } from '../../scripts/purge-storage'
import * as photoRoute from '@/app/api/v1/inspections/[id]/findings/[findingId]/photos/route'
import * as uploadRoute from '@/app/api/v1/inspections/[id]/findings/[findingId]/upload-url/route'
import * as findingRoute from '@/app/api/v1/inspections/[id]/findings/route'
import type { InspectionStatus, Stakeholder } from '@/generated/prisma'

const postalCode = '992183'
const people: string[] = []
const teams: string[] = []
const paths: string[] = []
const marks = { w: 1200, h: 800, marks: [{ shape: 'ring' as const, cx: 0.3, cy: 0.4, rx: 0.1, ry: 0.1, note: 'Deep chip on the edge' }] }

function as(person: Stakeholder) {
  vi.mocked(requireAgent).mockResolvedValue(person)
  vi.mocked(currentStakeholder).mockResolvedValue(person)
}

async function deal(status: InspectionStatus = 'COMPLETED') {
  const team = await db.team.create({ data: { name: `Finding photos ${randomUUID()}` } })
  teams.push(team.id)
  const [agent, teammate, landlord, tenant, stranger] = await Promise.all(['agent', 'teammate', 'landlord', 'tenant', 'stranger'].map(async (role) => {
    const row = await db.stakeholder.create({ data: { name: `Finding photo ${role}`, teamId: ['agent', 'teammate'].includes(role) ? team.id : null } })
    people.push(row.id)
    return row
  }))
  const property = await db.property.create({ data: { line1: 'Finding evidence', postalCode, type: 'HDB' } })
  const tenancy = await db.tenancy.create({ data: {
    propertyId: property.id, landlordId: landlord.id, tenantId: tenant.id, agentId: agent.id,
    startDate: new Date('2024-01-01'), endDate: new Date('2026-01-01'), monthlyRent: '1000', deposit: '2000',
  } })
  const baseline = await db.inspection.create({ data: { tenancyId: tenancy.id, kind: 'CHECK_IN', status: 'COMPLETED' } })
  const baselineRoom = await db.room.create({ data: { inspectionId: baseline.id, name: 'Kitchen', order: 0, status: 'REVIEWED' } })
  const baselineItem = await db.inspectionItem.create({ data: { roomId: baselineRoom.id, name: 'Hob', category: 'APPLIANCE', condition: 'GOOD', editedByHuman: true } })
  const inspection = await db.inspection.create({ data: { tenancyId: tenancy.id, baselineId: baseline.id, kind: 'CHECK_OUT', status } })
  const room = await db.room.create({ data: { inspectionId: inspection.id, name: 'Kitchen', order: 0, status: 'REVIEWED' } })
  const item = await db.inspectionItem.create({ data: { roomId: room.id, name: 'Hob', category: 'APPLIANCE', condition: 'DAMAGED', editedByHuman: true, baselineKey: `item:${baselineItem.id}` } })
  as(agent)
  const finding = await db.finding.create({ data: { inspectionId: inspection.id, itemId: item.id, baselineItemId: baselineItem.id, changeType: 'DAMAGE', verdict: 'TENANT_LIABLE', rationale: 'A chip in the hob', editedByHuman: true } })
  return { agent, teammate, landlord, tenant, stranger, inspection, baseline, baselineItem, room, item, finding }
}

async function upload(findingId: string, inspectionId: string, annotations: typeof marks | null = marks) {
  const clientId = randomUUID()
  const result = await requestFindingPhotoUpload(findingId, inspectionId, { clientId, mimeType: 'image/jpeg' })
  paths.push(result.storagePath)
  return { clientId, mimeType: 'image/jpeg', storagePath: result.storagePath, sizeBytes: 1000, note: 'Hob corner', annotations }
}

async function call(handler: typeof photoRoute.POST, id: string, findingId: string, body?: unknown) {
  const response = await handler(new Request('http://kivilo.test/api/v1', {
    method: body === undefined ? 'GET' : 'POST',
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }), { params: Promise.resolve({ id, findingId }) })
  return { status: response.status, body: await response.json() }
}

async function callCreate(id: string, body: unknown) {
  const response = await findingRoute.POST(new Request('http://kivilo.test/api/v1', {
    method: 'POST', body: JSON.stringify(body),
  }), { params: Promise.resolve({ id }) })
  return { status: response.status, body: await response.json() }
}

beforeEach(() => { vi.mocked(captureExists).mockResolvedValue(true) })
afterAll(async () => {
  await db.storagePurge.deleteMany({ where: { path: { in: paths } } })
  await db.property.deleteMany({ where: { postalCode } })
  await db.stakeholder.deleteMany({ where: { id: { in: people } } })
  await db.team.deleteMany({ where: { id: { in: teams } } })
  await db.$disconnect()
})

describe('finding photo evidence', () => {
  it('registers marked evidence after countersignature without changing the signed inventory or fingerprint', async () => {
    const { inspection, finding, agent, room, landlord } = await deal()
    const before = await reportFingerprint(db, inspection.id)
    const input = await upload(finding.id, inspection.id)
    const [first, retry] = await Promise.all([
      registerFindingPhoto(finding.id, inspection.id, input),
      registerFindingPhoto(finding.id, inspection.id, input),
    ])
    expect(retry).toEqual(first)
    expect(first.annotationsApplied).toBe(true)
    const row = await db.findingPhoto.findUniqueOrThrow({ where: { id: first.id } })
    expect(row.annotations).toMatchObject({ ...marks, v: 1, by: agent.id, at: expect.any(String) })
    expect(await reportFingerprint(db, inspection.id)).toBe(before)
    expect(await db.capture.count({ where: { roomId: room.id } })).toBe(0)
    await expect(requestUploadUrl(room.id, inspection.id, 'photo.jpg', randomUUID())).rejects.toThrow('has been countersigned')
    const photos = await findingPhotos(finding.id, inspection.id)
    expect(photos.photos).toEqual([expect.objectContaining({ id: first.id, note: input.note, annotations: row.annotations, url: expect.stringContaining(input.storagePath) })])
    const publications = await Promise.all([publishAssessment(inspection.id), publishAssessment(inspection.id)])
    expect(publications.map((version) => version.version)).toEqual([1, 1])
    const report = await signedReport(inspection.id, landlord.id)
    expect(report.assessment?.findings[0].photos).toEqual([expect.objectContaining({ note: input.note, annotations: row.annotations })])
    const markup = renderToStaticMarkup(await ReportDocument({
      inspection: await db.inspection.findUniqueOrThrow({ where: { id: inspection.id }, include: reportInclude }), pdfHref: null,
    }))
    expect(markup).toContain('Hob corner')
    expect(markup).toContain('1. Deep chip on the edge')
    expect(markup).toContain('viewBox="0 0 1200 800"')
  })

  it('supports a missing item with no check-out item or room dependency and stable create retries', async () => {
    const { inspection, baselineItem, finding } = await deal()
    await deleteFinding(finding.id, inspection.id)
    const data = { clientId: randomUUID(), itemId: null, baselineItemId: baselineItem.id, changeType: 'MISSING' as const, verdict: 'TENANT_LIABLE' as const, rationale: 'The hob was removed', estimatedCost: '500' }
    const [id, retried] = await Promise.all([createFinding(inspection.id, data), createFinding(inspection.id, data)])
    expect(retried).toBe(id)
    await expect(createFinding(inspection.id, { ...data, estimatedCost: '500.00' })).resolves.toBe(id)
    for (const changed of [{ rationale: 'Different account' }, { estimatedCost: '550' }, { verdict: 'DISPUTED' as const }, { changeType: 'WEAR' as const }]) {
      await expect(createFinding(inspection.id, { ...data, ...changed })).rejects.toThrow('Finding client id already registered with different content')
    }
    expect((await db.finding.findUniqueOrThrow({ where: { id } })).rationale).toBe(data.rationale)
    await db.room.deleteMany({ where: { inspectionId: inspection.id } })
    const input = await upload(id, inspection.id)
    await registerFindingPhoto(id, inspection.id, input)
    await publishAssessment(inspection.id)
    const version = await db.assessmentVersion.findFirstOrThrow({ where: { inspectionId: inspection.id } })
    expect(assessmentSnapshotSchema.parse(version.snapshot).findings[0]).toMatchObject({ itemLabel: 'Kitchen, Hob', changeType: 'MISSING', photos: [{ storagePath: input.storagePath }] })
  })

  it('uses the same missing response for unauthorized, mismatched and unknown ids while teammates can attach', async () => {
    const { inspection, finding, teammate, stranger, landlord } = await deal()
    const input = await upload(finding.id, inspection.id)
    for (const viewer of [stranger, landlord]) {
      as(viewer)
      expect(await call(photoRoute.GET, inspection.id, finding.id)).toEqual({ status: 404, body: { error: 'not_found' } })
      expect(await call(photoRoute.POST, inspection.id, finding.id, input)).toEqual({ status: 404, body: { error: 'not_found' } })
      expect(await call(uploadRoute.POST, inspection.id, finding.id, { clientId: randomUUID(), mimeType: 'image/jpeg' })).toEqual({ status: 404, body: { error: 'not_found' } })
    }
    as(teammate)
    expect(await call(photoRoute.GET, inspection.id, 'missing')).toEqual({ status: 404, body: { error: 'not_found' } })
    expect(await call(photoRoute.GET, 'missing', finding.id)).toEqual({ status: 404, body: { error: 'not_found' } })
    expect((await call(photoRoute.POST, inspection.id, finding.id, input)).status).toBe(200)
  })

  it('requires a reviewed check-out but permits awaiting-signature assessment evidence', async () => {
    const { inspection, finding, baseline } = await deal('REVIEW')
    await expect(upload(finding.id, inspection.id)).rejects.toThrow('Findings require a reviewed check-out')
    await db.finding.update({ where: { id: finding.id }, data: { inspectionId: baseline.id } })
    await expect(upload(finding.id, baseline.id)).rejects.toThrow('Findings require a reviewed check-out')
    await db.finding.update({ where: { id: finding.id }, data: { inspectionId: inspection.id } })
    await db.inspection.update({ where: { id: inspection.id }, data: { status: 'AWAITING_SIGNATURE' } })
    const input = await upload(finding.id, inspection.id)
    await expect(registerFindingPhoto(finding.id, inspection.id, input)).resolves.toMatchObject({ annotationsApplied: true })
    await expect(publishAssessment(inspection.id)).rejects.toThrow('Complete the check-out inventory')
  })

  it('never reports a foreign finding or photo client id as a content conflict', async () => {
    const first = await deal()
    const photo = await upload(first.finding.id, first.inspection.id)
    await registerFindingPhoto(first.finding.id, first.inspection.id, photo)
    const clientId = randomUUID()
    await db.finding.update({ where: { id: first.finding.id }, data: { clientId } })
    const second = await deal()
    const missing = { status: 404, body: { error: 'not_found' } }
    expect(await call(uploadRoute.POST, second.inspection.id, second.finding.id, {
      clientId: photo.clientId, mimeType: photo.mimeType,
    })).toEqual(missing)
    expect(await call(photoRoute.POST, second.inspection.id, second.finding.id, {
      ...photo, storagePath: `findings/${second.finding.id}/${photo.clientId}.jpg`,
    })).toEqual(missing)
    expect(await callCreate(second.inspection.id, {
      clientId, itemId: second.item.id, baselineItemId: null, changeType: 'DAMAGE',
      verdict: 'TENANT_LIABLE', rationale: 'A chip in the hob', estimatedCost: null,
    })).toEqual(missing)
    // Another finding in the same inspection is also a different photo target.
    as(first.agent)
    const other = await db.finding.create({ data: {
      inspectionId: first.inspection.id, itemId: first.item.id, changeType: 'DAMAGE', rationale: 'Another finding',
    } })
    expect(await call(uploadRoute.POST, first.inspection.id, other.id, {
      clientId: photo.clientId, mimeType: photo.mimeType,
    })).toEqual(missing)
    expect(await call(photoRoute.POST, first.inspection.id, other.id, {
      ...photo, storagePath: `findings/${other.id}/${photo.clientId}.jpg`,
    })).toEqual(missing)
    // The actual owner still receives a content conflict for changing its retry.
    expect((await call(photoRoute.POST, first.inspection.id, first.finding.id, { ...photo, note: 'Different caption' })).status).toBe(409)
    expect((await call(uploadRoute.POST, first.inspection.id, first.finding.id, { clientId: photo.clientId, mimeType: 'image/png' })).status).toBe(409)
  })

  it('serializes concurrent creation with the same client id across different inspection locks', async () => {
    const first = await deal()
    const second = await deal()
    await db.inspection.update({ where: { id: second.inspection.id }, data: { conductedById: first.agent.id } })
    as(first.agent)
    const clientId = randomUUID()
    const results = await Promise.all([first, second].map((target) => callCreate(target.inspection.id, {
      clientId, itemId: target.item.id, baselineItemId: null, changeType: 'DAMAGE',
      verdict: 'TENANT_LIABLE', rationale: 'A chip in the hob', estimatedCost: null,
    })))
    expect(results.map((result) => result.status).sort()).toEqual([200, 404])
    expect(results.find((result) => result.status === 404)?.body).toEqual({ error: 'not_found' })
    expect(await db.finding.count({ where: { clientId } })).toBe(1)
  })

  it('serializes concurrent photo registration across inspections without a uniqueness error or foreign identity', async () => {
    const first = await deal()
    const second = await deal()
    await db.inspection.update({ where: { id: second.inspection.id }, data: { conductedById: first.agent.id } })
    as(first.agent)
    const clientId = randomUUID()
    const targets = [first, second]
    const uploads = await Promise.all(targets.map((target) =>
      requestFindingPhotoUpload(target.finding.id, target.inspection.id, { clientId, mimeType: 'image/jpeg' })))
    paths.push(...uploads.map((photo) => photo.storagePath))
    const results = await Promise.all(targets.map((target, index) => call(photoRoute.POST, target.inspection.id, target.finding.id, {
      clientId, mimeType: 'image/jpeg', storagePath: uploads[index].storagePath, sizeBytes: 1000, note: null, annotations: marks,
    })))
    expect(results.map((result) => result.status).sort()).toEqual([200, 404])
    expect(results.find((result) => result.status === 404)?.body).toEqual({ error: 'not_found' })
    expect(await db.findingPhoto.count({ where: { clientId } })).toBe(1)
  })

  it('validates paths, upload intent, bytes and marks, and never changes immutable media on replay', async () => {
    const { inspection, finding } = await deal()
    const input = await upload(finding.id, inspection.id)
    await expect(registerFindingPhoto(finding.id, inspection.id, { ...input, storagePath: 'another/photo.jpg' })).rejects.toThrow('Photo path')
    await expect(registerFindingPhoto(finding.id, inspection.id, { ...input, annotations: { ...marks, marks: [{ shape: 'ring', cx: 2, cy: 0, rx: 1, ry: 1 }] } })).rejects.toThrow()
    vi.mocked(captureExists).mockResolvedValue(false)
    await expect(registerFindingPhoto(finding.id, inspection.id, input)).rejects.toThrow('Photo has not reached storage')
    vi.mocked(captureExists).mockResolvedValue(true)
    const registered = await registerFindingPhoto(finding.id, inspection.id, input)
    for (const changed of [{ note: 'Changed' }, { annotations: null }, { sizeBytes: 2000 }]) {
      await expect(registerFindingPhoto(finding.id, inspection.id, { ...input, ...changed })).rejects.toThrow('already registered with different media')
    }
    const unrequested = randomUUID()
    await expect(registerFindingPhoto(finding.id, inspection.id, { ...input, clientId: unrequested, storagePath: `findings/${finding.id}/${unrequested}.jpg` })).rejects.toThrow('Photo not found')
    expect((await db.findingPhoto.findUniqueOrThrow({ where: { id: registered.id } })).note).toBe(input.note)
  })

  it('preserves issued intents, blocks publication until registration, then freezes every version and retains published bytes on delete', async () => {
    const { inspection, finding } = await deal()
    vi.mocked(captureExists).mockResolvedValue(false)
    const first = await upload(finding.id, inspection.id)
    expect(createUploadUrl).toHaveBeenCalledWith(first.storagePath)
    expect((await db.finding.findUniqueOrThrow({ where: { id: finding.id } })).uploadPaths).toContain(first.storagePath)
    await expect(publishAssessment(inspection.id)).rejects.toThrow('Finding photos are still uploading')
    vi.mocked(captureExists).mockResolvedValue(true)
    await registerFindingPhoto(finding.id, inspection.id, first)
    await publishAssessment(inspection.id)
    const v1 = await db.assessmentVersion.findFirstOrThrow({ where: { inspectionId: inspection.id, version: 1 } })
    const second = await upload(finding.id, inspection.id, null)
    await registerFindingPhoto(finding.id, inspection.id, second)
    await publishAssessment(inspection.id)
    expect(await db.assessmentVersion.findUniqueOrThrow({ where: { id: v1.id } })).toEqual(v1)
    const v2 = await db.assessmentVersion.findFirstOrThrow({ where: { inspectionId: inspection.id, version: 2 } })
    expect(assessmentSnapshotSchema.parse(v2.snapshot).findings[0].photos).toHaveLength(2)
    // One unfinished upload and one completed but unpublished upload are discarded.
    const unfinished = await upload(finding.id, inspection.id)
    const unpublished = await upload(finding.id, inspection.id)
    await registerFindingPhoto(finding.id, inspection.id, unpublished)
    await deleteFinding(finding.id, inspection.id)
    const queued = await db.storagePurge.findMany({ where: { path: { in: [first.storagePath, second.storagePath, unfinished.storagePath, unpublished.storagePath] } } })
    expect(queued.map((row) => row.path).sort()).toEqual([unfinished.storagePath, unpublished.storagePath].sort())
    expect(queued.every((row) => !row.isPrefix && row.readyAt.getTime() - row.createdAt.getTime() >= 3 * 60 * 60 * 1000 - 1000)).toBe(true)
    expect(await db.assessmentVersion.findUniqueOrThrow({ where: { id: v1.id } })).toEqual(v1)
    await expect(registerFindingPhoto(finding.id, inspection.id, unfinished)).rejects.toThrow('Finding not found')
    // Even an erroneous cleanup tombstone cannot purge published evidence after
    // its mutable FindingPhoto row has been removed with the draft.
    const old = new Date(Date.now() - 4 * 60 * 60 * 1000)
    const protectedPurge = await db.storagePurge.create({ data: { path: first.storagePath, isPrefix: false, readyAt: old, createdAt: old } })
    storageRemove.mockClear()
    await expect(purgeStorageEntry(protectedPurge)).rejects.toThrow('still belongs to a report')
    expect(storageRemove).not.toHaveBeenCalled()
  })
})
