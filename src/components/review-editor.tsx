'use client'

import { useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { timecode } from '@/lib/format'
import { CATEGORIES, CONDITIONS } from '@/lib/inspection/schema'
import {
  updateItem,
  deleteItem,
  addItem,
  markRoomReviewed,
} from '@/lib/actions'
import type { ItemCategory, ItemCondition } from '@/generated/prisma'

export type EditableItem = {
  id: string
  name: string
  category: ItemCategory
  condition: ItemCondition
  quantity: number
  notes: string | null
  identifier: string | null
  meterReading: string | null
  sourceCaptureId: string | null
  sourceTimestampSec: number | null
  confidence: number | null
  editedByHuman: boolean
}

export type EvidenceCapture = { id: string; kind: 'VIDEO' | 'PHOTO'; url: string }

const CONDITION_TONE: Record<ItemCondition, string> = {
  NEW: 'text-emerald-700 bg-emerald-50',
  GOOD: 'text-emerald-700 bg-emerald-50',
  FAIR: 'text-amber-800 bg-amber-50',
  POOR: 'text-orange-800 bg-orange-50',
  DAMAGED: 'text-red-700 bg-red-50',
}

function ItemRow({
  item,
  inspectionId,
  onShowEvidence,
}: {
  item: EditableItem
  inspectionId: string
  onShowEvidence: (captureId: string, seconds: number | null) => void
}) {
  const [pending, startTransition] = useTransition()

  const save = (data: Parameters<typeof updateItem>[2]) =>
    startTransition(() => void updateItem(item.id, inspectionId, data))

  const lowConfidence = item.confidence !== null && item.confidence < 0.6

  return (
    // Stacked on a phone, which is where this is actually used, and a single row from
    // sm upward where there is room for one.
    <div
      className={`grid grid-cols-1 items-start gap-2 border-t border-gray-100 px-4 py-3 sm:grid-cols-12 sm:gap-3 ${
        pending ? 'opacity-60' : ''
      }`}
    >
      <div className="sm:col-span-4">
        <input
          defaultValue={item.name}
          onBlur={(e) => e.target.value !== item.name && save({ name: e.target.value })}
          className="w-full rounded border border-transparent bg-transparent px-1.5 py-1 text-sm font-medium hover:border-gray-200 focus:border-brand-500 focus:bg-white focus:outline-none"
        />
        <input
          defaultValue={item.identifier ?? ''}
          placeholder="Make / model / serial"
          onBlur={(e) =>
            e.target.value !== (item.identifier ?? '') &&
            save({ identifier: e.target.value || null })
          }
          className="mt-1 w-full rounded border border-transparent bg-transparent px-1.5 py-0.5 font-mono text-xs text-gray-600 hover:border-gray-200 focus:border-brand-500 focus:bg-white focus:outline-none"
        />
        <div className="mt-1 flex items-center gap-2 px-1.5">
          <select
            defaultValue={item.category}
            onChange={(e) => save({ category: e.target.value as ItemCategory })}
            className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600 focus:outline-none"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c.toLowerCase()}
              </option>
            ))}
          </select>
          {item.sourceCaptureId && (
            <button
              type="button"
              onClick={() => onShowEvidence(item.sourceCaptureId!, item.sourceTimestampSec)}
              className="font-mono text-xs text-brand-600 hover:underline"
            >
              {item.sourceTimestampSec !== null ? timecode(item.sourceTimestampSec) : 'photo'}
            </button>
          )}
          {lowConfidence && (
            <span
              className="text-xs text-amber-700"
              title={`Model confidence ${Math.round(item.confidence! * 100)}%. Check the evidence.`}
            >
              unsure
            </span>
          )}
        </div>
      </div>

      <div className="sm:col-span-2">
        <select
          defaultValue={item.condition}
          onChange={(e) => save({ condition: e.target.value as ItemCondition })}
          className={`w-full rounded px-2 py-2 text-xs font-medium focus:outline-none sm:py-1 ${CONDITION_TONE[item.condition]}`}
        >
          {CONDITIONS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        {item.category === 'METER' && (
          <input
            defaultValue={item.meterReading ?? ''}
            placeholder="Reading"
            onBlur={(e) => save({ meterReading: e.target.value || null })}
            className="mt-1 w-full rounded border border-gray-200 px-2 py-1 font-mono text-xs focus:border-brand-500 focus:outline-none"
          />
        )}
      </div>

      <div className="sm:col-span-5">
        <textarea
          defaultValue={item.notes ?? ''}
          rows={2}
          placeholder="Condition notes"
          onBlur={(e) =>
            e.target.value !== (item.notes ?? '') && save({ notes: e.target.value || null })
          }
          className="w-full resize-none rounded border border-transparent bg-transparent px-1.5 py-1 text-sm text-gray-600 hover:border-gray-200 focus:border-brand-500 focus:bg-white focus:outline-none"
        />
      </div>

      <div className="text-right sm:col-span-1">
        <button
          type="button"
          onClick={() => startTransition(() => void deleteItem(item.id, inspectionId))}
          // Big enough to hit with a thumb, and pushed clear of the notes field above.
          className="-my-1 px-2 py-1 text-xs text-gray-400 hover:text-red-600"
        >
          Remove
        </button>
      </div>
    </div>
  )
}

