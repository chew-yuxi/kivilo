import 'dotenv/config'
import { serviceClient, CAPTURE_BUCKET } from '../src/lib/storage'

/// Captures, maintenance evidence (which also accepts WebP and PDF receipts), agency
/// logos, and the generated report PDFs.
const ALLOWED_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]

/// Idempotent: creates the bucket, or brings an existing one's settings up to date. Run
/// after `supabase start` on a fresh machine, and once per hosted environment whenever
/// this file changes.
async function main() {
  const storage = serviceClient().storage
  const settings = { public: false, fileSizeLimit: '2GB', allowedMimeTypes: ALLOWED_TYPES }

  const { data: existing, error: listError } = await storage.listBuckets()
  if (listError) throw listError
  if (existing.some((b) => b.name === CAPTURE_BUCKET)) {
    const { error } = await storage.updateBucket(CAPTURE_BUCKET, settings)
    if (error) throw error
    console.log(`Updated private bucket "${CAPTURE_BUCKET}"`)
    return
  }

  const { error } = await storage.createBucket(CAPTURE_BUCKET, settings)
  if (error) throw error

  console.log(`Created private bucket "${CAPTURE_BUCKET}"`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
