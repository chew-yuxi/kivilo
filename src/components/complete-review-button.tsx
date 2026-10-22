'use client'

import { useState, useTransition } from 'react'
import { completeReview } from '@/lib/actions'
import { useUploadQueue } from '@/components/upload-queue'
import { listPending } from '@/lib/offline-queue'

export function CompleteReviewButton({
  inspectionId,
  roomCount,
}: {
  inspectionId: string
  roomCount: number
}) {
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
      setQueueError(`Could not check saved captures: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  return (
    <div className="flex items-center justify-end gap-4 rounded-lg border border-gray-200 bg-white px-5 py-4">
      <div className="flex-1 text-sm text-gray-600">
        <p>{unsent > 0
          ? `${unsent} capture${unsent === 1 ? '' : 's'} still saved on this phone. Upload and review them before sending.`
          : `All ${roomCount} rooms reviewed. Sending for signature freezes the report, and the countersigned version is what a deposit dispute is argued against.`}</p>
        {queueError && <p className="mt-1 text-red-700">{queueError}</p>}
      </div>
      {unsent > 0 && online && (
        <button type="button" onClick={flush} className="action-secondary">
          Retry uploads
        </button>
      )}
      <button
        type="button"
        disabled={pending || !online || unsent > 0}
        onClick={() => void send()}
        className="shrink-0 rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
      >
        Send for signature
      </button>
    </div>
  )
}
