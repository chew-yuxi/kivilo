import Link from 'next/link'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { propertyLabel } from '@/lib/format'
import { StatusBadge } from '@/components/status-badge'
import { RoomCapture, type RoomRow } from '@/components/room-capture'
import { SignaturePad } from '@/components/signature-pad'
import { FindingsPanel, type FindingRow } from '@/components/findings-panel'
import { ProcessingPoller } from '@/components/processing-poller'
import { CheckOutButton } from '@/components/check-out-button'
import { CompleteReviewButton } from '@/components/complete-review-button'

export const dynamic = 'force-dynamic'

export default async function InspectionPage({ params }: PageProps<'/inspections/[id]'>) {
  const { id } = await params

  const inspection = await db.inspection.findUnique({
    where: { id },
    include: {
      tenancy: { include: { property: true, landlord: true, tenant: true, agent: true } },
      rooms: {
        orderBy: { order: 'asc' },
        include: {
          captures: { orderBy: { createdAt: 'asc' } },
          _count: { select: { items: true } },
        },
      },
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
  const isCapturePhase = ['DRAFT', 'CAPTURING', 'PROCESSING', 'REVIEW', 'FAILED'].includes(status)

  const rooms: RoomRow[] = inspection.rooms.map((room) => ({
    id: room.id,
    name: room.name,
    status: room.status,
    processingError: room.processingError,
    itemCount: room._count.items,
    captures: room.captures.map((capture) => ({
      id: capture.id,
      kind: capture.kind,
      note: capture.note,
      durationSec: capture.durationSec,
      sizeBytes: capture.sizeBytes,
    })),
  }))

  const anyProcessing = rooms.some((room) => room.status === 'PROCESSING')
  const allReviewed = rooms.length > 0 && rooms.every((room) => room.status === 'REVIEWED')

  const signatureFor = (stakeholderId: string) =>
    inspection.signatures.find((s) => s.stakeholderId === stakeholderId)?.signedAt ?? null

  const findings: FindingRow[] = inspection.findings.map((finding) => ({
    id: finding.id,
    changeType: finding.changeType,
    verdict: finding.verdict,
    rationale: finding.rationale,
    estimatedCost: finding.estimatedCost?.toString() ?? null,
    confidence: finding.confidence,
    itemLabel: finding.item ? `${finding.item.room.name} · ${finding.item.name}` : null,
    baselineLabel: finding.baselineItem
      ? `${finding.baselineItem.room.name} · ${finding.baselineItem.name}`
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

      {isCapturePhase && (
        <>
          <RoomCapture inspectionId={id} rooms={rooms} />
          {anyProcessing && <ProcessingPoller />}
          {allReviewed && <CompleteReviewButton inspectionId={id} roomCount={rooms.length} />}
        </>
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
                <AgreedRoom key={room.id} roomId={room.id} name={room.name} />
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

async function AgreedRoom({ roomId, name }: { roomId: string; name: string }) {
  const items = await db.inspectionItem.findMany({
    where: { roomId },
    orderBy: { createdAt: 'asc' },
  })

  return (
    <div>
      <h3 className="border-t border-gray-200 bg-gray-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 first:border-t-0">
        {name}
      </h3>
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-baseline gap-4 border-t border-gray-100 px-4 py-2.5 text-sm"
        >
          <span className="w-56 shrink-0">
            <span className="font-medium">{item.name}</span>
            {item.identifier && (
              <span className="mt-0.5 block font-mono text-xs text-gray-500">
                {item.identifier}
              </span>
            )}
          </span>
          <span className="w-20 shrink-0 text-xs text-gray-500">{item.condition}</span>
          <span className="text-gray-600">
            {item.meterReading ? `Reading: ${item.meterReading}` : item.notes}
          </span>
        </div>
      ))}
    </div>
  )
}
