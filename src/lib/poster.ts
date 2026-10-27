import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import ffmpegPath from 'ffmpeg-static'
import sharp from 'sharp'
import { db } from '@/lib/db'
import { CAPTURE_BUCKET, createDownloadUrl, downloadCapture, serviceClient, uploadBytes } from '@/lib/storage'

const run = promisify(execFile)

/// After this many failures a capture keeps its placeholder rather than being retried
/// every minute for ever.
const MAX_ATTEMPTS = 3

/// Photos resized at once. Each decodes a full camera frame (12 MP, ~50 MB of pixels).
const PHOTO_CONCURRENCY = 6

/// One representative frame, 480px wide, as JPEG bytes. ffmpeg reads the video over a
/// signed URL with range requests, so a ten-minute walkthrough is never downloaded, and
/// it applies the phone's rotation itself. `thumbnail` picks the most typical of the
/// first frames it reads rather than the first, which a phone often records dark while
/// its exposure settles. Seeking past the end of a very short clip yields nothing, so
/// the caller retries from the start.
async function frame(url: string, seek: boolean) {
  const { stdout } = await run(
    ffmpegPath!,
    [
      '-hide_banner', '-loglevel', 'error',
      ...(seek ? ['-ss', '1'] : []),
      '-i', url,
      '-vf', 'thumbnail=30,scale=480:-2',
      '-frames:v', '1', '-q:v', '4', '-f', 'mjpeg', 'pipe:1',
    ],
    { encoding: 'buffer', maxBuffer: 10 * 1024 * 1024, timeout: 30_000 },
  )
  return stdout.length > 0 ? new Uint8Array(stdout) : null
}

async function videoPoster(storagePath: string) {
  const url = await createDownloadUrl(storagePath, 300)
  const jpeg = (await frame(url, true)) ?? (await frame(url, false))
  if (!jpeg) throw new Error('ffmpeg produced no frame')
  return jpeg
}

/// A camera photo is 3 to 6 MB, so a grid of originals takes a phone minutes to draw.
/// The poster is the same picture upright, within 640px, with its aspect kept: marks
/// are normalized against the upright original, so they land in the same place on it.
/// WebP is about 40% smaller than JPEG here (15 to 25 KB); AVIF would need a decoder
/// plugin in the app.
async function photoPoster(storagePath: string) {
  return new Uint8Array(
    await sharp(await downloadCapture(storagePath))
      .rotate()
      .resize(640, 640, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 75 })
      .toBuffer(),
  )
}

type Due = { id: string; roomId: string; kind: 'VIDEO' | 'PHOTO'; storagePath: string }

async function makePoster(capture: Due) {
  const [bytes, extension, contentType] = capture.kind === 'VIDEO'
    ? [await videoPoster(capture.storagePath), 'jpg', 'image/jpeg']
    : [await photoPoster(capture.storagePath), 'webp', 'image/webp']

  // Flat under the room, beside the capture: the room-prefix purge refuses nested folders.
  const posterPath = `${capture.roomId}/${capture.id}.poster.${extension}`
  await uploadBytes(posterPath, bytes, contentType)
  const saved = await db.capture.updateMany({
    where: { id: capture.id, posterPath: null },
    data: { posterPath },
  })
  // The capture was deleted while its poster was being made. deleteCapture could not
  // have recorded a path it never saw, so remove the object here. If it still exists,
  // an overlapping run saved this same path first and the object is the one it points to.
  if (saved.count === 0 && !(await db.capture.findUnique({ where: { id: capture.id }, select: { id: true } }))) {
    const removed = await serviceClient().storage.from(CAPTURE_BUCKET).remove([posterPath])
    if (removed.error) throw removed.error
  }
}

/// Newest first, so a capture just taken is not queued behind a backlog.
export async function makePosters(limit = 5, photoLimit = 60) {
  const due = { posterPath: null, posterAttempts: { lt: MAX_ATTEMPTS } }
  const select = { id: true, roomId: true, kind: true, storagePath: true } as const
  const videos = await db.capture.findMany({
    where: { kind: 'VIDEO', ...due }, orderBy: { createdAt: 'desc' }, take: limit, select,
  })
  const photos = await db.capture.findMany({
    where: { kind: 'PHOTO', ...due }, orderBy: { createdAt: 'desc' }, take: photoLimit, select,
  })
  const made: string[] = []
  const failed: string[] = []
  const attempt = async (capture: Due) => {
    try {
      await makePoster(capture)
      made.push(capture.id)
    } catch (error) {
      console.error(`Poster for capture ${capture.id} failed:`, error)
      await db.capture.updateMany({
        where: { id: capture.id },
        data: { posterAttempts: { increment: 1 } },
      })
      failed.push(capture.id)
    }
  }
  for (let start = 0; start < photos.length; start += PHOTO_CONCURRENCY) {
    await Promise.all(photos.slice(start, start + PHOTO_CONCURRENCY).map(attempt))
  }
  for (const video of videos) await attempt(video)
  return { made, failed }
}
