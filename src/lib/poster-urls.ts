import { db } from '@/lib/db'
import { createDownloadUrls } from '@/lib/storage'

/// A signed URL for the small copy of each stored photo that has one, by the original's
/// path: a capture's poster, or a finding, repair or update photo's (src/lib/poster.ts).
/// A photo the cron has not reached yet is absent, and its tile draws the original.
export async function posterUrls(paths: string[], expiresInSec = 3600) {
  const unique = [...new Set(paths)]
  if (unique.length === 0) return new Map<string, string>()
  const [captures, others] = await Promise.all([
    db.capture.findMany({
      where: { storagePath: { in: unique }, posterPath: { not: null } },
      select: { storagePath: true, posterPath: true },
    }),
    db.photoPoster.findMany({
      where: { sourcePath: { in: unique }, posterPath: { not: null } },
      select: { sourcePath: true, posterPath: true },
    }),
  ])
  const posters = [
    ...captures.map((capture) => [capture.storagePath, capture.posterPath!] as const),
    ...others.map((poster) => [poster.sourcePath, poster.posterPath!] as const),
  ]
  const urls = await createDownloadUrls(posters.map(([, poster]) => poster), expiresInSec)
  return new Map(posters.map(([source, poster]) => [source, urls.get(poster)!]))
}
