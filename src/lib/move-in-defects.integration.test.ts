import { randomUUID } from 'node:crypto'
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/headers', () => ({ headers: async () => new Headers() }))
vi.mock('@/lib/storage', () => ({
  captureExists: vi.fn(async () => true),
  createDownloadUrl: vi.fn(async (path: string) => `https://storage.test/${path}`),
  createUploadUrl: vi.fn(async () => ({ token: 'test', signedUrl: 'https://storage.test/upload' })),
}))
vi.mock('@/lib/auth', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/auth')>()
  return { ...actual, requireAgent: vi.fn(), requireStakeholder: vi.fn(), currentStakeholder: vi.fn() }
})

import { db } from '@/lib/db'
import { currentStakeholder, requireAgent, requireStakeholder } from '@/lib/auth'
import { acknowledgeAddendum, acknowledgeAddendumInPerson, addAddendumEntry, publishAddendum, startAddendum, updateAddendum } from '@/lib/addendum-actions'
import { addendumHash, addendumSnapshotSchema, currentState } from '@/lib/addenda'
import {
  annotateMaintenanceEvidence, createMaintenanceCase, maintenanceCaseDetail, registerMaintenanceEvidence, tenancyDetail, updateTenancyTerms,
} from '@/lib/maintenance'
import { disputeMoveInDefect, publishMoveInDefect } from '@/lib/move-in-defects'
import { moveInDefectWindow } from '@/lib/move-in-defect-window'
import { signedReport } from '@/lib/report'
import { startCheckOut } from '@/lib/actions'
import { roomBaselineSchema } from '@/lib/check-in-reference'
import * as publishRoute from '@/app/api/v1/maintenance/[caseId]/move-in-defect/route'
import * as disputeRoute from '@/app/api/v1/addenda/[id]/dispute/route'
import * as acknowledgeRoute from '@/app/api/v1/addenda/[id]/acknowledgement/route'
import type { Stakeholder } from '@/generated/prisma'

const tag = randomUUID()
const people: string[] = []
const properties: string[] = []
const DAY = 86_400_000

async function fixture({ agentManaged = true, signed = true } = {}) {
  const [landlord, tenant, agent, stranger] = await Promise.all(['landlord', 'tenant', 'agent', 'stranger'].map(async (role) => {
    const row = await db.stakeholder.create({ data: { name: `Move-in ${role} ${tag}` } })
    people.push(row.id)
    return row
  }))
  const property = await db.property.create({ data: { line1: `Move-in ${tag}`, postalCode: '997734', type: 'HDB' } })
  properties.push(property.id)
  const now = new Date()
  const sgDay = new Date(now.getTime() + 8 * 3_600_000).toISOString().slice(0, 10)
  const tenancy = await db.tenancy.create({
    data: {
      propertyId: property.id, landlordId: landlord.id, tenantId: tenant.id, agentId: agentManaged ? agent.id : null,
      startDate: new Date(new Date(sgDay).getTime() - 4 * DAY), endDate: new Date('2099-12-31'), monthlyRent: '3000', deposit: '6000',
    },
  })
  const inspection = await db.inspection.create({
    data: { tenancyId: tenancy.id, kind: 'CHECK_IN', status: signed ? 'COMPLETED' : 'AWAITING_SIGNATURE', conductedById: agent.id },
  })
  const room = await db.room.create({ data: { inspectionId: inspection.id, name: 'Kitchen', order: 0, status: 'REVIEWED' } })
  const asset = await db.propertyAsset.create({ data: { propertyId: property.id, name: 'Refrigerator', category: 'APPLIANCE', identifier: 'FR-123' } })
  const item = await db.inspectionItem.create({
    data: { roomId: room.id, name: 'Refrigerator', category: 'APPLIANCE', condition: 'GOOD', quantity: 2, identifier: 'FR-123', notes: 'Silver finish', propertyAssetId: asset.id },
  })
  const meter = await db.inspectionItem.create({
    data: { roomId: room.id, name: 'Water meter', category: 'METER', condition: 'GOOD', meterReading: '128.3' },
  })
  if (signed) await db.signature.createMany({
    data: [landlord, tenant].map((party) => ({ inspectionId: inspection.id, stakeholderId: party.id, imageData: 'data:,' })),
  })
  return { landlord, tenant, agent, stranger, property, tenancy, inspection, room, asset, item, meter }
}

