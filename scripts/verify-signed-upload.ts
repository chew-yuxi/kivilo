import 'dotenv/config'
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { CAPTURE_BUCKET, serviceClient } from '../src/lib/storage'

// Exercises the same unnamed multipart PUT that Flutter's background uploader sends.
// The synthetic object is removed even when the assertion fails.
async function main() {
  const path = `__kivilo_release_probe__/${randomUUID()}.png`
  const storage = serviceClient().storage.from(CAPTURE_BUCKET)
  try {
    const { data: credential, error: credentialError } = await storage.createSignedUploadUrl(path)
    if (credentialError) throw credentialError
    const body = new FormData()
    body.append('cacheControl', '3600')
    body.append('', new Blob([await readFile('/private/tmp/kivilo-synthetic-kitchen.png')], { type: 'image/png' }))
    const response = await fetch(credential.signedUrl, {
      method: 'PUT',
      headers: { 'x-upsert': 'false' },
      body,
    })
    if (!response.ok) throw new Error(`Signed multipart upload failed: HTTP ${response.status}`)
    const { data: exists } = await storage.exists(path)
    if (!exists) throw new Error('Storage did not confirm the synthetic object')
    console.log(JSON.stringify({ signedMultipartPut: 'ok', storageExists: true }))
  } finally {
    const { error } = await storage.remove([path])
    if (error) throw error
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
