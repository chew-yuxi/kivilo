import Link from 'next/link'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { requireAgent, inspectionScope } from '@/lib/auth'
import { createDownloadUrl } from '@/lib/storage'
import { ReviewEditor, type EvidenceCapture } from '@/components/review-editor'

export const dynamic = 'force-dynamic'

export default async function RoomReviewPage({
  params,
}: PageProps<'/inspections/[id]/rooms/[roomId]'>) {
  const { id, roomId } = await params

  const agent = await requireAgent()

  const room = await db.room.findFirst({
    where: { id: roomId, inspection: inspectionScope(agent.id) },
    include: {
      items: { orderBy: { createdAt: 'asc' } },
      captures: { orderBy: { createdAt: 'asc' } },
    },
  })

  if (!room || room.inspectionId !== id) notFound()

  const captures: EvidenceCapture[] = await Promise.all(
    room.captures.map(async (capture) => ({
      id: capture.id,
      kind: capture.kind,
      url: await createDownloadUrl(capture.storagePath),
    })),
  )

  return (
    <div className="space-y-6">
      <Link href={`/inspections/${id}`} className="text-sm text-gray-500 hover:underline">
        ← All rooms
      </Link>

      <ReviewEditor
        inspectionId={id}
        roomId={room.id}
        roomName={room.name}
        items={room.items}
        captures={captures}
        alreadyReviewed={room.status === 'REVIEWED'}
      />
    </div>
  )
}