async function report(record: Awaited<ReturnType<typeof fixture>>, wasPresentAtMoveIn = true) {
  return createMaintenanceCase(record.tenancy.id, record.tenant.id, {
    clientId: randomUUID(), category: 'APPLIANCE', title: 'Dent in refrigerator door',
    description: 'A dent on the upper door was already here at handover.', wasPresentAtMoveIn,
    propertyAssetId: record.asset.id,
  })
}

function notice(record: Awaited<ReturnType<typeof fixture>>, evidenceIds: string[] = []) {
  return { targetKey: `item:${record.item.id}`, roomName: record.room.name, condition: 'DAMAGED', evidenceIds }
}

async function photo(caseId: string, stakeholderId: string, extra: { purpose?: 'BEFORE' | 'AFTER'; mimeType?: string } = {}) {
  const clientId = randomUUID()
  return db.maintenanceEvidence.create({
    data: {
      clientId, caseId, uploadedById: stakeholderId, purpose: extra.purpose ?? 'BEFORE',
      storagePath: `maintenance/${caseId}/${clientId}.jpg`, mimeType: extra.mimeType ?? 'image/jpeg', sizeBytes: 100, note: 'Upper door dent',
    },
  })
}

function as(person: Stakeholder) {
  vi.mocked(requireAgent).mockResolvedValue(person)
  vi.mocked(requireStakeholder).mockResolvedValue(person)
  vi.mocked(currentStakeholder).mockResolvedValue(person)
}

afterEach(() => vi.useRealTimers())
afterAll(async () => {
  await db.property.deleteMany({ where: { id: { in: properties } } })
  await db.stakeholder.deleteMany({ where: { id: { in: people } } })
  await db.$disconnect()
})

