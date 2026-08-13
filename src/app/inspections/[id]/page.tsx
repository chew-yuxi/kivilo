import Link from 'next/link'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { createDownloadUrl } from '@/lib/storage'
import { propertyLabel, timecode } from '@/lib/format'
import { StatusBadge } from '@/components/status-badge'
import { CaptureUploader } from '@/components/capture-uploader'
import { ReviewEditor } from '@/components/review-editor'
import { SignaturePad } from '@/components/signature-pad'
import { FindingsPanel, type FindingRow } from '@/components/findings-panel'
import { ProcessingPoller } from '@/components/processing-poller'
import { CheckOutButton } from '@/components/check-out-button'

export const dynamic = 'force-dynamic'

export default async function InspectionPage({ params }: PageProps<'/inspections/[id]'>) {
  const { id } = await params

  const inspection = await db.inspection.findUnique({
    where: { id },
    include: {
      tenancy: { include: { property: true, landlord: true, tenant: true, agent: true } },
      captures: { orderBy: { createdAt: 'desc' } },
      rooms: { include: { items: { orderBy: { createdAt: 'asc' } } }, orderBy: { order: 'asc' } },
      signatures: true,
      checkOut: { select: { id: true } },
      findings: {
        orderBy: { createdAt: 'asc' },
        include: {
          item: { include: { room: true } },
          baselineItem: { include: { room: true } },
        },
      },
    },
  })

  if (!inspection) notFound()

  const { tenancy, status, kind } = inspection
  const capture = inspection.captures[0]
  const videoUrl = capture ? await createDownloadUrl(capture.storagePath) : null

  const signatureFor = (stakeholderId: string) =>
    inspection.signatures.find((s) => s.stakeholderId === stakeholderId)?.signedAt ?? null

  const findings: FindingRow[] = inspection.findings.map((finding) => ({
    id: finding.id,
    changeType: finding.changeType,
    verdict: finding.verdict,
    rationale: finding.rationale,
    estimatedCost: finding.estimatedCost?.toString() ?? null,
    confidence: finding.confidence,
    itemLabel: finding.item ? `${finding.item.room.name} — ${finding.item.name}` : null,
    baselineLabel: finding.baselineItem
      ? `${finding.baselineItem.room.name} — ${finding.baselineItem.name}`
      : null,
    baselineCondition: finding.baselineItem?.condition ?? null,
    currentCondition: finding.item?.condition ?? null,
  }))

  return (
    <div className="space-y-8">
      <div>
        <Link href="/" className="text-sm text-gray-500 hover:underline">
          ← All inspections
        </Link>
        <div className="mt-3 flex items-start justify-between gap-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {kind === 'CHECK_IN' ? 'Check-in' : 'Check-out'}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {propertyLabel(tenancy.property)} · {tenancy.tenant.name}
              {capture?.durationSec && ` · ${timecode(capture.durationSec)} walkthrough`}
            </p>
          </div>
          <StatusBadge status={status} />
        </div>
        {inspection.summary && (
          <p className="mt-4 max-w-3xl rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700">
            {inspection.summary}
          </p>
        )}
      </div>

      {status === 'DRAFT' && <CaptureUploader inspectionId={id} />}

      {(status === 'CAPTURING' || status === 'PROCESSING') && (
        <div className="rounded-lg border border-gray-200 bg-white p-10 text-center">
          <p className="text-sm font-medium">
            {status === 'CAPTURING' ? 'Uploading walkthrough' : 'Reading the walkthrough'}
          </p>
          <p className="mx-auto mt-1 max-w-md text-sm text-gray-500">
            Segmenting rooms, identifying fixtures and appliances, reading meters, and
            transcribing the narration. A ten-minute video takes a few minutes.
          </p>
          <ProcessingPoller />
        </div>
      )}

      {status === 'FAILED' && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6">
          <p className="text-sm font-medium text-red-900">Processing failed</p>
          <p className="mt-1 font-mono text-xs text-red-700">{inspection.processingError}</p>
        </div>
      )}

      {status === 'REVIEW' && (
        <ReviewEditor inspectionId={id} rooms={inspection.rooms} videoUrl={videoUrl} />
      )}

      {(status === 'AWAITING_SIGNATURE' || status === 'COMPLETED') && (
        <>
          <section className="space-y-3">
            <h2 className="text-sm font-medium">Signatures</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <SignaturePad
                inspectionId={id}
                stakeholderId={tenancy.landlordId}
                stakeholderName={tenancy.landlord.name}
                role="landlord"
                signedAt={signatureFor(tenancy.landlordId)}
              />
              <SignaturePad
                inspectionId={id}
                stakeholderId={tenancy.tenantId}
                stakeholderName={tenancy.tenant.name}
                role="tenant"
                signedAt={signatureFor(tenancy.tenantId)}
              />
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-medium">Agreed inventory</h2>
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
              {inspection.rooms.map((room) => (
                <div key={room.id}>
                  <h3 className="border-t border-gray-200 bg-gray-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 first:border-t-0">
                    {room.name}
                  </h3>
                  {room.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-baseline gap-4 border-t border-gray-100 px-4 py-2.5 text-sm"
                    >
                      <span className="w-56 shrink-0 font-medium">{item.name}</span>
                      <span className="w-20 shrink-0 text-xs text-gray-500">
                        {item.condition}
                      </span>
                      <span className="text-gray-600">
                        {item.meterReading ? `Reading: ${item.meterReading}` : item.notes}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {status === 'COMPLETED' && kind === 'CHECK_IN' && (
        <CheckOutButton baselineId={id} existingCheckOutId={inspection.checkOut?.id ?? null} />
      )}

      {kind === 'CHECK_OUT' && (status === 'AWAITING_SIGNATURE' || status === 'COMPLETED') && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium">Comparison against check-in</h2>
          <FindingsPanel
            inspectionId={id}
            findings={findings}
            depositAmount={tenancy.deposit.toString()}
          />
        </section>
      )}
    </div>
  )
}
