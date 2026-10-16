import { createDownloadUrl } from '@/lib/storage'
import { propertyLabel, sgd } from '@/lib/format'
import { MarkOverlay } from '@/components/mark-overlay'
import { toAnnotations, type StoredAnnotations } from '@/lib/annotations'
import { assessmentSnapshotSchema } from '@/lib/assessment-schema'
import { shortFingerprint } from '@/lib/report-fingerprint'
import type { reportInclude } from '@/lib/report'
import { addendumView } from '@/lib/addenda'
import { AddendumSection } from '@/components/addendum-section'
import type { Prisma } from '@/generated/prisma'

const VERDICT_LABEL = {
  TENANT_LIABLE: 'Tenant liable',
  FAIR_WEAR: 'Fair wear and tear',
  DISPUTED: 'Disputed',
  UNDECIDED: 'Undecided',
} as const

/// The report as a document: what the landlord and tenant agree to. Rendered by the shared
/// link (`/reports/[token]`) and by the signing page (`/sign/[inspectionId]`), so the
/// thing a party signs and the thing they are later shown are the same markup. The PDF
/// link is the caller's, since only the token page has one that works without a session.
export async function ReportDocument({
  inspection,
  pdfHref,
}: {
  inspection: Prisma.InspectionGetPayload<{ include: typeof reportInclude }>
  pdfHref: string | null
}) {
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

  const published = inspection.assessments[0] ?? null
  const assessment = published ? assessmentSnapshotSchema.parse(published.snapshot) : null
  const maintenanceEvidenceUrls = new Map<string, { id: string; purpose: string; mimeType: string; note: string | null; url: string }[]>()
  if (assessment) {
    await Promise.all(assessment.findings.map(async (finding) => {
      const evidence = finding.maintenanceEvidence?.evidence ?? []
      maintenanceEvidenceUrls.set(finding.id, await Promise.all(evidence.map(async (item) => ({
        id: item.id,
        purpose: item.purpose,
        mimeType: item.mimeType,
        note: item.note,
        url: await createDownloadUrl(item.storagePath, 60 * 60 * 24),
      }))))
    }))
  }
  const liable = assessment?.findings.filter((f) => f.verdict === 'TENANT_LIABLE') ?? []
  const claimTotal = liable.reduce((sum, f) => sum + Number(f.estimatedCost ?? 0), 0)
  const itemCount = inspection.rooms.reduce((n, room) => n + room.items.length, 0)

  const dateFormat = new Intl.DateTimeFormat('en-SG', { dateStyle: 'long' })
  // The agent on the deal heads the report with their agency, if they have set one.
  const branding = tenancy.agent?.branding ?? null
  const logoUrl = branding?.logoPath ? await createDownloadUrl(branding.logoPath, 60 * 60 * 24) : null

  return (
    <article className="mx-auto max-w-3xl bg-white p-5 sm:p-10 print:p-0">
      <header className="border-b border-gray-300 pb-6">
        {branding && tenancy.agent && (
          <div className="mb-6 flex items-start justify-between gap-6 border-b border-gray-200 pb-5">
            <div className="flex min-w-0 items-center gap-3">
              {logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt={branding.agencyName} className="h-12 w-auto max-w-40 object-contain" />
              )}
              <div className="min-w-0">
                <p className="font-semibold text-gray-900">{branding.agencyName}</p>
                {branding.agencyLicence && (
                  <p className="text-xs text-gray-500">Agency licence {branding.agencyLicence}</p>
                )}
              </div>
            </div>
            <div className="shrink-0 text-right text-xs leading-relaxed text-gray-600">
              <p className="font-medium text-gray-900">{tenancy.agent.name}</p>
              {branding.ceaRegistration && <p>CEA registration {branding.ceaRegistration}</p>}
              {branding.phone && <p>{branding.phone}</p>}
              {tenancy.agent.email && <p>{tenancy.agent.email}</p>}
            </div>
          </div>
        )}
        <div className="flex flex-col-reverse gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">
              {branding ? 'Condition report' : 'Kivilo condition report'}
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">
              {isCheckOut ? 'Check-out' : 'Check-in'} inventory and schedule of condition
            </h1>
            <p className="mt-1 text-sm text-gray-600">{propertyLabel(tenancy.property)}</p>
          </div>
          {/* The PDF is drawn on the server: a browser print would page the report badly and
              stamp this page's address, which is the share token, into its footer. */}
          {pdfHref && (
            <a
              href={pdfHref}
              className="self-start rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50 print:hidden"
            >
              Download PDF
            </a>
          )}
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
              {inspection.rooms.length} {inspection.rooms.length === 1 ? 'room' : 'rooms'},{' '}
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </dd>
          </div>
        </dl>
      </header>

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
                        Nothing recorded in this room.
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
              {signature.contentHash && (
                <p className="text-xs text-gray-500">
                  Content fingerprint{' '}
                  <span className="font-mono">{shortFingerprint(signature.contentHash)}</span>
                </p>
              )}
            </div>
          ))}
          {inspection.signatures.length === 0 && (
            <p className="text-sm text-gray-500">Not yet countersigned.</p>
          )}
        </div>
      </section>

      {inspection.addenda.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Updates since signing
          </h2>
          <div className="mt-4 space-y-8">
            {inspection.addenda.map((row) => (
              <AddendumSection key={row.id} addendum={addendumView(row, tenancy)} />
            ))}
          </div>
        </section>
      )}

      {isCheckOut && assessment && published && (
        <section className="mt-10 break-inside-avoid border-t border-gray-300 pt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Separate post-signature assessment · version {published.version}
          </h2>
          <p className="mt-2 text-xs text-gray-500">
            Reviewed and published {published.publishedAt.toLocaleString('en-SG')}.
            This assessment is separate from the signed inventory above.
          </p>
          {assessment.summary && (
            <p className="mt-4 text-sm leading-relaxed text-gray-700">{assessment.summary}</p>
          )}
          <p className="mt-4 text-sm text-gray-700">
            {liable.length} of {assessment.findings.length} findings assess tenant liability,
            totalling <strong>{sgd(claimTotal)}</strong> against a deposit of{' '}
            {sgd(tenancy.deposit.toString())}.
          </p>
          <ul className="mt-4 space-y-3">
            {assessment.findings.map((finding) => (
              <li key={finding.id} className="break-inside-avoid rounded border border-gray-200 p-3 text-sm">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="font-medium">{finding.itemLabel}</span>
                  <span className="shrink-0 text-xs uppercase tracking-wide text-gray-500">
                    {VERDICT_LABEL[finding.verdict]}
                    {finding.estimatedCost && `, ${sgd(finding.estimatedCost)}`}
                  </span>
                </div>
                <p className="mt-1 text-gray-600">{finding.rationale}</p>
                {finding.maintenanceEvidence && (
                  <div className="mt-3 border-t border-gray-100 pt-3">
                    <p className="text-xs font-medium text-gray-700">
                      Maintenance record: {finding.maintenanceEvidence.title}
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {(maintenanceEvidenceUrls.get(finding.id) ?? []).map((item) => (
                        item.mimeType.startsWith('image/') ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={item.id}
                            src={item.url}
                            alt={item.note ?? `${item.purpose.toLowerCase()} maintenance evidence`}
                            className="h-32 w-full rounded border border-gray-200 object-contain"
                          />
                        ) : (
                          <a
                            key={item.id}
                            href={item.url}
                            className="rounded border border-gray-200 p-3 text-xs text-brand-700 underline"
                          >
                            {item.purpose.toLowerCase()} evidence
                          </a>
                        )
                      ))}
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="mt-8 border-t border-gray-200 pt-4 text-xs leading-relaxed text-gray-500">
        Rooms and items in this report were written by the inspector against a recorded
        walkthrough and agreed by the people named above. The recordings and
        photographs are retained as the underlying evidence. Where a photograph carries
        marks, the inspector drew them to point out a detail; they are recorded
        separately and nothing has been painted onto the photograph itself.
        {branding && <span className="mt-2 block">Prepared with Kivilo.</span>}
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
  const markNotes = photo.annotations?.marks.flatMap((mark, index) =>
    mark.note ? [`${index + 1}. ${mark.note}`] : [],
  ) ?? []
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
      {(caption || markNotes.length > 0) && (
        <figcaption className="mt-1 text-xs text-gray-500">
          {caption && <div>{caption}</div>}
          {markNotes.map((note) => (
            <div key={note}>{note}</div>
          ))}
        </figcaption>
      )}
    </figure>
  )
}
