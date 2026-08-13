'use client'

import { useTransition } from 'react'
import { completeReview } from '@/app/inspections/[id]/actions'

export function CompleteReviewButton({
  inspectionId,
  roomCount,
}: {
  inspectionId: string
  roomCount: number
}) {
  const [pending, startTransition] = useTransition()

  return (
    <div className="flex items-center justify-end gap-4 rounded-lg border border-gray-200 bg-white px-5 py-4">
      <p className="flex-1 text-sm text-gray-600">
        All {roomCount} rooms reviewed. Sending for signature freezes the report — the
        countersigned version is what a deposit dispute is argued against.
      </p>
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => void completeReview(inspectionId))}
        className="shrink-0 rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
      >
        Send for signature
      </button>
    </div>
  )
}
