import { createClient } from '@supabase/supabase-js'

/// Captures are evidence: private bucket, signed URLs only, never public.
export const CAPTURE_BUCKET = 'captures'

/// Service-role client. Server-only — never import this from a client component.
export function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set')
  }
  return createClient(url, key, { auth: { persistSession: false } })
}

/// A one-shot upload URL so the browser sends the video straight to storage.
/// Serverless request bodies cap out around 4–25 MB; a 10-minute walkthrough does not fit.
export async function createUploadUrl(storagePath: string) {
  const { data, error } = await serviceClient()
    .storage.from(CAPTURE_BUCKET)
    .createSignedUploadUrl(storagePath)
  if (error) throw error
  return data
}

export async function createDownloadUrl(storagePath: string, expiresInSec = 3600) {
  const { data, error } = await serviceClient()
    .storage.from(CAPTURE_BUCKET)
    .createSignedUrl(storagePath, expiresInSec)
  if (error) throw error
  return data.signedUrl
}

export async function downloadCapture(storagePath: string): Promise<Uint8Array> {
  const { data, error } = await serviceClient().storage.from(CAPTURE_BUCKET).download(storagePath)
  if (error) throw error
  return new Uint8Array(await data.arrayBuffer())
}

export async function uploadBytes(storagePath: string, bytes: Uint8Array, contentType: string) {
  const { error } = await serviceClient()
    .storage.from(CAPTURE_BUCKET)
    .upload(storagePath, bytes, { contentType, upsert: true })
  if (error) throw error
  return storagePath
}
