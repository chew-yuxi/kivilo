import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import ffmpegPath from 'ffmpeg-static'
import { db } from '@/lib/db'
import { CAPTURE_BUCKET, createDownloadUrl, serviceClient, uploadBytes } from '@/lib/storage'

const run = promisify(execFile)

/// After this many failures a video keeps its camcorder icon rather than being retried
/// every minute for ever.
const MAX_ATTEMPTS = 3

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

async function makePoster(capture: { id: string; roomId: string; storagePath: string }) {
  const url = await createDownloadUrl(capture.storagePath, 300)
  const jpeg = (await frame(url, true)) ?? (await frame(url, false))
  if (!jpeg) throw new Error('ffmpeg produced no frame')

  // Flat under the room, beside the video: the room-prefix purge refuses nested folders.
  const posterPath = `${capture.roomId}/${capture.id}.poster.jpg`
  await uploadBytes(posterPath, jpeg, 'image/jpeg')
  const saved = await db.capture.updateMany({
    where: { id: capture.id, posterPath: null },
    data: { posterPath },
  })
  // The capture was deleted while its poster was being made. deleteCapture could not
  // have recorded a path it never saw, so remove the object here.
  if (saved.count === 0) {
    const removed = await serviceClient().storage.from(CAPTURE_BUCKET).remove([posterPath])
    if (removed.error) throw removed.error
  }
}

/// Newest first, so a video just recorded is not queued behind a backlog.
export async function makePosters(limit = 5) {
  const videos = await db.capture.findMany({
    where: { kind: 'VIDEO', posterPath: null, posterAttempts: { lt: MAX_ATTEMPTS } },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: { id: true, roomId: true, storagePath: true },
  })
  const made: string[] = []
  const failed: string[] = []
  for (const video of videos) {
    try {
      await makePoster(video)
      made.push(video.id)
    } catch (error) {
      console.error(`Poster for capture ${video.id} failed:`, error)
      await db.capture.updateMany({
        where: { id: video.id },
        data: { posterAttempts: { increment: 1 } },
      })
      failed.push(video.id)
    }
  }
  return { made, failed }
}
