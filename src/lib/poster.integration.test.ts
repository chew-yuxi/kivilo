import { afterAll, describe, expect, it, vi } from 'vitest'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { randomUUID } from 'node:crypto'
import ffmpegPath from 'ffmpeg-static'
import sharp from 'sharp'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/headers', () => ({ headers: async () => new Headers() }))
vi.mock('@/lib/auth', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/auth')>()
  return { ...actual, requireAgent: vi.fn() }
})

import { db } from '@/lib/db'
import { requireAgent } from '@/lib/auth'
import { CAPTURE_BUCKET, captureExists, downloadCapture, serviceClient, uploadBytes } from '@/lib/storage'
import { makePosters } from '@/lib/poster'
import { deleteCapture } from '@/lib/actions'

/// Runs the real ffmpeg against the local storage stack: the poster is read from a
/// signed URL exactly as the cron does it in production.

const run = promisify(execFile)

/// Everything this file puts in storage, so it leaves no objects and no pending purge
/// tombstones behind: the account-deletion test waits for every tombstone to clear.
const written: string[] = []

async function deal() {
  const agent = await db.stakeholder.create({ data: { name: 'Poster agent' } })
  vi.mocked(requireAgent).mockResolvedValue(agent)
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
  return { inspection, room }
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

  it('stores a photo as WebP, upright within 640px, in the same proportions, beside the original', async () => {
    const { room } = await deal()
    // A phone photo held upright: landscape pixels with EXIF orientation 6.
    const original = await sharp({ create: { width: 4000, height: 3000, channels: 3, background: '#c08040' } })
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toBuffer()
    const storagePath = `${room.id}/${randomUUID()}.jpg`
    await uploadBytes(storagePath, new Uint8Array(original), 'image/jpeg')
    written.push(storagePath, `${room.id}/`)
    const capture = await db.capture.create({
      data: { roomId: room.id, kind: 'PHOTO', storagePath, mimeType: 'image/jpeg', sizeBytes: original.length },
    })

    const result = await makePosters(0)
    expect(result.made).toContain(capture.id)
    const saved = await db.capture.findUniqueOrThrow({ where: { id: capture.id } })
    expect(saved.posterPath).toBe(`${room.id}/${capture.id}.poster.webp`)
    const poster = await sharp(Buffer.from(await downloadCapture(saved.posterPath!))).metadata()
    expect([poster.format, poster.width, poster.height, poster.orientation ?? 1]).toEqual(['webp', 480, 640, 1])
    // The original is evidence and is never rewritten.
    expect(Buffer.from(await downloadCapture(storagePath)).equals(original)).toBe(true)
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
