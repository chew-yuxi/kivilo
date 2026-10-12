import { z } from 'zod'
import { db } from '@/lib/db'
import { authorizeInspection } from '@/lib/auth'
import { createDownloadUrl } from '@/lib/storage'
import { toAnnotations } from '@/lib/annotations'
import { authed } from '@/lib/api/route'
import { deleteRoom, renameRoom } from '@/lib/actions'

export const dynamic = 'force-dynamic'

/// Everything the capture screen needs for one room, in one round trip: where the room
/// sits in the walk, what is next, and the captures already on the server with a signed
/// URL each. The mobile review and agreement screens also read this route after capture
/// closes, so all inspection states are readable. Mutations remain guarded by actions.
export const GET = authed(async (agent, { id, roomId }: { id: string; roomId: string }) => {
  await authorizeInspection(id, agent.id)
  const rooms = await db.room.findMany({
    where: { inspectionId: id },
    orderBy: { order: 'asc' },
    select: { id: true, name: true, status: true, processingError: true },
  })

  const index = rooms.findIndex((room) => room.id === roomId)
  // Same wording as every other refusal, so a room on someone else's deal and a room
  // that does not exist are one answer.
  if (index === -1) throw new Error('Room not found')

  const stored = await db.capture.findMany({ where: { roomId }, orderBy: { createdAt: 'asc' } })
  const items = await db.inspectionItem.findMany({
    where: { roomId },
    orderBy: { createdAt: 'asc' },
    include: { evidence: { select: { captureId: true } } },
  })

  return {
    room: rooms[index],
    position: { index: index + 1, total: rooms.length },
    next: rooms[index + 1] ? { id: rooms[index + 1].id, name: rooms[index + 1].name } : null,
    items: items.map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      condition: item.condition,
      quantity: item.quantity,
      notes: item.notes,
      identifier: item.identifier,
      meterReading: item.meterReading,
      sourceCaptureId: item.sourceCaptureId,
      sourceTimestampSec: item.sourceTimestampSec,
      evidenceCaptureIds: item.evidence.map((link) => link.captureId),
      confidence: item.confidence,
      editedByHuman: item.editedByHuman,
    })),
    captures: await Promise.all(
      stored.map(async (capture) => ({
        id: capture.id,
        clientId: capture.clientId,
        kind: capture.kind,
        note: capture.note,
        durationSec: capture.durationSec,
        createdAt: capture.createdAt.toISOString(),
        url: await createDownloadUrl(capture.storagePath),
        annotations: toAnnotations(capture.annotations),
        processed: capture.processedAt !== null,
      })),
    ),
  }
})

const nameChange = z.object({ name: z.string().trim().min(1).max(80) }).strict()

export const PATCH = authed(
  async (_agent, { id, roomId }: { id: string; roomId: string }, request) => {
    await renameRoom(roomId, id, nameChange.parse(await request.json()).name)
    return { ok: true }
  },
)

export const DELETE = authed(async (_agent, { id, roomId }: { id: string; roomId: string }) => {
  await deleteRoom(roomId, id)
  return { ok: true }
})
