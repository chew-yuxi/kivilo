import { db } from '@/lib/db'
import { inspectionScope } from '@/lib/auth'
import { createDownloadUrl } from '@/lib/storage'
import { toAnnotations } from '@/lib/annotations'
import { authed } from '@/lib/api/route'

export const dynamic = 'force-dynamic'

/// Everything the capture screen needs for one room, in one round trip: where the room
/// sits in the walk, what is next, and the captures already on the server with a signed
/// URL each. Mirrors the page at
/// src/app/(app)/inspections/[id]/rooms/[roomId]/capture/page.tsx, including its status
/// filter, so a signed or completed inspection has no room to capture into here either.
export const GET = authed(async (agent, { id, roomId }: { id: string; roomId: string }) => {
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
  // Same wording as every other refusal, so a room on someone else's deal and a room
  // that does not exist are one answer.
  if (index === -1) throw new Error('Room not found')

  const stored = await db.capture.findMany({ where: { roomId }, orderBy: { createdAt: 'asc' } })

  return {
    room: rooms[index],
    position: { index: index + 1, total: rooms.length },
    next: rooms[index + 1] ? { id: rooms[index + 1].id, name: rooms[index + 1].name } : null,
    captures: await Promise.all(
      stored.map(async (capture) => ({
        id: capture.id,
        kind: capture.kind,
        note: capture.note,
        durationSec: capture.durationSec,
        url: await createDownloadUrl(capture.storagePath),
        annotations: toAnnotations(capture.annotations),
        processed: capture.processedAt !== null,
      })),
    ),
  }
})
