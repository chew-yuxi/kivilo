import sharp from 'sharp'
import { db } from '@/lib/db'
import { CAPTURE_BUCKET, downloadCapture, serviceClient, uploadBytes } from '@/lib/storage'

type Capture = { id: string; roomId: string; storagePath: string }

/// Keep photo generation separate from the video worker: ordinary server actions
/// need sharp, but must not pull ffmpeg's binary into every deployed function.
/// The upright, proportional copy keeps normalized marks in the same place.
export async function photoPoster(storagePath: string) {
  return new Uint8Array(
    await sharp(await downloadCapture(storagePath))
      .rotate()
      .resize(640, 640, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 75 })
      .toBuffer(),
  )
}

/// Flat beside the original: the room-prefix purge refuses nested folders. Both the
/// immediate photo path and the video cron use the same deletion-race cleanup.
export async function saveCapturePoster(capture: Capture, bytes: Uint8Array, extension: 'jpg' | 'webp', contentType: string) {
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

/// Called after registration commits and by the cron for durable retries.
export async function makePhotoCapturePoster(capture: Capture) {
  await saveCapturePoster(capture, await photoPoster(capture.storagePath), 'webp', 'image/webp')
}
