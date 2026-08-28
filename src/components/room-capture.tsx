'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useUploadQueue } from '@/components/upload-queue'
import { addRoom } from '@/lib/actions'
import { roomHref } from '@/lib/routes'
import type { RoomStatus } from '@/generated/prisma'

export type RoomRow = {
  id: string
  name: string
  status: RoomStatus
  processingError: string | null
  itemCount: number
  videos: number
  photos: number
  /// Captures added after the room was last read. Only meaningful once it has a draft.
  newSinceDraft: number
}

export const ROOM_STATUS: Record<RoomStatus, { text: string; className: string }> = {
  PENDING: { text: 'Not started', className: 'bg-gray-100 text-gray-600' },
  CAPTURING: { text: 'Capturing', className: 'bg-blue-50 text-blue-700' },
  PROCESSING: { text: 'Drafting', className: 'bg-blue-50 text-blue-700' },
  REVIEW: { text: 'Needs review', className: 'bg-amber-50 text-amber-800' },
  REVIEWED: { text: 'Reviewed', className: 'bg-emerald-50 text-emerald-700' },
  FAILED: { text: 'Failed', className: 'bg-red-50 text-red-700' },
}

/// Common Singapore residential rooms, offered as one-tap adds so the inspector is
/// naming rooms rather than typing them while holding a phone.
const SUGGESTED = [
  'Living room',
  'Kitchen',
  'Master bedroom',
  'Bedroom 2',
  'Bedroom 3',
  'Master bathroom',
  'Common bathroom',
  'Balcony',
  'Utility / yard',
  'Entrance',
]

function RoomListRow({
  room,
  inspectionId,
  queued,
}: {
  room: RoomRow
  inspectionId: string
  queued: number
}) {
  const badge = ROOM_STATUS[room.status]
  const counts = [
    room.videos > 0 && `${room.videos} video${room.videos === 1 ? '' : 's'}`,
    room.photos > 0 && `${room.photos} photo${room.photos === 1 ? '' : 's'}`,
    queued > 0 && `${queued} still on this phone`,
  ].filter(Boolean)

  return (
    <li>
      <Link
        href={roomHref(inspectionId, room)}
        className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 active:bg-gray-100"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{room.name}</p>
          <p className="mt-0.5 text-xs text-gray-600">
            {counts.length > 0 ? counts.join(', ') : 'Nothing captured yet'}
            {room.itemCount > 0 && ` · ${room.itemCount} items`}
            {room.newSinceDraft > 0 && ` · ${room.newSinceDraft} new since the draft`}
          </p>
          {room.processingError && (
            <p className="mt-1 font-mono text-xs text-red-600">{room.processingError}</p>
          )}
        </div>
        <span
          className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}
        >
          {badge.text}
        </span>
        <span aria-hidden className="text-gray-400">
          ›
        </span>
      </Link>
    </li>
  )
}

export function RoomCapture({
  inspectionId,
  rooms,
}: {
  inspectionId: string
  rooms: RoomRow[]
}) {
  const { pending } = useUploadQueue()
  const [customName, setCustomName] = useState('')
  const [busy, startTransition] = useTransition()

  const used = new Set(rooms.map((r) => r.name))
  const suggestions = SUGGESTED.filter((name) => !used.has(name))
  const queuedFor = (roomId: string) => pending.filter((c) => c.roomId === roomId).length
  // The walk is linear: the next room that still needs the inspector is the one to open.
  const upNext = rooms.find((room) => room.status !== 'REVIEWED')

  return (
    <div className="space-y-6">
      {upNext && (
        <Link
          href={roomHref(inspectionId, upNext)}
          className="block w-full rounded-lg bg-brand-500 px-4 py-3.5 text-center text-base font-semibold text-white active:bg-brand-600"
        >
          {upNext.status === 'PENDING' ? 'Start' : 'Continue'} with {upNext.name}
        </Link>
      )}

      {rooms.length > 0 && (
        <ul className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200 bg-white">
          {rooms.map((room) => (
            <RoomListRow
              key={room.id}
              room={room}
              inspectionId={inspectionId}
              queued={queuedFor(room.id)}
            />
          ))}
        </ul>
      )}

      <div className="rounded-lg border border-dashed border-gray-300 bg-white p-4">
        <h2 className="text-sm font-medium">Add a room</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {suggestions.map((name) => (
            <button
              key={name}
              type="button"
              disabled={busy}
              onClick={() => startTransition(() => void addRoom(inspectionId, name))}
              className="rounded-full border border-gray-300 px-3 py-1.5 text-sm active:border-brand-500 active:text-brand-600 disabled:opacity-50"
            >
              {name}
            </button>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <input
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="Or type a room name"
            className="min-w-0 flex-1 rounded border border-gray-200 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
          />
          <button
            type="button"
            disabled={busy || !customName.trim()}
            onClick={() =>
              startTransition(async () => {
                await addRoom(inspectionId, customName.trim())
                setCustomName('')
              })
            }
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm active:bg-gray-100 disabled:opacity-40"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  )
}
