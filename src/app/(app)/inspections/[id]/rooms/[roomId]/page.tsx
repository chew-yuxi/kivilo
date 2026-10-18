import Link from 'next/link'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { requireAgent, inspectionScope } from '@/lib/auth'
import { createDownloadUrl } from '@/lib/storage'
import { roomHref } from '@/lib/routes'
import { toAnnotations } from '@/lib/annotations'
import { checkInReference } from '@/lib/check-in-reference'
import { ReviewEditor, type EvidenceCapture } from '@/components/review-editor'

export const dynamic = 'force-dynamic'

export default async function RoomReviewPage({
  params,
}: PageProps<'/inspections/[id]/rooms/[roomId]'>) {
  const { id, roomId } = await params

  const agent = await requireAgent()

  const room = await db.room.findFirst({
    where: { id: roomId, inspection: inspectionScope(agent.id) },
    // Read through `checkInReference`, which checks the agent may see the check-in.
    omit: { baseline: true },
    include: {
      items: { orderBy: { createdAt: 'asc' }, include: { evidence: { select: { captureId: true } } } },
      captures: { orderBy: { createdAt: 'asc' } },
    },
  })

  if (!room || room.inspectionId !== id) notFound()

  // Marking this room reviewed hands the inspector the next room that still needs
  // them, in walk order, rather than sending them back to the list to find it.
  const nextRoom = await db.room.findFirst({
    where: { inspectionId: id, order: { gt: room.order }, status: { not: 'REVIEWED' } },
    orderBy: { order: 'asc' },
    select: { id: true, status: true },
  })

  const [captures, checkIn] = await Promise.all([
    Promise.all(
      room.captures.map(
        async (capture): Promise<EvidenceCapture> => ({
          id: capture.id,
          kind: capture.kind,
          url: await createDownloadUrl(capture.storagePath),
          annotations: toAnnotations(capture.annotations),
        }),
      ),
    ),
    checkInReference(room.id, agent.id),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between text-sm">
        <Link href={`/inspections/${id}`} className="text-gray-600 hover:underline">
          ← All rooms
        </Link>
        <Link
          href={`/inspections/${id}/rooms/${room.id}/capture`}
          className="font-medium text-brand-600 hover:underline"
        >
          Add captures
        </Link>
      </div>

      <ReviewEditor
        inspectionId={id}
        roomId={room.id}
        roomName={room.name}
        items={room.items.map(({ evidence, ...item }) => ({
          ...item,
          evidenceCaptureIds: evidence.map(({ captureId }) => captureId),
        }))}
        captures={captures}
        checkIn={checkIn}
        alreadyReviewed={room.status === 'REVIEWED'}
        nextHref={nextRoom ? roomHref(id, nextRoom) : `/inspections/${id}`}
      />
    </div>
  )
}
