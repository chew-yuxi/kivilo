import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import ffmpegPath from 'ffmpeg-static'
import { db } from '@/lib/db'
import { createDownloadUrl, uploadBytes } from '@/lib/storage'
import { makePhotoCapturePoster, photoPoster, saveCapturePoster } from '@/lib/capture-poster'

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

type Due = { id: string; roomId: string; kind: 'VIDEO' | 'PHOTO'; storagePath: string }

/// Finding, repair and update photos still in use with no poster yet, newest first. The
/// three tables share nothing but a storage path, so one query unions them. A deleted
/// finding photo still shows in a published assessment, as the purge worker reads it.
function dueOtherPhotos(limit: number) {
  return db.$queryRaw<{ sourcePath: string }[]>`
    SELECT "storagePath" AS "sourcePath" FROM (
      SELECT "storagePath", "mimeType", "createdAt" FROM "FindingPhoto"
        WHERE "registeredAt" IS NOT NULL AND ("deletedAt" IS NULL OR "publishedAt" IS NOT NULL)
      UNION ALL SELECT "storagePath", "mimeType", "createdAt" FROM "MaintenanceEvidence"
      UNION ALL SELECT "storagePath", "mimeType", "createdAt" FROM "ReportAddendumPhoto"
    ) photo
    WHERE "mimeType" IN ('image/jpeg', 'image/png', 'image/webp')
      AND NOT EXISTS (
        SELECT 1 FROM "PhotoPoster" poster WHERE poster."sourcePath" = photo."storagePath"
          AND (poster."posterPath" IS NOT NULL OR poster."attempts" >= ${MAX_ATTEMPTS})
      )
    GROUP BY "storagePath"
    ORDER BY max("createdAt") DESC
    LIMIT ${limit}`
}

/// Beside the original, so its prefix purge takes the poster too.
async function makeOtherPoster(sourcePath: string) {
  const posterPath = `${sourcePath}.poster.webp`
  await uploadBytes(posterPath, await photoPoster(sourcePath), 'image/webp')
  await db.photoPoster.upsert({ where: { sourcePath }, create: { sourcePath, posterPath }, update: { posterPath } })
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
  const others = await dueOtherPhotos(photoLimit)
  const made: string[] = []
  const failed: string[] = []
  const attempt = async (capture: Due) => {
    try {
      if (capture.kind === 'PHOTO') await makePhotoCapturePoster(capture)
      else await saveCapturePoster(capture, await videoPoster(capture.storagePath), 'jpg', 'image/jpeg')
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
  const attemptOther = async ({ sourcePath }: { sourcePath: string }) => {
    try {
      await makeOtherPoster(sourcePath)
      made.push(sourcePath)
    } catch (error) {
      console.error(`Poster for ${sourcePath} failed:`, error)
      await db.photoPoster.upsert({
        where: { sourcePath },
        create: { sourcePath, attempts: 1 },
        update: { attempts: { increment: 1 } },
      })
      failed.push(sourcePath)
    }
  }
  const resizes = [...photos.map((photo) => () => attempt(photo)), ...others.map((photo) => () => attemptOther(photo))]
  for (let start = 0; start < resizes.length; start += PHOTO_CONCURRENCY) {
    await Promise.all(resizes.slice(start, start + PHOTO_CONCURRENCY).map((resize) => resize()))
  }
  for (const video of videos) await attempt(video)
  return { made, failed }
}
