import { afterAll, afterEach, describe, expect, it, vi } from 'vitest'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { randomUUID } from 'node:crypto'
import ffmpegPath from 'ffmpeg-static'
import sharp from 'sharp'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/headers', () => ({ headers: async () => new Headers() }))
vi.mock('@/lib/auth', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/auth')>()
  return { ...actual, requireAgent: vi.fn(), currentStakeholder: vi.fn() }
})

import { db } from '@/lib/db'
import { requireAgent, currentStakeholder } from '@/lib/auth'
import { CAPTURE_BUCKET, captureExists, downloadCapture, serviceClient, uploadBytes } from '@/lib/storage'
import * as storage from '@/lib/storage'
import { makePosters } from '@/lib/poster'
import { posterUrls } from '@/lib/poster-urls'
import { purgeStorageEntry } from '@/lib/storage-purge'
import { deleteCapture, registerCapture } from '@/lib/actions'
import { GET as getRoom } from '@/app/api/v1/inspections/[id]/rooms/[roomId]/route'

/// Runs the real ffmpeg against the local storage stack: the poster is read from a
/// signed URL exactly as the cron does it in production.

const run = promisify(execFile)

/// Everything this file puts in storage, so it leaves no objects and no pending purge
/// tombstones behind: the account-deletion test waits for every tombstone to clear.
const written: string[] = []
afterEach(() => vi.restoreAllMocks())

async function deal() {
  const agent = await db.stakeholder.create({ data: { name: 'Poster agent' } })
  vi.mocked(requireAgent).mockResolvedValue(agent)
  vi.mocked(currentStakeholder).mockResolvedValue(agent)
  const property = await db.property.create({
    data: { line1: 'Poster test', postalCode: '992345', type: 'PRIVATE_NON_LANDED' },
  })
  const tenancy = await db.tenancy.create({
    data: {
      propertyId: property.id,
      landlordId: (await db.stakeholder.create({ data: { name: 'Poster landlord' } })).id,
      tenantId: (await db.stakeholder.create({ data: { name: 'Poster tenant' } })).id,
      agentId: agent.id,
      startDate: new Date('2024-01-01'),
      endDate: new Date('2026-01-01'),
      monthlyRent: '1000',
      deposit: '2000',
    },
  })
  const inspection = await db.inspection.create({
    data: { tenancyId: tenancy.id, kind: 'CHECK_IN', status: 'CAPTURING' },
  })
  const room = await db.room.create({
    data: { inspectionId: inspection.id, name: 'Kitchen', order: 0, status: 'CAPTURING' },
  })
  return { inspection, room, agent }
}

async function video(roomId: string, bytes: Uint8Array) {
  const storagePath = `${roomId}/${randomUUID()}.mp4`
  await uploadBytes(storagePath, bytes, 'video/mp4')
  written.push(storagePath, `${roomId}/`)
  return db.capture.create({
    data: { roomId, kind: 'VIDEO', storagePath, mimeType: 'video/mp4', sizeBytes: bytes.length },
  })
}

afterAll(async () => {
  const rooms = [...new Set(written.filter((path) => path.endsWith('/')))]
  for (const room of rooms) {
    const { data } = await serviceClient().storage.from(CAPTURE_BUCKET).list(room)
    const paths = (data ?? []).map((object) => `${room}${object.name}`)
    if (paths.length) await serviceClient().storage.from(CAPTURE_BUCKET).remove(paths)
    await db.storagePurge.deleteMany({ where: { path: { startsWith: room } } })
  }
  const objects = written.filter((path) => !path.endsWith('/'))
  await serviceClient().storage.from(CAPTURE_BUCKET).remove(objects)
  await db.storagePurge.deleteMany({ where: { path: { in: objects } } })
  await db.photoPoster.deleteMany({ where: { sourcePath: { in: objects } } })
  await db.property.deleteMany({ where: { postalCode: '992345' } })
  await db.$disconnect()
})

