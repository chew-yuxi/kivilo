import type { RoomStatus } from '@/generated/prisma'

/// A room's own screen: capture until the inspector finishes it, review after.
export function roomHref(inspectionId: string, room: { id: string; status: RoomStatus }) {
  const base = `/inspections/${inspectionId}/rooms/${room.id}`
  return room.status === 'REVIEW' || room.status === 'REVIEWED' ? base : `${base}/capture`
}
