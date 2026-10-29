import { createClient } from '@supabase/supabase-js'

/// Captures are evidence: private bucket, signed URLs only, never public.
export const CAPTURE_BUCKET = 'captures'

/// Service-role client. Server-only, so never import this from a client component.
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

/// A retry may have uploaded successfully before its response was lost. Check the
/// deterministic native path without granting a token that could overwrite evidence.
export async function captureExists(storagePath: string) {
  const { data, error } = await serviceClient().storage.from(CAPTURE_BUCKET).exists(storagePath)
  // storage-js deliberately represents a missing HEAD as data:false with either
  // HTTP 400 or 404. The configured Supabase project returns 400 for a missing path
  // (verified 2026-10-10); treating that as a failure prevents every first upload.
  // Its exists() method throws for other statuses and network errors.
  if (error && error.status !== 400 && error.status !== 404) throw error
  return data
}

/// With `downloadAs`, storage serves the object as an attachment under that file name.
export async function createDownloadUrl(storagePath: string, expiresInSec = 3600, downloadAs?: string) {
  const { data, error } = await serviceClient()
    .storage.from(CAPTURE_BUCKET)
    .createSignedUrl(storagePath, expiresInSec, downloadAs ? { download: downloadAs } : undefined)
  if (error) throw error
  return data.signedUrl
}

/// Sign a screen's originals and posters in one storage request. Callers authorize
/// the rows first; a missing or failed object must not become an undefined image URL.
export async function createDownloadUrls(storagePaths: string[], expiresInSec = 3600) {
  const paths = [...new Set(storagePaths)]
  const signed = new Map<string, string>()
  if (paths.length === 0) return signed
  const { data, error } = await serviceClient()
    .storage.from(CAPTURE_BUCKET)
    .createSignedUrls(paths, expiresInSec)
  if (error) throw error
  for (const object of data) {
    if (object.error || !object.path || !object.signedUrl) throw new Error('Could not sign capture')
    signed.set(object.path, object.signedUrl)
  }
  if (paths.some((path) => !signed.has(path))) throw new Error('Could not sign capture')
  return signed
}

/// Deletes every object directly under `prefix`, except `keep`. For prefixes that hold a
/// handful of generated files, not capture folders.
export async function removePrefix(prefix: string, { keep }: { keep?: string } = {}) {
  const storage = serviceClient().storage.from(CAPTURE_BUCKET)
  const { data, error } = await storage.list(prefix, { limit: 100 })
  if (error) throw error
  const paths = data.map((object) => `${prefix}/${object.name}`).filter((path) => path !== keep)
  if (paths.length === 0) return
  const removed = await storage.remove(paths)
  if (removed.error) throw removed.error
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
