'use client'

import { useRef, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { requestUploadUrl, registerCapture } from '@/app/inspections/[id]/actions'

const CAPTURE_BUCKET = 'captures'

const browserClient = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  )

/// Reads the duration from the file itself so the report can show how long the
/// walkthrough ran without re-decoding the video server-side.
function readDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src)
      resolve(Number.isFinite(video.duration) ? Math.round(video.duration) : null)
    }
    video.onerror = () => resolve(null)
    video.src = URL.createObjectURL(file)
  })
}

export function CaptureUploader({ inspectionId }: { inspectionId: string }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<'idle' | 'uploading' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)

  async function upload(file: File) {
    setState('uploading')
    setMessage(null)
    try {
      const durationSec = await readDuration(file)
      const { storagePath, token } = await requestUploadUrl(inspectionId, file.name)

      const { error } = await browserClient()
        .storage.from(CAPTURE_BUCKET)
        .uploadToSignedUrl(storagePath, token, file)
      if (error) throw error

      await registerCapture({
        inspectionId,
        storagePath,
        mimeType: file.type || 'video/mp4',
        sizeBytes: file.size,
        durationSec,
      })
    } catch (error) {
      setState('error')
      setMessage(error instanceof Error ? error.message : 'Upload failed')
    }
  }

  return (
    <div className="rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center">
      <h2 className="text-sm font-medium">Upload the walkthrough</h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-gray-500">
        Walk the unit room by room and narrate what you see — meters, appliances, any
        marks or damage. Around ten minutes is typical.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        capture="environment"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) void upload(file)
        }}
      />

      <button
        type="button"
        disabled={state === 'uploading'}
        onClick={() => inputRef.current?.click()}
        className="mt-6 rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:opacity-50"
      >
        {state === 'uploading' ? 'Uploading…' : 'Choose video'}
      </button>

      {message && <p className="mt-4 text-sm text-red-600">{message}</p>}
    </div>
  )
}
