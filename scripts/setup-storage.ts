import 'dotenv/config'
import { serviceClient, CAPTURE_BUCKET } from '../src/lib/storage'

/// Idempotent. Run after `supabase start` on a fresh machine, and once per
/// hosted environment.
async function main() {
  const storage = serviceClient().storage

  const { data: existing } = await storage.listBuckets()
  if (existing?.some((b) => b.name === CAPTURE_BUCKET)) {
    console.log(`Bucket "${CAPTURE_BUCKET}" already exists`)
    return
  }

  const { error } = await storage.createBucket(CAPTURE_BUCKET, {
    public: false,
    fileSizeLimit: '2GB',
    allowedMimeTypes: ['video/mp4', 'video/quicktime', 'video/webm', 'image/jpeg', 'image/png'],
  })
  if (error) throw error

  console.log(`Created private bucket "${CAPTURE_BUCKET}"`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