export function ReviewEditor({
  inspectionId,
  roomId,
  roomName,
  items,
  captures,
  alreadyReviewed,
}: {
  inspectionId: string
  roomId: string
  roomName: string
  items: EditableItem[]
  captures: EvidenceCapture[]
  alreadyReviewed: boolean
}) {
  const router = useRouter()
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({})
  const [pending, startTransition] = useTransition()

  const showEvidence = (captureId: string, seconds: number | null) => {
    const element =
      videoRefs.current[captureId] ??
      (document.getElementById(`capture-${captureId}`) as HTMLElement | null)
    if (!element) return

    if (element instanceof HTMLVideoElement && seconds !== null) {
      element.currentTime = seconds
      void element.play()
    }
    element.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const unreviewed = items.filter((i) => !i.editedByHuman).length

  return (
    <div className="space-y-6">
      {captures.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {captures.map((capture) =>
            capture.kind === 'VIDEO' ? (
              <video
                key={capture.id}
                id={`capture-${capture.id}`}
                ref={(element) => {
                  videoRefs.current[capture.id] = element
                }}
                src={capture.url}
                controls
                className="w-full rounded-lg border border-gray-200 bg-black"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={capture.id}
                id={`capture-${capture.id}`}
                src={capture.url}
                alt="Inspection photo"
                className="w-full rounded-lg border border-gray-200 object-cover"
              />
            ),
          )}
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <h2 className="text-sm font-medium">{roomName}</h2>
            <p className="text-xs text-gray-500">
              {items.length} items · {unreviewed} not yet touched by a person
            </p>
          </div>
          <button
            type="button"
            onClick={() => startTransition(() => void addItem(roomId, inspectionId))}
            className="text-xs text-brand-600 hover:underline"
          >
            Add item
          </button>
        </div>

        {items.map((item) => (
          <ItemRow
            key={item.id}
            item={item}
            inspectionId={inspectionId}
            onShowEvidence={showEvidence}
          />
        ))}

        {items.length === 0 && (
          <p className="border-t border-gray-100 px-4 py-8 text-center text-sm text-gray-500">
            No items in this room yet.
          </p>
        )}
      </div>

      <div className="flex items-center justify-end gap-4">
        {unreviewed > 0 && (
          <p className="text-xs text-gray-500">
            {unreviewed} items still carry only the model&rsquo;s reading of the evidence.
          </p>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await markRoomReviewed(roomId, inspectionId)
              router.push(`/inspections/${inspectionId}`)
            })
          }
          className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
        >
          {alreadyReviewed ? 'Save and go back' : 'Mark room reviewed'}
        </button>
      </div>
    </div>
  )
}
