import Link from 'next/link'
import { MarkOverlay } from '@/components/mark-overlay'
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
/// so they can compare without leaving it. Reference only: nothing here writes a line.
export function CheckInReferencePanel({
  reference,
  open,
}: {
  reference: CheckInReference
  open: boolean
}) {
  const date = reference.conductedAt
    ? new Date(reference.conductedAt).toLocaleDateString('en-SG', {
        dateStyle: 'long',
        // Fixed, so the server and the phone render the same date.
        timeZone: 'Asia/Singapore',
      })
    : null

  return (
    <details open={open} className="rounded-lg border border-gray-200 bg-white">
      <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
        At check-in{date && <span className="font-normal text-gray-500"> · {date}</span>}
      </summary>

      {reference.photos.length > 0 && (
        <div className="flex snap-x gap-3 overflow-x-auto border-t border-gray-100 px-4 py-3">
          {reference.photos.map((photo) => (
            // The same rules as the review strip: the positioned box wraps the
            // picture alone, self-start so it never stretches, and object-contain
            // so a mark sits on what it points at.
            <div
              key={photo.id}
              className="relative shrink-0 snap-start self-start overflow-hidden rounded-md border border-gray-200"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt="Check-in photo"
                // Closed on the capture screen, so nothing downloads there unless the
                // inspector opens it, and the upload queue keeps the signal.
                loading="lazy"
                className="block h-32 w-auto max-w-[70vw] object-contain"
              />
              <MarkOverlay annotations={photo.annotations} />
            </div>
          ))}
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
