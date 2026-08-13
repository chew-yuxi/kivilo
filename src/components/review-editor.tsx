'use client'

import { useRef, useTransition } from 'react'
import { timecode } from '@/lib/format'
import { CATEGORIES, CONDITIONS } from '@/lib/inspection/schema'
import { updateItem, deleteItem, addItem, completeReview } from '@/app/inspections/[id]/actions'
import type { ItemCategory, ItemCondition } from '@/generated/prisma'

export type EditableItem = {
  id: string
  name: string
  category: ItemCategory
  condition: ItemCondition
  quantity: number
  notes: string | null
  meterReading: string | null
  sourceTimestampSec: number | null
  confidence: number | null
  editedByHuman: boolean
}

export type EditableRoom = { id: string; name: string; items: EditableItem[] }

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
  onSeek,
}: {
  item: EditableItem
  inspectionId: string
  onSeek: (seconds: number) => void
}) {
  const [pending, startTransition] = useTransition()

  const save = (data: Parameters<typeof updateItem>[2]) =>
    startTransition(() => void updateItem(item.id, inspectionId, data))

  const lowConfidence = item.confidence !== null && item.confidence < 0.6

  return (
    <div
      className={`grid grid-cols-12 items-start gap-3 border-t border-gray-100 px-4 py-3 ${
        pending ? 'opacity-60' : ''
      }`}
    >
      <div className="col-span-4">
        <input
          defaultValue={item.name}
          onBlur={(e) => e.target.value !== item.name && save({ name: e.target.value })}
          className="w-full rounded border border-transparent bg-transparent px-1.5 py-1 text-sm font-medium hover:border-gray-200 focus:border-brand-500 focus:bg-white focus:outline-none"
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
          {item.sourceTimestampSec !== null && (
            <button
              type="button"
              onClick={() => onSeek(item.sourceTimestampSec!)}
              className="font-mono text-xs text-brand-600 hover:underline"
            >
              {timecode(item.sourceTimestampSec)}
            </button>
          )}
          {lowConfidence && (
            <span
              className="text-xs text-amber-700"
              title={`Model confidence ${Math.round(item.confidence! * 100)}% — check the video`}
            >
              unsure
            </span>
          )}
        </div>
      </div>

      <div className="col-span-2">
        <select
          defaultValue={item.condition}
          onChange={(e) => save({ condition: e.target.value as ItemCondition })}
          className={`w-full rounded px-2 py-1 text-xs font-medium focus:outline-none ${CONDITION_TONE[item.condition]}`}
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

      <div className="col-span-5">
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

      <div className="col-span-1 text-right">
        <button
          type="button"
          onClick={() => startTransition(() => void deleteItem(item.id, inspectionId))}
          className="px-1 text-xs text-gray-400 hover:text-red-600"
        >
          Remove
        </button>
      </div>
    </div>
  )
}

export function ReviewEditor({
  inspectionId,
  rooms,
  videoUrl,
}: {
  inspectionId: string
  rooms: EditableRoom[]
  videoUrl: string | null
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [pending, startTransition] = useTransition()

  const seek = (seconds: number) => {
    const video = videoRef.current
    if (!video) return
    video.currentTime = seconds
    void video.play()
    video.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  const itemCount = rooms.reduce((n, room) => n + room.items.length, 0)
  const unreviewed = rooms.reduce(
    (n, room) => n + room.items.filter((i) => !i.editedByHuman).length,
    0,
  )

  return (
    <div className="space-y-6">
      {videoUrl && (
        <video
          ref={videoRef}
          src={videoUrl}
          controls
          className="w-full rounded-lg border border-gray-200 bg-black"
        />
      )}

      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <h2 className="text-sm font-medium">Draft inventory</h2>
            <p className="text-xs text-gray-500">
              {itemCount} items across {rooms.length} rooms · {unreviewed} not yet touched by
              a person
            </p>
          </div>
        </div>

        {rooms.map((room) => (
          <section key={room.id}>
            <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {room.name}
              </h3>
              <button
                type="button"
                onClick={() => startTransition(() => void addItem(room.id, inspectionId))}
                className="text-xs text-brand-600 hover:underline"
              >
                Add item
              </button>
            </div>
            {room.items.map((item) => (
              <ItemRow key={item.id} item={item} inspectionId={inspectionId} onSeek={seek} />
            ))}
          </section>
        ))}
      </div>

      <div className="flex items-center justify-end gap-4">
        {unreviewed > 0 && (
          <p className="text-xs text-gray-500">
            {unreviewed} items still carry only the model&rsquo;s reading of the video.
          </p>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => void completeReview(inspectionId))}
          className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
        >
          Send for signature
        </button>
      </div>
    </div>
  )
}