describe('video posters', () => {
  it('stores one still beside the video and purges it with the video', async () => {
    const { inspection, room } = await deal()
    // Two seconds of a test pattern, encoded the way a phone would.
    const { stdout } = await run(ffmpegPath!, [
      '-hide_banner', '-loglevel', 'error',
      '-f', 'lavfi', '-i', 'testsrc=size=640x360:rate=15', '-t', '2',
      '-pix_fmt', 'yuv420p', '-movflags', 'frag_keyframe+empty_moov', '-f', 'mp4', 'pipe:1',
    ], { encoding: 'buffer', maxBuffer: 20 * 1024 * 1024 })
    const capture = await video(room.id, new Uint8Array(stdout))

    const result = await makePosters(50)
    expect(result.made).toContain(capture.id)
    const saved = await db.capture.findUniqueOrThrow({ where: { id: capture.id } })
    expect(saved.posterPath).toBe(`${room.id}/${capture.id}.poster.jpg`)
    expect(await captureExists(saved.posterPath!)).toBe(true)

    await deleteCapture(capture.id, inspection.id)
    const tombstones = await db.storagePurge.findMany({
      where: { path: { in: [saved.storagePath, saved.posterPath!] } },
    })
    expect(tombstones).toHaveLength(2)
  })

  it('has an upright WebP within 640px ready when photo registration returns, preserving the original', async () => {
    const { inspection, room } = await deal()
    // A phone photo held upright: landscape pixels with EXIF orientation 6.
    const original = await sharp({ create: { width: 4000, height: 3000, channels: 3, background: '#c08040' } })
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toBuffer()
    const storagePath = `${room.id}/${randomUUID()}.jpg`
    await uploadBytes(storagePath, new Uint8Array(original), 'image/jpeg')
    written.push(storagePath, `${room.id}/`)
    const captureId = await registerCapture({
      inspectionId: inspection.id, roomId: room.id, kind: 'PHOTO', storagePath,
      mimeType: 'image/jpeg', sizeBytes: original.length, durationSec: null, note: null,
    })

    const saved = await db.capture.findUniqueOrThrow({ where: { id: captureId } })
    expect(saved.posterPath).toBe(`${room.id}/${captureId}.poster.webp`)
    const poster = await sharp(Buffer.from(await downloadCapture(saved.posterPath!))).metadata()
    expect([poster.format, poster.width, poster.height, poster.orientation ?? 1]).toEqual(['webp', 480, 640, 1])
    // The original is evidence and is never rewritten.
    expect(Buffer.from(await downloadCapture(storagePath)).equals(original)).toBe(true)

    // A room mixes ready posters with older photos the cron has not reached yet.
    const olderPath = `${room.id}/${randomUUID()}.jpg`
    await uploadBytes(olderPath, new Uint8Array(original), 'image/jpeg')
    const older = await db.capture.create({
      data: { roomId: room.id, kind: 'PHOTO', storagePath: olderPath, mimeType: 'image/jpeg', sizeBytes: original.length },
    })
    const signed = vi.spyOn(storage, 'createDownloadUrls')
    const response = await getRoom(new Request('http://localhost/api/v1/room'), {
      params: Promise.resolve({ id: inspection.id, roomId: room.id }),
    })
    expect(response.status).toBe(200)
    expect(signed).toHaveBeenCalledExactlyOnceWith([storagePath, saved.posterPath, olderPath])
    const view = await response.json()
    expect(view.captures).toMatchObject([
      { id: captureId, url: expect.any(String), posterUrl: expect.any(String) },
      { id: older.id, url: expect.any(String), posterUrl: null },
    ])
    expect((await fetch(view.captures[0].posterUrl)).ok).toBe(true)
  })

  it('completes registration when the immediate poster fails and lets the cron retry it', async () => {
    const { inspection, room } = await deal()
    const original = await sharp({ create: { width: 1000, height: 700, channels: 3, background: '#4080c0' } }).jpeg().toBuffer()
    const storagePath = `${room.id}/${randomUUID()}.jpg`
    await uploadBytes(storagePath, new Uint8Array(original), 'image/jpeg')
    written.push(storagePath, `${room.id}/`)
    const failed = new Error('Temporary poster upload failure')
    vi.spyOn(storage, 'uploadBytes').mockRejectedValueOnce(failed)
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {})

    const captureId = await registerCapture({
      inspectionId: inspection.id, roomId: room.id, kind: 'PHOTO', storagePath,
      mimeType: 'image/jpeg', sizeBytes: original.length, durationSec: null, note: null,
    })
    expect(await db.capture.findUniqueOrThrow({ where: { id: captureId } })).toMatchObject({
      posterPath: null, posterAttempts: 0, sizeBytes: original.length,
    })
    expect(logged).toHaveBeenCalledWith(expect.stringContaining('cron will retry'), failed)

    expect((await makePosters(0)).made).toContain(captureId)
    const saved = await db.capture.findUniqueOrThrow({ where: { id: captureId } })
    expect(saved.posterPath).toBe(`${room.id}/${captureId}.poster.webp`)
    expect(Buffer.from(await downloadCapture(storagePath)).equals(original)).toBe(true)
  })

  it('makes a finding photo a poster beside it, and purges both together', async () => {
    const { inspection, agent } = await deal()
    const draft = await db.findingPhotoDraft.create({ data: { id: randomUUID(), inspectionId: inspection.id, createdById: agent.id } })
    const original = await sharp({ create: { width: 3000, height: 2000, channels: 3, background: '#4080c0' } }).jpeg().toBuffer()
    const photo = async (registered: boolean) => {
      const clientId = randomUUID()
      const storagePath = `findings/${inspection.id}/${draft.id}/${clientId}.jpg`
      await uploadBytes(storagePath, new Uint8Array(original), 'image/jpeg')
      written.push(storagePath, `${storagePath}.poster.webp`)
      return db.findingPhoto.create({
        data: { clientId, draftId: draft.id, storagePath, mimeType: 'image/jpeg', registeredAt: registered ? new Date() : null },
      })
    }
    const registered = await photo(true)
    const unfinished = await photo(false)

    const result = await makePosters(0)
    expect(result.made).toContain(registered.storagePath)
    expect(result.made).not.toContain(unfinished.storagePath)
    const posterPath = `${registered.storagePath}.poster.webp`
    expect(await db.photoPoster.findUnique({ where: { sourcePath: registered.storagePath } })).toMatchObject({ posterPath })
    const poster = await sharp(Buffer.from(await downloadCapture(posterPath))).metadata()
    expect([poster.format, poster.width, poster.height]).toEqual(['webp', 640, 427])
    expect([...(await posterUrls([registered.storagePath, unfinished.storagePath])).keys()]).toEqual([registered.storagePath])

    await db.findingPhoto.update({ where: { clientId: registered.clientId }, data: { deletedAt: new Date() } })
    const longAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const purge = await db.storagePurge.create({
      data: { path: registered.storagePath, isPrefix: false, readyAt: longAgo, createdAt: longAgo },
    })
    expect(await purgeStorageEntry(purge)).toBe('completed')
    expect(await captureExists(registered.storagePath)).toBe(false)
    expect(await captureExists(posterPath)).toBe(false)
    expect(await db.photoPoster.findUnique({ where: { sourcePath: registered.storagePath } })).toBeNull()
  })

  it('gives up on an unreadable file after a few attempts', async () => {
    const { room } = await deal()
    const capture = await video(room.id, new TextEncoder().encode('not a video'))

    for (let attempt = 0; attempt < 4; attempt++) {
      const result = await makePosters(50)
      expect(result.made).not.toContain(capture.id)
    }
    const saved = await db.capture.findUniqueOrThrow({ where: { id: capture.id } })
    expect(saved.posterPath).toBeNull()
    expect(saved.posterAttempts).toBe(3)
  })
})
