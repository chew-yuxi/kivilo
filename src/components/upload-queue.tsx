'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import {
  enqueue,
  listPending,
  patch,
  take,
  subscribeToQueue,
  getQueueSnapshot,
  getServerQueueSnapshot,
  type PendingCapture,
} from '@/lib/offline-queue'
import {
  requestUploadUrl,
  registerCapture,
  updateCaptureNote,
  annotateCapture,
  deleteCapture,
} from '@/lib/actions'

const CAPTURE_BUCKET = 'captures'

const browserClient = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  )

type QueueState = {
  pending: PendingCapture[]
  online: boolean
  /// Resolves to the queue id, so the caller can point at the capture it just took.
  add: (capture: Parameters<typeof enqueue>[0]) => Promise<number>
  /// Runs an upload pass now rather than waiting for the timer.
  flush: () => void
  /// The server row a queued capture became once it uploaded, so a note typed or a
  /// delete tapped against the phone's copy can follow it to the server.
  uploadedIdFor: (queueId: number) => string | null
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
  // Re-entrancy guard only. It is never rendered, so it must not be state; keeping it as
  // state would also mean flush() sets state synchronously, which React forbids
  // inside an effect body.
  const flushing = useRef(false)
  // Set when a capture arrives mid-flush, so the pass runs again as soon as it ends
  // instead of leaving the new capture to the 20 second timer.
  const again = useRef(false)
  const uploaded = useRef(new Map<number, string>())

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
    if (!navigator.onLine) return
    if (flushing.current) {
      again.current = true
      return
    }
    flushing.current = true
    try {
      let uploadedAny = false

      do {
        again.current = false
        // Nothing is ever given up on. A capture that keeps failing goes to the back of
        // the line so it cannot hold up the ones taken after it.
        const queue = (await listPending()).sort(
          (a, b) => a.attempts - b.attempts || a.createdAt - b.createdAt,
        )
        for (const capture of queue) {
          const id = capture.id!
          try {
            // A record that already carries a server id had its bytes accepted on an
            // earlier pass that failed after that point. It is never sent again; only
            // the hand-over below is left to do.
            let captureId = capture.uploadedId ?? uploaded.current.get(id) ?? null
            const resumed = captureId !== null

            if (!captureId) {
              const { storagePath, token } = await requestUploadUrl(capture.roomId, capture.filename)

              const { error } = await browserClient()
                .storage.from(CAPTURE_BUCKET)
                .uploadToSignedUrl(storagePath, token, capture.blob)
              if (error) throw error

              captureId = await registerCapture({
                roomId: capture.roomId,
                inspectionId: capture.inspectionId,
                kind: capture.kind,
                storagePath,
                mimeType: capture.mimeType,
                sizeBytes: capture.blob.size,
                durationSec: capture.durationSec,
                note: capture.note,
                annotations: capture.annotations,
              })
              await patch(id, { uploadedId: captureId })
            }
            // Set on the resumed path as well, or the Viewer's post-take fallback has
            // no server id to fall back to.
            uploaded.current.set(id, captureId)

            // Hand over. The record as it is at the moment of removal is the truth about
            // what the inspector did while the bytes were in flight: a note typed
            // against the phone's copy follows it to the server row, and a copy they
            // deleted takes the server row with it.
            const taken = await take(id)
            if (!taken) {
              await deleteCapture(captureId, capture.inspectionId)
            } else {
              if (resumed || taken.note !== capture.note) {
                await updateCaptureNote(captureId, capture.inspectionId, taken.note)
              }
              // Presence on either copy, not inequality: two IndexedDB reads of the
              // same record are separate structured clones and never ===, so an
              // inequality would fire on every upload of every marked photo anyway.
              // Checking both copies is what makes "the inspector cleared the marks
              // while this was uploading" reach the server instead of being reverted by
              // the marks registerCapture already wrote. Gated on PHOTO because
              // annotateCapture refuses anything else.
              if (
                capture.kind === 'PHOTO' &&
                (resumed || capture.annotations || taken.annotations)
              ) {
                await annotateCapture(captureId, capture.inspectionId, taken.annotations)
              }
            }
            uploadedAny = true
          } catch (error) {
            // Keep the capture. A failed attempt is a retry, never a discard.
            await patch(id, {
              attempts: capture.attempts + 1,
              lastError: error instanceof Error ? error.message : String(error),
            })
          }
        }
      } while (again.current)

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
      const id = await enqueue(capture)
      void flush()
      return id
    },
    [flush],
  )

  const uploadedIdFor = useCallback((queueId: number) => uploaded.current.get(queueId) ?? null, [])

  return (
    <QueueContext.Provider
      value={{ pending, online, add, flush: () => void flush(), uploadedIdFor }}
    >
      {children}
    </QueueContext.Provider>
  )
}

/// One line in the header. Per-capture state lives on the capture itself, on the room
/// screen; this only says that something is still leaving the phone.
export function QueueStatus() {
  const { pending, online } = useUploadQueue()
  if (online && pending.length === 0) return null

  return (
    <span className="flex items-center gap-1.5 text-xs text-gray-600">
      <span className={`size-2 shrink-0 rounded-full ${online ? 'bg-amber-500' : 'bg-gray-400'}`} />
      {!online
        ? pending.length > 0
          ? `Offline, ${pending.length} saved here`
          : 'Offline'
        : `Uploading ${pending.length}`}
    </span>
  )
}
