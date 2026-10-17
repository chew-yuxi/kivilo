import { randomUUID } from 'node:crypto'
import { afterAll, describe, expect, it, vi } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/auth', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/auth')>()
  return { ...actual, requireAgent: vi.fn() }
})

import { db } from '@/lib/db'
import { requireAgent } from '@/lib/auth'
import { CAPTURE_BUCKET, captureExists, serviceClient, uploadBytes } from '@/lib/storage'
import {
  addAddendumEntry, deleteAddendumEntry, discardAddendum, registerAddendumPhoto,
  requestAddendumPhotoUpload, startAddendum,
} from '@/lib/addendum-actions'
import { purgeStorageEntry } from '../../scripts/purge-storage'

const properties: string[] = []
const people: string[] = []
const paths: string[] = []
const tombstones: string[] = []
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j/o0AAAAASUVORK5CYII=', 'base64')

async function draft() {
  const database = new URL(process.env.DATABASE_URL ?? '')
  const supabase = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '')
  if (database.hostname !== '127.0.0.1' || database.port !== '56322' ||
      supabase.hostname !== '127.0.0.1' || supabase.port !== '56321') {
    throw new Error('Addendum Storage tests may run only against local Supabase')
  }
  const parties = await Promise.all(['Agent', 'Landlord', 'Tenant'].map((role) =>
    db.stakeholder.create({ data: { name: `Addendum Storage ${role} ${randomUUID()}` } })))
  people.push(...parties.map((party) => party.id))
  const [agent, landlord, tenant] = parties
  vi.mocked(requireAgent).mockResolvedValue(agent)
  const property = await db.property.create({ data: { line1: 'Addendum Storage test', postalCode: '997702', type: 'HDB' } })
  properties.push(property.id)
  const tenancy = await db.tenancy.create({ data: {
    propertyId: property.id, landlordId: landlord.id, tenantId: tenant.id, agentId: agent.id,
    startDate: new Date('2026-01-01'), endDate: new Date('2099-01-01'), monthlyRent: '3000', deposit: '6000',
  } })
  const inspection = await db.inspection.create({ data: { tenancyId: tenancy.id, kind: 'CHECK_IN', status: 'COMPLETED' } })
  const id = await startAddendum(inspection.id)
  return { id, entryId: await addEntry(id, 'Oven') }
}

function addEntry(id: string, name: string) {
  return addAddendumEntry(id, { change: 'ADDED', roomName: 'Kitchen', name, category: 'APPLIANCE', condition: 'NEW' })
}

async function requestPhoto(entryId: string, id: string) {
  const input = { clientId: randomUUID(), mimeType: 'image/png' }
  const upload = await requestAddendumPhotoUpload(entryId, id, input)
  expect(upload.token).toEqual(expect.any(String))
  paths.push(upload.storagePath)
  return { input, ...upload }
}

async function lateUpload(upload: Awaited<ReturnType<typeof requestPhoto>>) {
  const result = await serviceClient().storage.from(CAPTURE_BUCKET)
    .uploadToSignedUrl(upload.storagePath, upload.token!, png, { contentType: 'image/png' })
  if (result.error) throw result.error
  expect(await captureExists(upload.storagePath)).toBe(true)
}

async function expireWindow(path: string) {
  return db.storagePurge.update({
    where: { path },
    data: { readyAt: new Date(Date.now() - 60 * 60 * 1000), createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000) },
  })
}

afterAll(async () => {
  if (paths.length) {
    const removed = await serviceClient().storage.from(CAPTURE_BUCKET).remove(paths)
    if (removed.error) throw removed.error
  }
  await db.storagePurge.deleteMany({ where: { path: { in: tombstones } } })
  await db.property.deleteMany({ where: { id: { in: properties } } })
  await db.stakeholder.deleteMany({ where: { id: { in: people } } })
  await db.$disconnect()
})

describe('draft addendum Storage cleanup', () => {
  it('purges an unregistered photo uploaded after discard, after the signed URL window, and preserves repair evidence', async () => {
    const { id, entryId } = await draft()
    const upload = await requestPhoto(entryId, id)
    expect(await db.reportAddendumPhoto.count({ where: { entryId } })).toBe(0)
    const evidencePath = `maintenance/${randomUUID()}/before.png`
    paths.push(evidencePath)
    await uploadBytes(evidencePath, png, 'image/png')
    await db.reportAddendumPhoto.create({ data: { entryId, storagePath: evidencePath, mimeType: 'image/png', label: 'Before' } })

    const prefix = `addenda/${id}`
    tombstones.push(prefix)
    await discardAddendum(id)
    const queued = await db.storagePurge.findUniqueOrThrow({ where: { path: prefix } })
    expect(queued).toMatchObject({ isPrefix: true, completedAt: null })
    expect(queued.readyAt.getTime() - queued.createdAt.getTime()).toBeGreaterThanOrEqual(3 * 60 * 60 * 1000 - 1000)
    await lateUpload(upload)
    await expect(registerAddendumPhoto(entryId, id, { ...upload.input, storagePath: upload.storagePath, sizeBytes: png.length }))
      .rejects.toThrow('Entry not found')

    expect(await purgeStorageEntry(queued)).toBe('waiting')
    const prematurelyReady = await db.storagePurge.update({ where: { path: prefix }, data: { readyAt: new Date(0) } })
    expect(await purgeStorageEntry(prematurelyReady)).toBe('waiting')
    expect(await captureExists(upload.storagePath)).toBe(true)

    expect(await purgeStorageEntry(await expireWindow(prefix))).toBe('completed')
    expect(await captureExists(upload.storagePath)).toBe(false)
    expect(await captureExists(evidencePath)).toBe(true)
    expect((await db.storagePurge.findUniqueOrThrow({ where: { path: prefix } })).completedAt).not.toBeNull()
  })

  it('purges an unregistered entry upload without touching another entry in the draft', async () => {
    const { id, entryId } = await draft()
    const upload = await requestPhoto(entryId, id)
    await requestAddendumPhotoUpload(entryId, id, upload.input)
    const otherEntry = await addEntry(id, 'Fridge')
    const otherPhoto = await requestPhoto(otherEntry, id)
    await lateUpload(otherPhoto)
    await registerAddendumPhoto(otherEntry, id, { ...otherPhoto.input, storagePath: otherPhoto.storagePath, sizeBytes: png.length })
    expect((await db.reportAddendumEntry.findUniqueOrThrow({ where: { id: entryId } })).uploadPaths).toEqual([upload.storagePath])

    tombstones.push(upload.storagePath)
    await deleteAddendumEntry(entryId, id)
    await lateUpload(upload)
    expect(await purgeStorageEntry(await expireWindow(upload.storagePath))).toBe('completed')
    expect(await captureExists(upload.storagePath)).toBe(false)
    expect(await captureExists(otherPhoto.storagePath)).toBe(true)
    expect(await db.reportAddendum.findUnique({ where: { id } })).not.toBeNull()

    // Even a mistakenly queued purge must refuse media still on the report.
    tombstones.push(otherPhoto.storagePath, `addenda/${id}`)
    for (const [path, isPrefix] of [[otherPhoto.storagePath, false], [`addenda/${id}`, true]] as const) {
      const purge = await db.storagePurge.create({ data: {
        path, isPrefix, readyAt: new Date(0), createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
      } })
      await expect(purgeStorageEntry(purge)).rejects.toThrow('still belongs to a report')
      expect((await db.storagePurge.findUniqueOrThrow({ where: { path } })).completedAt).toBeNull()
    }
    expect(await captureExists(otherPhoto.storagePath)).toBe(true)
  })
})
