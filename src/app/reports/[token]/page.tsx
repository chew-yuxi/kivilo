import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { db } from '@/lib/db'
import { createDownloadUrl } from '@/lib/storage'
import { propertyLabel, sgd } from '@/lib/format'
import { PrintButton } from '@/components/print-button'
import { MarkOverlay } from '@/components/mark-overlay'
import { toAnnotations, type StoredAnnotations } from '@/lib/annotations'

export const dynamic = 'force-dynamic'

/// The token is the credential, so the page must never be indexed or cached by an
/// intermediary. A condition report names both parties and their unit.
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
}

const VERDICT_LABEL = {
  TENANT_LIABLE: 'Tenant liable',
  FAIR_WEAR: 'Fair wear and tear',
  DISPUTED: 'Disputed',
  UNDECIDED: 'Undecided',
} as const

export default async function ReportPage({ params }: PageProps<'/reports/[token]'>) {
  const { token } = await params

  const inspection = await db.inspection.findUnique({
    where: { shareToken: token },
    include: {
      tenancy: { include: { property: true, landlord: true, tenant: true, agent: true } },
      conductedBy: true,
      rooms: {
        orderBy: { order: 'asc' },
        include: {
          items: { orderBy: { createdAt: 'asc' } },
          captures: { where: { kind: 'PHOTO' }, orderBy: { createdAt: 'asc' } },
        },
      },
      signatures: { include: { stakeholder: true } },
      findings: {
        orderBy: { createdAt: 'asc' },
        include: { item: { include: { room: true } }, baselineItem: { include: { room: true } } },
      },
    },
  })

  // An unknown or revoked token is indistinguishable from a report that never existed.
  if (!inspection) notFound()

  const { tenancy, kind } = inspection
  const isCheckOut = kind === 'CHECK_OUT'

  // Signed URLs are minted per render, so a link shared today still resolves next month
  // without the storage objects ever being public.
  const photosByRoom = new Map<
    string,
    { id: string; url: string; note: string | null; annotations: StoredAnnotations | null }[]
  >()
  for (const room of inspection.rooms) {
    photosByRoom.set(
      room.id,
      await Promise.all(
        room.captures.map(async (capture) => ({
          id: capture.id,
          url: await createDownloadUrl(capture.storagePath, 60 * 60 * 24),
          note: capture.note,
          annotations: toAnnotations(capture.annotations),
        })),
      ),
    )
  }

  const liable = inspection.findings.filter((f) => f.verdict === 'TENANT_LIABLE')
  const claimTotal = liable.reduce((sum, f) => sum + Number(f.estimatedCost ?? 0), 0)
  const itemCount = inspection.rooms.reduce((n, room) => n + room.items.length, 0)

  const dateFormat = new Intl.DateTimeFormat('en-SG', { dateStyle: 'long' })

  return (
    <article className="mx-auto max-w-3xl bg-white p-5 sm:p-10 print:p-0">
      <header className="border-b border-gray-300 pb-6">
        <div className="flex flex-col-reverse gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">
              Kivilo condition report
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">
              {isCheckOut ? 'Check-out' : 'Check-in'} inventory and schedule of condition
            </h1>
            <p className="mt-1 text-sm text-gray-600">{propertyLabel(tenancy.property)}</p>
          </div>
          <PrintButton />
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">Landlord</dt>
            <dd className="mt-0.5">{tenancy.landlord.name}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">Tenant</dt>
            <dd className="mt-0.5">{tenancy.tenant.name}</dd>
          </div>
          {tenancy.agent && (
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-500">Agent</dt>
              <dd className="mt-0.5">{tenancy.agent.name}</dd>
            </div>
          )}
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">Tenancy</dt>
            <dd className="mt-0.5">
              {dateFormat.format(tenancy.startDate)} to {dateFormat.format(tenancy.endDate)}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">Inspected</dt>
            <dd className="mt-0.5">
              {inspection.conductedAt ? dateFormat.format(inspection.conductedAt) : 'Not recorded'}
              {inspection.conductedBy && ` by ${inspection.conductedBy.name}`}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">Scope</dt>
            <dd className="mt-0.5">
              {inspection.rooms.length} rooms, {itemCount} items
            </dd>
          </div>
        </dl>
      </header>

      {inspection.summary && (
        <p className="mt-6 text-sm leading-relaxed text-gray-700">{inspection.summary}</p>
      )}

      {isCheckOut && inspection.findings.length > 0 && (
        <section className="mt-8 break-inside-avoid">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Deposit position
          </h2>
          <p className="mt-2 text-sm text-gray-700">
            {liable.length} of {inspection.findings.length} findings are drafted as tenant
            liability, totalling <strong>{sgd(claimTotal)}</strong> against a deposit of{' '}
            {sgd(tenancy.deposit.toString())}. Each finding below states the reasoning so
            both parties can see how it was reached.
          </p>

          <ul className="mt-4 space-y-3">
            {inspection.findings.map((finding) => (
              <li
                key={finding.id}
                className="break-inside-avoid rounded border border-gray-200 p-3 text-sm"
              >
                <div className="flex items-baseline justify-between gap-4">
                  <span className="font-medium">
                    {finding.item
                      ? `${finding.item.room.name}, ${finding.item.name}`
                      : finding.baselineItem
                        ? `${finding.baselineItem.room.name}, ${finding.baselineItem.name}`
                        : 'Unmatched item'}
                  </span>
                  <span className="shrink-0 text-xs uppercase tracking-wide text-gray-500">
                    {VERDICT_LABEL[finding.verdict]}
                    {finding.estimatedCost && `, ${sgd(finding.estimatedCost.toString())}`}
                  </span>
                </div>
                <p className="mt-1 text-gray-600">{finding.rationale}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Inventory and condition
        </h2>

        {inspection.rooms.map((room) => {
          const photos = photosByRoom.get(room.id) ?? []
          return (
            <div key={room.id} className="mt-5 break-inside-avoid">
              <h3 className="border-b border-gray-200 pb-1 text-sm font-semibold">{room.name}</h3>

              <table className="mt-2 w-full text-sm">
                <tbody>
                  {room.items.map((item) => (
                    <tr key={item.id} className="break-inside-avoid border-b border-gray-100">
                      <td className="py-2 pr-3 align-top">
                        <span className="font-medium">{item.name}</span>
                        {item.quantity > 1 && (
                          <span className="text-gray-500"> ×{item.quantity}</span>
                        )}
                        {item.identifier && (
                          <span className="mt-0.5 block font-mono text-xs text-gray-500">
                            {item.identifier}
                          </span>
                        )}
                      </td>
                      <td className="w-24 py-2 pr-3 align-top text-xs uppercase tracking-wide text-gray-600">
                        {item.condition}
                      </td>
                      <td className="py-2 align-top text-gray-700">
                        {item.meterReading && (
                          <span className="font-mono">Reading: {item.meterReading}</span>
                        )}
                        {item.meterReading && item.notes && <br />}
                        {item.notes}
                      </td>
                    </tr>
                  ))}
                  {room.items.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-2 text-gray-500">
                        No items recorded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {photos.length > 0 && (
                <div className="mt-3 space-y-2">
                  {/* A marked photo gets the full column. A ring around a chip that is
                      5 percent of the frame is 11px across in a 3-up tile and useless
                      on paper; at full width it is legible, which is the only reason
                      the mark exists. */}
                  {photos
                    .filter((photo) => photo.annotations)
                    .map((photo) => (
                      <ReportPhoto key={photo.id} photo={photo} roomName={room.name} />
                    ))}
                  {photos.some((photo) => !photo.annotations) && (
                    <div className="grid grid-cols-3 gap-2">
                      {photos
                        .filter((photo) => !photo.annotations)
                        .map((photo) => (
                          <ReportPhoto key={photo.id} photo={photo} roomName={room.name} />
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </section>

      <section className="mt-10 break-inside-avoid border-t border-gray-300 pt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Agreed and signed
        </h2>
        <div className="mt-4 grid grid-cols-2 gap-6">
          {inspection.signatures.map((signature) => (
            <div key={signature.id}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={signature.imageData}
                alt={`Signature of ${signature.stakeholder.name}`}
                className="h-16 object-contain object-left"
              />
              <p className="mt-1 border-t border-gray-300 pt-1 text-sm font-medium">
                {signature.stakeholder.name}
              </p>
              <p className="text-xs text-gray-500">
                Signed {signature.signedAt.toLocaleString('en-SG')}
              </p>
            </div>
          ))}
          {inspection.signatures.length === 0 && (
            <p className="text-sm text-gray-500">Not yet countersigned.</p>
          )}
        </div>
      </section>

      <footer className="mt-8 border-t border-gray-200 pt-4 text-xs leading-relaxed text-gray-500">
        Rooms and items in this report were drafted from a recorded walkthrough and then
        reviewed, corrected, and agreed by the people named above. The recordings and
        photographs are retained as the underlying evidence. Where a photograph carries
        marks, the inspector drew them to point out a detail; they are recorded
        separately and nothing has been painted onto the photograph itself.
      </footer>
    </article>
  )
}

/// One evidence photograph. The `relative` wrapper contains only the <img>, never the
/// caption, so the overlay's box is exactly the picture's box.
function ReportPhoto({
  photo,
  roomName,
}: {
  photo: { id: string; url: string; note: string | null; annotations: StoredAnnotations | null }
  roomName: string
}) {
  const marks = photo.annotations?.marks.length ?? 0
  // Also the fallback when the signed URL has expired and the picture will not load:
  // the reader gets the sentence rather than marks floating over a broken image.
  const caption = [photo.note, marks > 0 && `${marks} area${marks === 1 ? '' : 's'} marked`]
    .filter(Boolean)
    .join(' · ')

  return (
    <figure className="break-inside-avoid">
      <div className="relative overflow-hidden rounded border border-gray-200">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.url}
          alt={photo.note ?? `${roomName} evidence photo`}
          className="block w-full"
        />
        <MarkOverlay annotations={photo.annotations} />
      </div>
      {caption && <figcaption className="mt-1 text-xs text-gray-500">{caption}</figcaption>}
    </figure>
  )
}
