import { createDownloadUrl } from '@/lib/storage'
import { entryHeading, type AddendumView } from '@/lib/addenda'

const dateFormat = new Intl.DateTimeFormat('en-SG', { dateStyle: 'long', timeZone: 'Asia/Singapore' })
const dateTime = new Intl.DateTimeFormat('en-SG', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Singapore' })

/// One published update to a signed report, as the shared report and the update page both
/// draw it. Server-rendered: photo URLs are signed per render, never stored.
export async function AddendumSection({ addendum }: { addendum: AddendumView }) {
  const entries = await Promise.all(addendum.entries.map(async (entry) => ({
    ...entry,
    photos: await Promise.all(entry.photos.map(async (photo) => ({
      ...photo,
      url: await createDownloadUrl(photo.storagePath, 60 * 60 * 24),
    }))),
  })))

  return (
    <section className="break-inside-avoid border-t border-gray-300 pt-6" aria-label={`Update ${addendum.number}`}>
      <div className="rounded-md bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
        Updated {dateFormat.format(new Date(addendum.effectiveDate))}
        <span className="font-normal text-amber-800"> · Update {addendum.number}</span>
      </div>
      <h3 className="mt-3 text-base font-semibold">{addendum.title}</h3>
      {addendum.reason && <p className="mt-1 text-sm text-gray-700">{addendum.reason}</p>}
      <p className="mt-1 text-xs text-gray-500">
        Published by {addendum.publishedBy} on {dateTime.format(new Date(addendum.publishedAt))}. This update
        is recorded beside the signed report above and does not change it.
      </p>

      <ul className="mt-4 space-y-4">
        {entries.map((entry) => (
          <li key={entry.id} className="break-inside-avoid rounded border border-gray-200 p-3 text-sm">
            <div className="flex items-baseline justify-between gap-4">
              <span className="font-medium">{entryHeading(entry)}</span>
              <span className="shrink-0 text-xs text-gray-500">{entry.roomName}</span>
            </div>
            {entry.target && entry.change === 'REPLACED' && (
              <p className="mt-1 text-xs text-gray-500">
                Was: {entry.target.name}
                {entry.target.identifier && <span className="font-mono"> · {entry.target.identifier}</span>}
              </p>
            )}
            {entry.line && (
              <p className="mt-1 text-gray-700">
                {entry.line.condition.toLowerCase()}
                {entry.line.quantity > 1 && ` · ×${entry.line.quantity}`}
                {entry.line.identifier && <span className="font-mono text-xs text-gray-600"> · {entry.line.identifier}</span>}
              </p>
            )}
            {entry.notes && <p className="mt-1 text-gray-700">{entry.notes}</p>}
            {entry.maintenanceCase && (
              <p className="mt-1 text-xs text-gray-500">From the repair record: {entry.maintenanceCase.title}</p>
            )}
            {entry.photos.length > 0 && (
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {entry.photos.map((photo) => (
                  <figure key={photo.id}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.url}
                      alt={photo.note ?? `${entryHeading(entry)} photo`}
                      className="h-36 w-full rounded border border-gray-200 object-contain"
                    />
                    {(photo.label || photo.note) && (
                      <figcaption className="mt-1 text-xs text-gray-500">
                        {[photo.label, photo.note].filter(Boolean).join(': ')}
                      </figcaption>
                    )}
                  </figure>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>

      <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
        {addendum.acknowledgements.map((ack) => (
          <div key={ack.role}>
            <dt className="text-xs uppercase tracking-wide text-gray-500">{ack.role}</dt>
            <dd className="mt-0.5">
              {ack.name}
              <span className={`block text-xs ${ack.acknowledgedAt ? 'text-emerald-700' : 'text-amber-700'}`}>
                {ack.acknowledgedAt
                  ? `Acknowledged ${dateTime.format(new Date(ack.acknowledgedAt))}`
                  : 'Pending acknowledgement'}
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