describe('tenant move-in notices', () => {
  it('lets landlord and tenant handle a notice without an appointed agent, preserving signed evidence and assets', async () => {
    const record = await fixture({ agentManaged: false })
    const created = await report(record)
    const selected = await photo(created.id, record.tenant.id)
    await photo(created.id, record.tenant.id)
    const published = await publishMoveInDefect(created.id, record.tenant.id, notice(record, [selected.id]))
    const frozen = await db.reportAddendum.findUniqueOrThrow({ where: { id: published.addendumId }, include: { acknowledgements: true } })
    const snapshot = addendumSnapshotSchema.parse(frozen.snapshot)
    expect(snapshot.moveInDefect).toMatchObject({ caseId: created.id })
    expect(snapshot.entries[0].photos).toHaveLength(1)
    expect(snapshot.entries[0].photos[0].storagePath).toBe(selected.storagePath)
    expect(addendumHash(snapshot)).toBe(frozen.contentHash)
    expect(frozen.acknowledgements).toMatchObject([{ stakeholderId: record.tenant.id, method: 'OWN_ACCOUNT', contentHash: frozen.contentHash }])
    expect((await currentState(record.inspection.id, { acknowledgedOnly: true }))[0].lines[0].condition).toBe('GOOD')
    expect((await currentState(record.inspection.id, { acknowledgedOnly: false }))[0].lines[0].condition).toBe('GOOD')

    as(record.agent)
    await expect(acknowledgeAddendumInPerson(published.addendumId, record.landlord.id)).rejects.toThrow('Addendum not found')
    as(record.landlord)
    await acknowledgeAddendum(published.addendumId)
    await acknowledgeAddendum(published.addendumId)
    expect(await db.notification.count({
      where: { dedupeKey: `move-in-defect-acknowledged:${published.addendumId}:${record.tenant.id}` },
    })).toBe(1)
    const state = await currentState(record.inspection.id, { acknowledgedOnly: true })
    expect(state[0].lines[0]).toMatchObject({
      name: record.item.name, condition: 'DAMAGED', quantity: 2, identifier: 'FR-123', propertyAssetId: record.asset.id,
    })
    expect(state[0].addendumPhotos).toMatchObject([{ storagePath: selected.storagePath }])
    expect(await db.inspectionItem.findUniqueOrThrow({ where: { id: record.item.id } })).toMatchObject({ condition: 'GOOD', notes: 'Silver finish' })
    expect(await db.propertyAsset.findUniqueOrThrow({ where: { id: record.asset.id } })).toMatchObject({ active: true })
    expect(await db.propertyAsset.count({ where: { propertyId: record.property.id } })).toBe(1)

    const laterId = randomUUID()
    await registerMaintenanceEvidence(created.id, record.tenant.id, {
      clientId: laterId, purpose: 'BEFORE', mimeType: 'image/jpeg', sizeBytes: 120,
      storagePath: `maintenance/${created.id}/${laterId}.jpg`,
    })
    const unchanged = await db.reportAddendum.findUniqueOrThrow({ where: { id: published.addendumId } })
    expect(unchanged.snapshot).toEqual(frozen.snapshot)
    expect(unchanged.contentHash).toBe(frozen.contentHash)
    const detail = await maintenanceCaseDetail(created.id, record.landlord.id)
    expect(detail.moveInDefect).toMatchObject({ addendumId: published.addendumId, status: 'ACKNOWLEDGED', canRespond: false })
  })

  it('carries the marks on a repair photo into the notice by value', async () => {
    const record = await fixture()
    const created = await report(record)
    const clientId = randomUUID()
    const ring = { w: 800, h: 600, marks: [{ shape: 'ring' as const, cx: .5, cy: .5, rx: .2, ry: .1, note: 'Dent' }] }
    const registration = {
      clientId, purpose: 'BEFORE', mimeType: 'image/jpeg', sizeBytes: 120,
      storagePath: `maintenance/${created.id}/${clientId}.jpg`, annotations: ring,
    }
    const { id } = await registerMaintenanceEvidence(created.id, record.tenant.id, registration)
    // A retry whose response was lost says whether its marks still need sending.
    expect(await registerMaintenanceEvidence(created.id, record.tenant.id, registration)).toEqual({ id, annotationsApplied: true })
    expect(await registerMaintenanceEvidence(created.id, record.tenant.id, { ...registration, annotations: null }))
      .toEqual({ id, annotationsApplied: false })

    const tenantView = await maintenanceCaseDetail(created.id, record.tenant.id)
    expect(tenantView.evidence).toMatchObject([{ id, canMark: true, annotations: { ...ring, v: 1, by: record.tenant.id } }])
    expect((await maintenanceCaseDetail(created.id, record.landlord.id)).evidence).toMatchObject([{ id, canMark: false }])
    for (const person of [record.landlord, record.agent, record.stranger]) {
      await expect(annotateMaintenanceEvidence(created.id, id, person.id, { annotations: null })).rejects.toThrow()
    }
    const receipt = await photo(created.id, record.tenant.id, { mimeType: 'application/pdf' })
    await expect(annotateMaintenanceEvidence(created.id, receipt.id, record.tenant.id, { annotations: ring }))
      .rejects.toThrow('Only a photo can be marked')

    const published = await publishMoveInDefect(created.id, record.tenant.id, notice(record, [id]))
    const frozen = await db.reportAddendum.findUniqueOrThrow({ where: { id: published.addendumId } })
    expect(addendumSnapshotSchema.parse(frozen.snapshot).entries[0].photos).toMatchObject([{ annotations: { marks: [{ note: 'Dent' }] } }])
    expect(addendumHash(frozen.snapshot)).toBe(frozen.contentHash)
    expect((await signedReport(record.inspection.id, record.landlord.id)).addenda[0].entries[0].photos)
      .toMatchObject([{ annotations: { marks: [{ note: 'Dent' }] } }])

    // Marking the repair photo again never rewrites what was published.
    await annotateMaintenanceEvidence(created.id, id, record.tenant.id, { annotations: null })
    expect((await maintenanceCaseDetail(created.id, record.tenant.id)).evidence[0].annotations).toBeNull()
    expect((await db.reportAddendum.findUniqueOrThrow({ where: { id: published.addendumId } })).snapshot).toEqual(frozen.snapshot)
    expect(await db.reportAddendumPhoto.findFirstOrThrow({ where: { maintenanceEvidenceId: id } }))
      .toMatchObject({ annotations: { marks: [{ note: 'Dent' }] } })

    as(record.landlord)
    await acknowledgeAddendum(published.addendumId)
    const state = await currentState(record.inspection.id, { acknowledgedOnly: true })
    expect(state[0].addendumPhotos).toMatchObject([{ annotations: { marks: [{ note: 'Dent' }] } }])
  })

  it('keeps disputing landlord-only, final and outside the agreed baseline', async () => {
    const record = await fixture()
    const created = await report(record)
    const published = await publishMoveInDefect(created.id, record.tenant.id, notice(record))
    const before = await db.reportAddendum.findUniqueOrThrow({ where: { id: published.addendumId } })
    for (const person of [record.tenant, record.agent, record.stranger]) {
      await expect(disputeMoveInDefect(published.addendumId, person.id, { reason: 'Not agreed' })).rejects.toThrow('Addendum not found')
    }
    await expect(disputeMoveInDefect(published.addendumId, record.landlord.id, { reason: ' ' })).rejects.toThrow()
    await disputeMoveInDefect(published.addendumId, record.landlord.id, { reason: 'The handover photos show no dent.' })
    await disputeMoveInDefect(published.addendumId, record.landlord.id, { reason: 'The handover photos show no dent.' })
    await expect(disputeMoveInDefect(published.addendumId, record.landlord.id, { reason: 'Changed reason' })).rejects.toThrow('already has a final response')
    as(record.landlord)
    await expect(acknowledgeAddendum(published.addendumId)).rejects.toThrow('Addendum not found')
    const after = await db.reportAddendum.findUniqueOrThrow({ where: { id: published.addendumId } })
    expect(after.contentHash).toBe(before.contentHash)
    expect(after.snapshot).toEqual(before.snapshot)
    expect(after.acknowledgedAt).toBeNull()
    expect((await currentState(record.inspection.id, { acknowledgedOnly: true }))[0].lines[0].condition).toBe('GOOD')
    expect((await currentState(record.inspection.id, { acknowledgedOnly: false }))[0].lines[0].condition).toBe('GOOD')
    const rendered = await signedReport(record.inspection.id, record.landlord.id)
    expect(rendered.addenda[0]).toMatchObject({ source: 'MOVE_IN_DEFECT', acknowledgeAs: null, acknowledgeInPerson: false, dispute: { reason: after.disputeReason } })
  })

  it('reserves a timely server-received report while uploads finish and pins its original check-in', async () => {
    const record = await fixture()
    const created = await report(record)
    const window = moveInDefectWindow(record.tenancy)
    await db.inspection.create({ data: { tenancyId: record.tenancy.id, kind: 'CHECK_IN', status: 'COMPLETED', createdAt: new Date(Date.now() + DAY) } })
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(window.deadline!.getTime() + DAY)
    const detail = await maintenanceCaseDetail(created.id, record.tenant.id)
    expect(detail.moveInDefect.canSubmit).toBe(true)
    const published = await publishMoveInDefect(created.id, record.tenant.id, notice(record))
    expect(published.inspectionId).toBe(record.inspection.id)
    expect(await publishMoveInDefect(created.id, record.tenant.id, notice(record))).toEqual(published)
    await expect(report(record)).rejects.toThrow('window is closed')
  })

  it('rejects non-tenant, foreign, unreserved and invalid-photo claims without leaking another case', async () => {
    const record = await fixture()
    const other = await fixture()
    const created = await report(record)
    const regular = await report(record, false)
    await expect(publishMoveInDefect(regular.id, record.tenant.id, notice(record))).rejects.toThrow('not recorded as a move-in defect')
    for (const person of [record.landlord, record.agent, record.stranger]) {
      const denied = await publishMoveInDefect(created.id, person.id, notice(record)).catch((error: Error) => error.message)
      const missing = await publishMoveInDefect('missing', person.id, notice(record)).catch((error: Error) => error.message)
      expect(denied).toBe(missing)
    }
    const foreignCase = await report(other)
    const foreign = await photo(foreignCase.id, other.tenant.id)
    const landlordPhoto = await photo(created.id, record.landlord.id)
    const after = await photo(created.id, record.tenant.id, { purpose: 'AFTER' })
    const document = await photo(created.id, record.tenant.id, { mimeType: 'application/pdf' })
    for (const id of [foreign.id, landlordPhoto.id, after.id, document.id, 'missing']) {
      await expect(publishMoveInDefect(created.id, record.tenant.id, notice(record, [id]))).rejects.toThrow('photo not found')
    }
    await expect(publishMoveInDefect(created.id, record.tenant.id, { ...notice(record), targetKey: `item:${other.item.id}` })).rejects.toThrow('Check-in item not found')
    await expect(createMaintenanceCase(record.tenancy.id, record.landlord.id, {
      category: 'OTHER', title: 'Claim', description: 'A claim', wasPresentAtMoveIn: true,
    })).rejects.toThrow('Tenancy not found')
  })

  it('publishes a new human-written line once under concurrent retries and preserves targeted meter readings', async () => {
    const record = await fixture()
    const created = await report(record)
    const raw = { targetKey: null, roomName: 'Bathroom', name: 'Basin sealant', category: 'FIXTURE', condition: 'POOR', evidenceIds: [] }
    const [first, second] = await Promise.all([
      publishMoveInDefect(created.id, record.tenant.id, raw), publishMoveInDefect(created.id, record.tenant.id, raw),
    ])
    expect(second).toEqual(first)
    expect(await db.reportAddendum.count({ where: { sourceMaintenanceCaseId: created.id } })).toBe(1)
    as(record.landlord)
    await acknowledgeAddendum(first.addendumId)
    await expect(disputeMoveInDefect(first.addendumId, record.landlord.id, { reason: 'Changed mind' })).rejects.toThrow('already has a final response')
    expect((await currentState(record.inspection.id, { acknowledgedOnly: true })).find((room) => room.name === 'Bathroom')?.lines[0].name).toBe('Basin sealant')
    const meterCase = await report(record)
    const meterNotice = await publishMoveInDefect(meterCase.id, record.tenant.id, { ...notice(record), targetKey: `item:${record.meter.id}`, condition: 'FAIR' })
    await acknowledgeAddendum(meterNotice.addendumId)
    expect((await currentState(record.inspection.id, { acknowledgedOnly: true }))[0].lines.find((line) => line.name === 'Water meter')).toMatchObject({ meterReading: '128.3', condition: 'FAIR' })
  })

  it('locks the configured window at the tenant signature and enforces disabled or unsigned state', async () => {
    const record = await fixture({ signed: false })
    await updateTenancyTerms(record.tenancy.id, record.agent.id, { defectWindowDays: 14 })
    expect((await tenancyDetail(record.tenancy.id, record.agent.id)).moveInDefects).toMatchObject({ windowDays: 14, canEditWindow: true, canSubmit: false })
    await expect(updateTenancyTerms(record.tenancy.id, record.tenant.id, { defectWindowDays: 60 })).rejects.toThrow('Tenancy not found')
    await expect(updateTenancyTerms(record.tenancy.id, record.landlord.id, { defectWindowDays: 366 })).rejects.toThrow()
    await expect(report(record)).rejects.toThrow('countersigned check-in')
    await db.signature.create({ data: { inspectionId: record.inspection.id, stakeholderId: record.tenant.id, imageData: 'data:,' } })
    await expect(updateTenancyTerms(record.tenancy.id, record.landlord.id, { defectWindowDays: 60 })).rejects.toThrow('fixed after the tenant signs')
    expect((await tenancyDetail(record.tenancy.id, record.agent.id)).moveInDefects.canEditWindow).toBe(false)
    const disabled = await fixture()
    await db.tenancy.update({ where: { id: disabled.tenancy.id }, data: { defectWindowDays: 0 } })
    await expect(report(disabled)).rejects.toThrow('window is closed')
  })

  it('blocks any new claim or baseline-changing response after a signed check-out', async () => {
    const record = await fixture()
    const awaitingPublish = await report(record)
    const pendingCase = await report(record)
    const published = await publishMoveInDefect(pendingCase.id, record.tenant.id, notice(record))
    await db.inspection.create({ data: { tenancyId: record.tenancy.id, kind: 'CHECK_OUT', status: 'COMPLETED', baselineId: record.inspection.id } })
    await expect(report(record)).rejects.toThrow('closed after the check-out is signed')
    await expect(publishMoveInDefect(awaitingPublish.id, record.tenant.id, notice(record))).rejects.toThrow('closed after the check-out is signed')
    as(record.landlord)
    await expect(acknowledgeAddendum(published.addendumId)).rejects.toThrow('closed after the check-out is signed')
    await expect(disputeMoveInDefect(published.addendumId, record.landlord.id, { reason: 'Not agreed' })).rejects.toThrow('closed after the check-out is signed')
    expect((await maintenanceCaseDetail(pendingCase.id, record.landlord.id)).moveInDefect.canRespond).toBe(false)
    expect(await publishMoveInDefect(pendingCase.id, record.tenant.id, notice(record))).toEqual(published)
  })

  it('keeps native routes thin with the same 404 and final-response behavior', async () => {
    const record = await fixture()
    const created = await report(record)
    const request = () => new Request('http://localhost/api', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(notice(record)) })
    as(record.stranger)
    const forbidden = await publishRoute.POST(request(), { params: Promise.resolve({ caseId: created.id }) })
    const missing = await publishRoute.POST(request(), { params: Promise.resolve({ caseId: 'missing' }) })
    expect(forbidden.status).toBe(404)
    expect(await forbidden.json()).toEqual(await missing.json())
    as(record.tenant)
    const accepted = await publishRoute.POST(request(), { params: Promise.resolve({ caseId: created.id }) })
    expect(accepted.status).toBe(200)
    const payload = await accepted.json() as { addendumId: string }
    as(record.landlord)
    const response = await disputeRoute.POST(new Request('http://localhost/api', {
      method: 'POST', body: JSON.stringify({ reason: 'The report photo shows a clean door.' }),
    }), { params: Promise.resolve({ id: payload.addendumId }) })
    expect(response.status).toBe(200)
  })

  it('keeps immutable tenant provenance if retention removes its repair reference', async () => {
    const record = await fixture()
    const created = await report(record)
    const published = await publishMoveInDefect(created.id, record.tenant.id, notice(record))
    await db.maintenanceCase.delete({ where: { id: created.id } })
    const row = await db.reportAddendum.findUniqueOrThrow({ where: { id: published.addendumId } })
    expect(row.sourceMaintenanceCaseId).toBeNull()
    expect((await signedReport(record.inspection.id, record.agent.id)).addenda[0].source).toBe('MOVE_IN_DEFECT')
    expect((await currentState(record.inspection.id, { acknowledgedOnly: false }))[0].lines[0].condition).toBe('GOOD')
    as(record.agent)
    await expect(acknowledgeAddendumInPerson(published.addendumId, record.landlord.id)).rejects.toThrow('Addendum not found')
    await disputeMoveInDefect(published.addendumId, record.landlord.id, { reason: 'The baseline photo shows no dent.' })
    expect((await db.reportAddendum.findUniqueOrThrow({ where: { id: published.addendumId } })).disputedAt).not.toBeNull()
  })

  it.each(['forward', 'reverse'])('accepts two notices about one physical item in %s order without duplicating its baseline', async (order) => {
    const record = await fixture()
    const firstCase = await report(record)
    const secondCase = await createMaintenanceCase(record.tenancy.id, record.tenant.id, {
      category: 'APPLIANCE', title: 'Scratch beside the handle', description: 'A deep scratch beside the handle was present at handover.',
      propertyAssetId: record.asset.id, wasPresentAtMoveIn: true,
    })
    const firstPhoto = await photo(firstCase.id, record.tenant.id)
    const secondPhoto = await photo(secondCase.id, record.tenant.id)
    const first = await publishMoveInDefect(firstCase.id, record.tenant.id, notice(record, [firstPhoto.id]))
    const second = await publishMoveInDefect(secondCase.id, record.tenant.id, { ...notice(record, [secondPhoto.id]), condition: 'POOR' })
    const frozen = await db.reportAddendum.findMany({ where: { id: { in: [first.addendumId, second.addendumId] } }, orderBy: { number: 'asc' } })
    as(record.landlord)
    for (const id of order === 'forward' ? [first.addendumId, second.addendumId] : [second.addendumId, first.addendumId]) {
      await acknowledgeAddendum(id)
    }
    const state = await currentState(record.inspection.id, { acknowledgedOnly: true })
    const refrigerators = state.flatMap((room) => room.lines).filter((line) => line.name === 'Refrigerator')
    expect(refrigerators).toHaveLength(1)
    expect(refrigerators[0]).toMatchObject({ key: `item:${record.item.id}`, quantity: 2, identifier: 'FR-123', propertyAssetId: record.asset.id, condition: 'POOR', updatedByAddendum: true })
    expect(refrigerators[0].notes).toContain('A dent on the upper door was already here at handover.')
    expect(refrigerators[0].notes).toContain('A deep scratch beside the handle was present at handover.')
    expect(refrigerators[0].notes?.match(/Silver finish/g)).toHaveLength(1)
    expect(state[0].addendumPhotos).toHaveLength(2)
    const after = await db.reportAddendum.findMany({ where: { id: { in: [first.addendumId, second.addendumId] } }, orderBy: { number: 'asc' } })
    expect(after.map((row) => [row.snapshot, row.contentHash])).toEqual(frozen.map((row) => [row.snapshot, row.contentHash]))
    as(record.agent)
    const checkoutId = await startCheckOut(record.inspection.id)
    const copied = await db.room.findFirstOrThrow({ where: { inspectionId: checkoutId, name: 'Kitchen' }, include: { items: true } })
    expect(copied.items.filter((line) => line.name === 'Refrigerator')).toHaveLength(1)
    expect(roomBaselineSchema.parse(copied.baseline).lines.find((line) => line.name === 'Refrigerator')).toMatchObject({ key: `item:${record.item.id}`, condition: 'POOR', update: true })
    expect(roomBaselineSchema.parse(copied.baseline).photos).toHaveLength(2)
  })

  it.each(['REPLACED', 'REMOVED'] as const)('rejects accepting a stale notice after an agreed agent %s change and still permits a dispute', async (change) => {
    const record = await fixture()
    const created = await report(record)
    const pending = await publishMoveInDefect(created.id, record.tenant.id, notice(record))
    const frozen = await db.reportAddendum.findUniqueOrThrow({ where: { id: pending.addendumId } })
    as(record.agent)
    const replacementId = await startAddendum(record.inspection.id)
    await updateAddendum(replacementId, { title: 'Changed refrigerator', reason: null, effectiveDate: new Date().toISOString().slice(0, 10) })
    await addAddendumEntry(replacementId, {
      change, targetKey: `item:${record.item.id}`, roomName: 'Kitchen',
      ...(change === 'REPLACED' ? { name: 'New refrigerator', category: 'APPLIANCE', condition: 'NEW', identifier: 'FR-NEW' } : {}),
    })
    await publishAddendum(replacementId)
    as(record.tenant)
    await acknowledgeAddendum(replacementId)
    as(record.landlord)
    await acknowledgeAddendum(replacementId)
    await expect(acknowledgeAddendum(pending.addendumId)).rejects.toThrow('has since been replaced or removed')
    const refused = await acknowledgeRoute.POST(new Request('http://localhost/api', { method: 'POST' }), { params: Promise.resolve({ id: pending.addendumId }) })
    expect(refused.status).toBe(409)
    expect(await refused.json()).toEqual({ error: 'move_in_defect_stale_target' })
    const unacknowledged = await db.reportAddendum.findUniqueOrThrow({ where: { id: pending.addendumId }, include: { acknowledgements: true } })
    expect(unacknowledged.acknowledgedAt).toBeNull()
    expect(unacknowledged.acknowledgements).toHaveLength(1)
    expect(unacknowledged.snapshot).toEqual(frozen.snapshot)
    expect(unacknowledged.contentHash).toBe(frozen.contentHash)
    const state = await currentState(record.inspection.id, { acknowledgedOnly: true })
    expect(state.flatMap((room) => room.lines).filter((line) => line.name === 'Refrigerator')).toHaveLength(0)
    if (change === 'REPLACED') expect(state[0].lines[0]).toMatchObject({ name: 'New refrigerator', condition: 'NEW', identifier: 'FR-NEW' })
    await disputeMoveInDefect(pending.addendumId, record.landlord.id, { reason: 'The original appliance is no longer in the agreed inventory.' })
    expect((await db.reportAddendum.findUniqueOrThrow({ where: { id: pending.addendumId } })).disputedAt).not.toBeNull()
  })
})
