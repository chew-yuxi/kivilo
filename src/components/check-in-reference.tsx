'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { MarkOverlay } from '@/components/mark-overlay'
import { checkInPhotoLinks } from '@/lib/actions'
import type { CheckInReference } from '@/lib/check-in-reference'
import type { ItemCondition } from '@/generated/prisma'

export const CONDITION_TONE: Record<ItemCondition, string> = {
  NEW: 'text-emerald-700 bg-emerald-50',
  GOOD: 'text-emerald-700 bg-emerald-50',
  FAIR: 'text-amber-800 bg-amber-50',
  POOR: 'text-orange-800 bg-orange-50',
  DAMAGED: 'text-red-700 bg-red-50',
}

/// The check-in's photos and lines for the room a check-out inspector is standing in,
/// so they can compare without leaving it. Closed until asked for, so it never stands
/// between the inspector and the camera or the inventory, which carries each copied
/// row's check-in line itself. Reference only: nothing here writes a line.
export function CheckInReferencePanel({ roomId, reference }: { roomId: string; reference: CheckInReference }) {
  // Signed URLs by photo id, fetched each time the panel opens, so a panel opened (or
  // reopened) an hour after the last fetch still gets live ones and a closed one costs
  // nothing.
  const [urls, setUrls] = useState<Record<string, string> | null>(null)
  const [unreachable, setUnreachable] = useState(false)
  // Only the latest open's answer counts, so a slow earlier one cannot overwrite it.
  const latest = useRef(0)
  const date = reference.conductedAt
    ? new Date(reference.conductedAt).toLocaleDateString('en-SG', {
        dateStyle: 'long',
        // Fixed, so the server and the phone render the same date.
        timeZone: 'Asia/Singapore',
      })
    : null
  const hasUpdates =
    reference.photos.some((photo) => photo.update) || reference.lines.some((line) => line.update)

  return (
    <details
      className="rounded-lg border border-gray-200 bg-white"
      onToggle={(e) => {
        if (!e.currentTarget.open || reference.photos.length === 0) return
        // Never the last set: those may have expired, and a failure must not leave
        // them up as broken pictures instead of saying so.
        setUrls(null)
        setUnreachable(false)
        const request = ++latest.current
        // The server records its own failures, so what reaches here is no signal, which
        // is said on screen rather than reported as a bug; opening again retries.
        checkInPhotoLinks(roomId).then(
          (fresh) => {
            if (request !== latest.current) return
            // Nothing back for photos that exist means the check-in is out of reach
            // now, say through a team change since the page rendered.
            if (Object.keys(fresh).length === 0) setUnreachable(true)
            else setUrls(fresh)
          },
          () => request === latest.current && setUnreachable(true),
        )
      }}
    >
      <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
        At check-in{date && <span className="font-normal text-gray-500"> · {date}</span>}
        {hasUpdates && <span className="font-normal text-gray-500">, with acknowledged updates</span>}
      </summary>

      {reference.photos.length > 0 && (
        <div className="flex snap-x gap-3 overflow-x-auto border-t border-gray-100 px-4 py-3">
          {urls === null ? (
            <p className="text-sm text-gray-500">
              {unreachable ? 'Could not load the photos. Close and open this again to retry.' : 'Loading photos…'}
            </p>
          ) : (
            reference.photos.map((photo) => {
              const caption = [photo.update ? 'Update' : null, photo.caption].filter(Boolean).join(' · ')
              // Numbered as the report numbers them, so a ring says what it points at.
              const markNotes =
                photo.annotations?.marks.flatMap((mark, index) =>
                  mark.note ? [`${index + 1}. ${mark.note}`] : [],
                ) ?? []
              return (
                // The same rules as the review strip: the positioned box wraps the
                // picture alone, never its caption, and w-fit so a caption wider than the
                // picture cannot widen it; self-start so it never stretches; object-contain
                // so a mark sits on what it points at. w-min wraps the caption to the
                // picture's width.
                <figure key={photo.id} className="w-min shrink-0 snap-start self-start">
                  <div className="relative w-fit overflow-hidden rounded-md border border-gray-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={urls[photo.id]}
                      alt="Check-in photo"
                      className="block h-32 w-auto max-w-[70vw] object-contain"
                    />
                    <MarkOverlay annotations={photo.annotations} />
                  </div>
                  {(caption || markNotes.length > 0) && (
                    <figcaption className="mt-1 text-xs text-gray-500">
                      {caption}
                      {markNotes.map((note) => (
                        <span key={note} className="block">
                          {note}
                        </span>
                      ))}
                    </figcaption>
                  )}
                </figure>
              )
            })
          )}
        </div>
      )}

      {reference.lines.length === 0 ? (
        <p className="border-t border-gray-100 px-4 py-3 text-sm text-gray-600">
          Nothing recorded in this room at check-in.
        </p>
      ) : (
        <ul className="divide-y divide-gray-100 border-t border-gray-100">
          {reference.lines.map((line) => (
            <li key={line.key} className="flex items-start gap-3 px-4 py-2 text-sm">
              <span
                className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${CONDITION_TONE[line.condition]}`}
              >
                {line.condition}
              </span>
              <span className="min-w-0">
                <span className="font-medium">
                  {line.name}
                  {line.quantity > 1 && ` ×${line.quantity}`}
                </span>
                {line.update && <span className="ml-2 text-xs text-gray-500">Update</span>}
                {line.identifier && (
                  <span className="block font-mono text-xs text-gray-500">{line.identifier}</span>
                )}
                {line.meterReading && (
                  <span className="block font-mono text-xs text-gray-500">{line.meterReading}</span>
                )}
                {line.notes && <span className="block text-gray-600">{line.notes}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="border-t border-gray-100 px-4 py-2.5 text-right">
        <Link
          href={`/inspections/${reference.baselineId}`}
          className="text-sm font-medium text-brand-600 hover:underline"
        >
          Open the full check-in
        </Link>
      </div>
    </details>
  )
}
