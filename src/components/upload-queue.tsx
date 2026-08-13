'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import {
  enqueue,
  listPending,
  remove,
  update,
  subscribeToQueue,
  getQueueSnapshot,
  getServerQueueSnapshot,
  type PendingCapture,
} from '@/lib/offline-queue'
import { requestUploadUrl, registerCapture } from '@/app/inspections/[id]/actions'

const CAPTURE_BUCKET = 'captures'
const MAX_ATTEMPTS = 5

const browserClient = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  )

type QueueState = {
  pending: PendingCapture[]
  online: boolean
  add: (capture: Parameters<typeof enqueue>[0]) => Promise<void>
}

const QueueContext = createContext<QueueState | null>(null)

export function useUploadQueue() {
  const context = useContext(QueueContext)
  if (!context) throw new Error('useUploadQueue must be used inside <UploadQueueProvider>')
  return context
}

function subscribeToConnection(onChange: () => void) {
  window.addEventListener('online', onChange)
  window.addEventListener('offline', onChange)
  return () => {
    window.removeEventListener('online', onChange)
    window.removeEventListener('offline', onChange)
  }
}

export function UploadQueueProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  // Re-entrancy guard only — never rendered, so it must not be state. Keeping it as
  // state would also mean flush() sets state synchronously, which React forbids
  // inside an effect body.
  const flushing = useRef(false)

  const pending = useSyncExternalStore(
    subscribeToQueue,
    getQueueSnapshot,
    getServerQueueSnapshot,
  )

  const online = useSyncExternalStore(
    subscribeToConnection,
    () => navigator.onLine,
    // The server has no connection state to report; assume online so the first
    // paint doesn't flash an offline banner.
    () => true,
  )

  const flush = useCallback(async () => {
    if (flushing.current || !navigator.onLine) return
    flushing.current = true
    try {
      let uploadedAny = false

      for (const capture of await listPending()) {
        if (capture.attempts >= MAX_ATTEMPTS) continue
        try {
          const { storagePath, token } = await requestUploadUrl(capture.roomId, capture.filename)

          const { error } = await browserClient()
            .storage.from(CAPTURE_BUCKET)
            .uploadToSignedUrl(storagePath, token, capture.blob)
          if (error) throw error

          await registerCapture({
            roomId: capture.roomId,
            inspectionId: capture.inspectionId,
            kind: capture.kind,
            storagePath,
            mimeType: capture.mimeType,
            sizeBytes: capture.blob.size,
            durationSec: capture.durationSec,
            note: capture.note,
          })

          await remove(capture.id!)
          uploadedAny = true
        } catch (error) {
          // Keep the capture. A failed attempt is a retry, never a discard.
          await update({
            ...capture,
            attempts: capture.attempts + 1,
            lastError: error instanceof Error ? error.message : String(error),
          })
        }
      }

      if (uploadedAny) router.refresh()
    } finally {
      flushing.current = false
    }
  }, [router])

  useEffect(() => {
    // Background Sync is Chromium-only, so the queue is drained on a timer while the
    // app is open rather than relying on it.
    const timer = setInterval(() => void flush(), 20_000)
    return () => clearInterval(timer)
    // Re-running this on every flush identity change would restart the interval
    // mid-upload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Drain on mount and again the moment signal comes back.
  useEffect(() => {
    if (online) void flush()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online])

  const add = useCallback(
    async (capture: Parameters<typeof enqueue>[0]) => {
      await enqueue(capture)
      void flush()
    },
    [flush],
  )

  return (
    <QueueContext.Provider value={{ pending, online, add }}>
      {children}
      <QueueBanner pending={pending} online={online} />
    </QueueContext.Provider>
  )
}

function QueueBanner({ pending, online }: { pending: PendingCapture[]; online: boolean }) {
  if (online && pending.length === 0) return null

  const stuck = pending.filter((c) => c.attempts >= MAX_ATTEMPTS)
  const bytes = pending.reduce((sum, c) => sum + c.blob.size, 0)

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 bg-white/95 px-6 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-3 text-sm">
        <span
          className={`size-2 shrink-0 rounded-full ${online ? 'bg-amber-500' : 'bg-gray-400'}`}
        />
        <p className="flex-1 text-gray-700">
          {!online && 'Offline. '}
          {pending.length > 0 ? (
            <>
              {pending.length} capture{pending.length === 1 ? '' : 's'} saved on this device
              {' '}({(bytes / 1_000_000).toFixed(0)} MB)
              {online ? ' — uploading.' : ' — they will upload when you have signal.'}
            </>
          ) : (
            'Captures you take now are saved on this device and upload later.'
          )}
        </p>
        {stuck.length > 0 && (
          <span className="text-xs text-red-600">{stuck.length} failed repeatedly</span>
        )}
      </div>
    </div>
  )
}
