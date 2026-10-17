'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { timecode } from '@/lib/format'
import { MarkOverlay } from '@/components/mark-overlay'
import { CONDITION_TONE, CheckInReferencePanel } from '@/components/check-in-reference'
import type { CheckInLine, CheckInReference } from '@/lib/check-in-reference'
import type { StoredAnnotations } from '@/lib/annotations'
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
  baselineKey: string | null
}

export type EvidenceCapture = {
  id: string
  kind: 'VIDEO' | 'PHOTO'
  url: string
  annotations: StoredAnnotations | null
}

function ItemRow({
  item,
  baseline,
  inspectionId,
  onShowEvidence,
}: {
  item: EditableItem
  /// The check-in line this check-out row was copied from, so what it was stays in view
  /// once it is edited.
  baseline: CheckInLine | undefined
  inspectionId: string
  onShowEvidence: (captureId: string, seconds: number | null) => void
}) {
  const [pending, startTransition] = useTransition()

  const save = (data: Parameters<typeof updateItem>[2]) =>
    startTransition(() => void updateItem(item.id, inspectionId, data))

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

      {baseline && (
        // The name and serial only when this row no longer says the same, since a
        // swapped appliance shows up as exactly that difference.
        <p className="px-1.5 text-xs text-gray-500 sm:col-span-12">
          At check-in:{' '}
          {[
            baseline.name !== item.name ? baseline.name : null,
            baseline.identifier !== item.identifier ? baseline.identifier : null,
            baseline.condition,
            baseline.quantity > 1 ? `×${baseline.quantity}` : null,
            baseline.meterReading,
            baseline.notes,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      )}
    </div>
  )
}

export function ReviewEditor({
  inspectionId,
  roomId,
  roomName,
  items,
  captures,
  checkIn,
  alreadyReviewed,
  nextHref,
}: {
  inspectionId: string
  roomId: string
  roomName: string
  items: EditableItem[]
  captures: EvidenceCapture[]
  /// On a check-out, the room as it was at check-in. Null on a check-in.
  checkIn: CheckInReference | null
  alreadyReviewed: boolean
  /// Where "Mark room reviewed" goes: the next room still needing the inspector.
  nextHref: string
}) {
  const router = useRouter()
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({})
  const [pending, startTransition] = useTransition()
  const [confirmEmpty, setConfirmEmpty] = useState(false)

  const review = (options?: { nothingToRecord: boolean }) =>
    startTransition(async () => {
      await markRoomReviewed(roomId, inspectionId, options)
      router.push(alreadyReviewed ? `/inspections/${inspectionId}` : nextHref)
    })

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

  return (
    <div className="space-y-6">
      {checkIn && <CheckInReferencePanel reference={checkIn} open />}

      {captures.length > 0 && (
        // A swipeable strip on a phone so the first item is on screen without
        // scrolling past every photo; a grid where there is room for one.
        <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:px-0">
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
                className="h-44 w-auto max-w-[85vw] shrink-0 snap-start rounded-lg border border-gray-200 bg-black sm:h-auto sm:w-full sm:max-w-none"
              />
            ) : (
              // The wrapper carries the layout and the scroll anchor so the overlay can
              // span exactly the photo's own box. object-contain, not object-cover:
              // h-44 with max-w-[85vw] genuinely crops a wide photo on a phone, and a
              // mark over a cropped picture points at the wrong thing.
              <div
                key={capture.id}
                id={`capture-${capture.id}`}
                // self-start matters: from sm up this is a grid item, and without it
                // the wrapper stretches to the tallest photo in the row while the image
                // keeps its own height, so the overlay would letterbox inside a taller
                // box and slide every mark down. The positioned box must be the
                // picture's box, on every surface.
                className="relative shrink-0 snap-start self-start overflow-hidden rounded-lg border border-gray-200 sm:w-full"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={capture.url}
                  alt="Inspection photo"
                  className="block h-44 w-auto max-w-[85vw] object-contain sm:h-auto sm:w-full sm:max-w-none"
                />
                <MarkOverlay annotations={capture.annotations} />
              </div>
            ),
          )}
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <h2 className="text-sm font-medium">{roomName}</h2>
            <p className="text-xs text-gray-500">
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </p>
          </div>
        </div>

        {items.map((item) => (
          <ItemRow
            key={item.id}
            item={item}
            baseline={checkIn?.lines.find((line) => line.key === item.baselineKey)}
            inspectionId={inspectionId}
            onShowEvidence={showEvidence}
          />
        ))}

        {items.length === 0 && (
          <p className="border-t border-gray-100 px-4 py-8 text-center text-sm text-gray-500">
            No items in this room yet.
          </p>
        )}

        {/* At the bottom, where the new row appears, so it is on screen when it does. */}
        <div className="border-t border-gray-100 px-4 py-3">
          <button
            type="button"
            disabled={pending}
            onClick={() => startTransition(() => void addItem(roomId, inspectionId))}
            className="text-sm font-medium text-brand-600 hover:underline disabled:opacity-50"
          >
            + Add an item
          </button>
        </div>
      </div>

      {items.length === 0 && (
        <p className="text-right text-sm text-gray-600">
          Add an item, or confirm there is nothing to record in this room.
        </p>
      )}

      <div className="flex flex-wrap items-center justify-end gap-4">
        {/* An empty reviewed room tells both parties there was nothing in it, so that
            is said in so many words rather than by tapping the usual button. */}
        {items.length === 0 &&
          (confirmEmpty ? (
            <div className="flex items-center gap-2 text-sm">
              <span>Nothing to record in {roomName}?</span>
              <button
                type="button"
                disabled={pending}
                onClick={() => review({ nothingToRecord: true })}
                className="rounded-md bg-brand-500 px-3 py-2 font-medium text-white hover:bg-brand-600 disabled:opacity-50"
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={() => setConfirmEmpty(false)}
                className="rounded-md px-3 py-2 text-gray-600"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={pending}
              onClick={() => setConfirmEmpty(true)}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
            >
              Nothing to record
            </button>
          ))}
        <button
          type="button"
          disabled={pending || items.length === 0}
          onClick={() => review()}
          className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
        >
          {alreadyReviewed ? 'Save and go back' : 'Mark room reviewed'}
        </button>
      </div>
    </div>
  )
}
