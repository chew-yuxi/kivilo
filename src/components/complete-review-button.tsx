'use client'

import { useState, useTransition } from 'react'
import { completeReview } from '@/lib/actions'
import { useUploadQueue } from '@/components/upload-queue'
import { listPending } from '@/lib/offline-queue'
import { usePwa } from '@/components/locale'

export function CompleteReviewButton({
  inspectionId,
  roomCount,
}: {
  inspectionId: string
  roomCount: number
}) {
  const w = usePwa()
  const [pending, startTransition] = useTransition()
  const [queueError, setQueueError] = useState<string | null>(null)
  const { pending: captures, online, flush } = useUploadQueue()
  const unsent = captures.filter((capture) => capture.inspectionId === inspectionId).length

  async function send() {
    try {
      const queued = await listPending()
      // The IndexedDB snapshot loads after hydration. Check the durable store as
      // well so an immediate tap cannot freeze captures still on this phone.
      if (queued.some((capture) => capture.inspectionId === inspectionId)) {
        flush()
        return
      }
      setQueueError(null)
      startTransition(() => void completeReview(inspectionId))
    } catch (error) {
      setQueueError(w.checkCapturesFailed(error instanceof Error ? error.message : String(error)))
    }
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end rounded-lg border border-gray-200 bg-white px-5 py-4">
      <div className="flex-1 text-sm text-gray-600">
        <p>{unsent > 0
          ? w.capturesStillSaved(unsent)
          : w.allRoomsReviewed(roomCount)}</p>
        {queueError && <p className="mt-1 text-red-700">{queueError}</p>}
      </div>
      {unsent > 0 && online && (
        <button type="button" onClick={flush} className="action-secondary">
          {w.retryUploads}
        </button>
      )}
      <button
        type="button"
        disabled={pending || !online || unsent > 0}
        onClick={() => void send()}
        className="action-primary sm:w-auto sm:shrink-0"
      >
        {w.sendForSignature}
      </button>
    </div>
  )
}
