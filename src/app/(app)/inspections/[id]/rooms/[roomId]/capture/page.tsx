import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { requireAgent, inspectionScope } from '@/lib/auth'
import { createDownloadUrl } from '@/lib/storage'
import { roomHref } from '@/lib/routes'
import { RoomCaptureScreen, type ServerCapture } from '@/components/room-capture-screen'

export const dynamic = 'force-dynamic'

/// One room of the walk. Every room of the inspection is loaded so the screen knows
/// where it sits in the walk and which room comes next.
export default async function RoomCapturePage({
  params,
}: PageProps<'/inspections/[id]/rooms/[roomId]/capture'>) {
  const { id, roomId } = await params

  const agent = await requireAgent()

  // A signed or completed inspection is closed to new captures, and a room in it is
  // not found here, the same as a room on someone else's deal.
  const rooms = await db.room.findMany({
    where: {
      inspectionId: id,
      inspection: {
        AND: [
          inspectionScope(agent.id),
          { status: { in: ['DRAFT', 'CAPTURING', 'PROCESSING', 'REVIEW', 'FAILED'] } },
        ],
      },
    },
    orderBy: { order: 'asc' },
    select: { id: true, name: true, status: true, processingError: true },
  })

  const index = rooms.findIndex((room) => room.id === roomId)
  if (index === -1) notFound()
  const room = rooms[index]
  const next = rooms[index + 1]

  const stored = await db.capture.findMany({
    where: { roomId },
    orderBy: { createdAt: 'asc' },
  })
  const captures: ServerCapture[] = await Promise.all(
    stored.map(async (capture) => ({
      id: capture.id,
      kind: capture.kind,
      note: capture.note,
      durationSec: capture.durationSec,
      url: await createDownloadUrl(capture.storagePath),
      processed: capture.processedAt !== null,
    })),
  )

  return (
    <RoomCaptureScreen
      inspectionId={id}
      room={room}
      captures={captures}
      position={{ index: index + 1, total: rooms.length }}
      next={next ? { href: roomHref(id, next), name: next.name } : null}
    />
  )
}
