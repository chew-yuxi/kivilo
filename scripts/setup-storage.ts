import 'dotenv/config'
import { serviceClient, CAPTURE_BUCKET } from '../src/lib/storage'

/// Idempotent. Run after `supabase start` on a fresh machine, and once per
/// hosted environment.
async function main() {
  const storage = serviceClient().storage

  // Every type something in the app stores: walkthrough video, photos, maintenance
  // evidence (which also takes WebP and PDF receipts), branding logos, and printed
  // report PDFs. Re-running updates an existing bucket, so adding a type here and
  // running this once per environment is how a new kind of file is allowed in.
  const options = {
    public: false,
    fileSizeLimit: '2GB',
    allowedMimeTypes: [
      'video/mp4', 'video/quicktime', 'video/webm',
      'image/jpeg', 'image/png', 'image/webp',
      'application/pdf',
    ],
  }

  const { data: existing } = await storage.listBuckets()
  if (existing?.some((b) => b.name === CAPTURE_BUCKET)) {
    const { error } = await storage.updateBucket(CAPTURE_BUCKET, options)
    if (error) throw error
    console.log(`Updated private bucket "${CAPTURE_BUCKET}"`)
    return
  }

  const { error } = await storage.createBucket(CAPTURE_BUCKET, options)
  if (error) throw error

  console.log(`Created private bucket "${CAPTURE_BUCKET}"`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
