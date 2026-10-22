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
  checkInPhotoLinks,
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
  /// Captures the inspector has said show this line.
  evidenceCaptureIds: string[]
}

export type EvidenceCapture = {
  id: string
  kind: 'VIDEO' | 'PHOTO'
  url: string
  annotations: StoredAnnotations | null
}

/// Whether a check-out row no longer says what its check-in line did. Surrounding
/// whitespace is not a difference: the app trims every field it saves and the web
/// keeps what was typed, so either may have touched a field nobody changed.
const differs = (was: string | null, now: string | null) => (was ?? '').trim() !== (now ?? '').trim()

/// "serial: ABC123", or "no serial" when the check-in left it empty.
const quoted = (field: string, value: string | null) => (value?.trim() ? `${field}: ${value.trim()}` : `no ${field}`)

/// Whether a check-out row says anything its check-in line did not.
function changedSince(item: EditableItem, baseline: CheckInLine) {
  return (
    baseline.condition !== item.condition ||
    baseline.quantity !== item.quantity ||
    differs(baseline.name, item.name) ||
    differs(baseline.identifier, item.identifier) ||
    differs(baseline.meterReading, item.meterReading) ||
    differs(baseline.notes, item.notes)
  )
}

function ItemRow({
  item,
  baseline,
  onCheckOut,
  inspectionId,
  captures,
  checkInPhotos,
  open,
  onToggle,
  onShowEvidence,
}: {
  item: EditableItem
  /// The check-in line this check-out row was copied from, so what it was stays in view
  /// once it is edited.
  baseline: CheckInLine | undefined
  /// A check-out row with no baseline is one the inspector added on this visit.
  onCheckOut: boolean
  inspectionId: string
  /// The room's captures, any of which the inspector can say shows this line.
  captures: EvidenceCapture[]
  /// The check-in photos of this row's check-in line, once their links have been
  /// fetched. Empty until then, and on a line with none.
  checkInPhotos: { id: string; url: string; annotations: StoredAnnotations | null }[]
  open: boolean
  onToggle: () => void
  onShowEvidence: (captureId: string, seconds: number | null) => void
}) {
  const [pending, startTransition] = useTransition()
  // Held here as well as saved, so a tap shows at once rather than after the round trip.
  const [condition, setCondition] = useState(item.condition)
  const [evidence, setEvidence] = useState(item.evidenceCaptureIds)

  const save = (data: Parameters<typeof updateItem>[2]) =>
    startTransition(() => void updateItem(item.id, inspectionId, data))

  const toggleEvidence = (captureId: string) => {
    // Only captures still in the room: one deleted since the page opened would be
    // refused as evidence that does not exist.
    const current = evidence.filter((id) => captures.some((capture) => capture.id === id))
    const next = current.includes(captureId)
      ? current.filter((id) => id !== captureId)
      : [...current, captureId]
    setEvidence(next)
    save({ evidenceCaptureIds: next })
  }

  const changed = baseline ? changedSince({ ...item, condition }, baseline) : false
  const summary = [
    item.quantity > 1 ? `×${item.quantity}` : null,
    item.identifier?.trim() || null,
    item.meterReading?.trim() ? `reading ${item.meterReading.trim()}` : null,
    item.notes?.trim().split('\n')[0] || null,
    evidence.length > 0 ? `${evidence.length} ${evidence.length === 1 ? 'photo' : 'photos'}` : null,
  ].filter(Boolean)
  const flag = changed ? 'Changed since check-in' : onCheckOut && !baseline ? 'Not at check-in' : null

  return (
    <div data-item-row className={`border-t border-gray-100 ${pending ? 'opacity-60' : ''}`}>
      {/* The whole line is one target, so a room of lines reads as a list on a phone and
          only the line being written takes the space its fields need. */}
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-gray-50"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-gray-900">{item.name}</span>
          {(summary.length > 0 || flag) && (
            <span className="mt-0.5 block truncate text-xs text-gray-500">
              {flag && <span className="font-medium text-amber-700">{flag}</span>}
              {flag && summary.length > 0 && ' · '}
              {summary.join(' · ')}
            </span>
          )}
        </span>
        <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${CONDITION_TONE[condition]}`}>
          {condition}
        </span>
        <span aria-hidden="true" className="shrink-0 text-lg text-gray-500">{open ? '⌄' : '›'}</span>
      </button>

      {open && (
        <div className="space-y-3 px-4 pb-4">
          <input
            aria-label="Item name"
            defaultValue={item.name}
            onBlur={(e) => e.target.value !== item.name && save({ name: e.target.value })}
            className="w-full rounded border border-gray-200 px-2 py-1.5 text-sm font-medium focus:border-brand-500 focus:outline-none"
          />

          <div role="radiogroup" aria-label="Condition" className="flex gap-1.5">
            {CONDITIONS.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={condition === c}
                onClick={() => {
                  if (c === condition) return
                  setCondition(c)
                  save({ condition: c })
                }}
                className={`min-w-0 flex-1 rounded px-0.5 py-2 text-[11px] font-medium ${
                  condition === c ? `${CONDITION_TONE[c]} ring-1 ring-current` : 'bg-gray-50 text-gray-500'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {item.category === 'METER' && (
            <input
              aria-label="Reading"
              defaultValue={item.meterReading ?? ''}
              placeholder="Reading"
              onBlur={(e) => save({ meterReading: e.target.value || null })}
              className="w-full rounded border border-gray-200 px-2 py-1.5 font-mono text-xs focus:border-brand-500 focus:outline-none"
            />
          )}

          <textarea
            aria-label="Condition notes"
            defaultValue={item.notes ?? ''}
            rows={2}
            placeholder="Condition notes"
            onBlur={(e) =>
              e.target.value !== (item.notes ?? '') && save({ notes: e.target.value || null })
            }
            className="w-full resize-none rounded border border-gray-200 px-2 py-1.5 text-sm text-gray-700 focus:border-brand-500 focus:outline-none"
          />

          <div className="flex items-center gap-2">
            <input
              aria-label="Make, model and serial"
              defaultValue={item.identifier ?? ''}
              placeholder="Make / model / serial"
              onBlur={(e) =>
                e.target.value !== (item.identifier ?? '') &&
                save({ identifier: e.target.value || null })
              }
              className="min-w-0 flex-1 rounded border border-gray-200 px-2 py-1.5 font-mono text-xs text-gray-600 focus:border-brand-500 focus:outline-none"
            />
            <select
              aria-label="Kind"
              defaultValue={item.category}
              onChange={(e) => save({ category: e.target.value as ItemCategory })}
              className="rounded bg-gray-100 px-1.5 py-1.5 text-xs text-gray-600 focus:outline-none"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.toLowerCase()}
                </option>
              ))}
            </select>
          </div>

          {captures.length > 0 && (
            // Which photos show this line. The report prints their numbers beside it, so
            // a dispute about the fridge goes straight to the fridge's pictures.
            <div>
              <p className="text-xs text-gray-500">Photos of this item</p>
              <div className="mt-1.5 flex gap-2 overflow-x-auto pb-1">
                {captures.map((capture, index) => {
                  const selected = evidence.includes(capture.id)
                  return (
                    <button
                      key={capture.id}
                      type="button"
                      aria-pressed={selected}
                      aria-label={`${capture.kind === 'VIDEO' ? 'Video' : 'Photo'} ${
                        captures.slice(0, index + 1).filter(({ kind }) => kind === capture.kind).length
                      }`}
                      onClick={() => toggleEvidence(capture.id)}
                      className={`relative h-16 w-16 shrink-0 overflow-hidden rounded border-2 ${
                        selected ? 'border-brand-500' : 'border-transparent opacity-70'
                      }`}
                    >
                      {capture.kind === 'VIDEO' ? (
                        <span className="flex h-full w-full items-center justify-center bg-gray-900 text-xs text-white">
                          Video
                        </span>
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={capture.url} alt="" className="h-full w-full object-cover" />
                      )}
                      {selected && (
                        <span className="absolute right-0.5 top-0.5 rounded-full bg-brand-500 px-1 text-[10px] leading-4 text-white">
                          ✓
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {item.sourceCaptureId && (
            <button
              type="button"
              onClick={() => onShowEvidence(item.sourceCaptureId!, item.sourceTimestampSec)}
              className="action-secondary px-3 font-mono text-xs"
            >
              {item.sourceTimestampSec !== null ? timecode(item.sourceTimestampSec) : 'photo'}
            </button>
          )}

          {checkInPhotos.length > 0 && (
            // What this line looked like when both parties signed, beside the line now.
            // Each overlay wraps its picture alone, so a check-in ring stays on its spot.
            <div>
              <p className="text-xs text-gray-500">At check-in</p>
              <div className="mt-1.5 flex gap-2 overflow-x-auto pb-1">
                {checkInPhotos.map((photo) => (
                  <a key={photo.id} href={photo.url} target="_blank" rel="noreferrer" className="relative block shrink-0 self-start overflow-hidden rounded border border-gray-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.url} alt="Check-in photo of this item" className="block h-20 w-auto" />
                    <MarkOverlay annotations={photo.annotations} />
                  </a>
                ))}
              </div>
            </div>
          )}

          {baseline && (
            // The condition, which is the comparison, and anything else only where this
            // row no longer says the same, each named, so "no serial" says the serial is new.
            <p className="text-xs text-gray-500">
              {/* An addendum's line is marked as the reference panel marks it. */}
              {baseline.update ? 'At check-in, updated:' : 'At check-in:'}{' '}
              {[
                baseline.condition,
                differs(baseline.name, item.name) ? `name: ${baseline.name}` : null,
                baseline.quantity !== item.quantity ? `×${baseline.quantity}` : null,
                differs(baseline.identifier, item.identifier) ? quoted('serial', baseline.identifier) : null,
                differs(baseline.meterReading, item.meterReading) ? quoted('reading', baseline.meterReading) : null,
                differs(baseline.notes, item.notes) ? quoted('notes', baseline.notes) : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          )}

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => startTransition(() => void deleteItem(item.id, inspectionId))}
              className="action-danger px-3 text-xs"
            >
              Remove
            </button>
            <button
              type="button"
              onClick={onToggle}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium hover:bg-gray-50"
            >
              Done
            </button>
          </div>
        </div>
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
  const [openId, setOpenId] = useState<string | null>(null)
  // Check-in photo links, signed when a row that has some is first opened rather than
  // on every render, as the check-in panel does.
  const [checkInUrls, setCheckInUrls] = useState<Record<string, string> | null>(null)
  const toggle = (item: EditableItem) => {
    const opening = openId !== item.id
    setOpenId(opening ? item.id : null)
    if (opening && checkInUrls === null && baselineOf(item)?.photoIds?.length) {
      void checkInPhotoLinks(roomId).then(setCheckInUrls)
    }
  }
  const [showUnchanged, setShowUnchanged] = useState(false)

  const baselineOf = (item: EditableItem) => checkIn?.lines.find((line) => line.key === item.baselineKey)
  // On a check-out most lines are as they were, so those fold away and what the
  // inspector has to look at comes first. Decided once, as the page opened: a line
  // edited now stays where the inspector found it rather than jumping out from under
  // their thumb, and says it has changed.
  const [unchangedAtOpen] = useState(
    () =>
      new Set(
        items
          .filter((item) => {
            const baseline = baselineOf(item)
            return baseline && !changedSince(item, baseline)
          })
          .map((item) => item.id),
      ),
  )
  const unchanged = items.filter((item) => unchangedAtOpen.has(item.id))
  const listed = items.filter((item) => !unchangedAtOpen.has(item.id))
  const changedCount = checkIn
    ? items.filter((item) => {
        const baseline = baselineOf(item)
        return !baseline || changedSince(item, baseline)
      }).length
    : 0

  const row = (item: EditableItem) => (
    <ItemRow
      key={item.id}
      item={item}
      baseline={baselineOf(item)}
      onCheckOut={checkIn !== null}
      inspectionId={inspectionId}
      captures={captures}
      checkInPhotos={(baselineOf(item)?.photoIds ?? []).flatMap((photoId) => {
        const url = checkInUrls?.[photoId]
        const photo = checkIn?.photos.find(({ id }) => id === photoId)
        return url && photo ? [{ id: photoId, url, annotations: photo.annotations }] : []
      })}
      open={openId === item.id}
      onToggle={() => toggle(item)}
      onShowEvidence={showEvidence}
    />
  )

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
      {checkIn && <CheckInReferencePanel roomId={roomId} reference={checkIn} />}

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
              {checkIn && (changedCount === 0 ? ' · none changed since check-in' : ` · ${changedCount} changed since check-in`)}
            </p>
          </div>
        </div>

        {listed.map(row)}

        {unchanged.length > 0 && (
          <>
            <button
              type="button"
              aria-expanded={showUnchanged}
              onClick={() => setShowUnchanged(!showUnchanged)}
              className="flex w-full items-center justify-between border-t border-gray-100 bg-gray-50 px-4 py-3 text-left text-sm text-gray-600 hover:bg-gray-100"
            >
              <span>
                {unchanged.length} {unchanged.length === 1 ? 'line' : 'lines'} as at check-in
              </span>
              <span className="text-xs font-medium text-brand-600">{showUnchanged ? 'Hide' : 'Show'}</span>
            </button>
            {showUnchanged && unchanged.map(row)}
          </>
        )}

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
            onClick={() =>
              startTransition(async () => {
                // Opened, since the first thing to do with a new line is name it.
                setOpenId(await addItem(roomId, inspectionId))
              })
            }
            className="action-secondary"
          >
            + Add an item
          </button>
        </div>
      </div>

      {unchanged.length > 0 && (
        <p className="text-right text-sm text-gray-600">
          Marking the room reviewed records the {unchanged.length} folded{' '}
          {unchanged.length === 1 ? 'line' : 'lines'} as you found them at check-in.
        </p>
      )}

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
                className="action-secondary"
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
