'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, useTransition } from 'react'
import { useUploadQueue } from '@/components/upload-queue'
import {
  addRoom,
  renameRoom,
  deleteRoom,
  deleteCapture,
  finishRoomCapture,
  reprocessRoom,
} from '@/lib/actions'
import type { RoomStatus, CaptureKind } from '@/generated/prisma'

export type CaptureRow = {
  id: string
  kind: CaptureKind
  note: string | null
  durationSec: number | null
  sizeBytes: number
}

export type RoomRow = {
  id: string
  name: string
  status: RoomStatus
  processingError: string | null
  itemCount: number
  captures: CaptureRow[]
}

const ROOM_STATUS: Record<RoomStatus, { text: string; className: string }> = {
  PENDING: { text: 'Not started', className: 'bg-gray-100 text-gray-600' },
  CAPTURING: { text: 'Capturing', className: 'bg-blue-50 text-blue-700' },
  PROCESSING: { text: 'Reading', className: 'bg-blue-50 text-blue-700' },
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

function readDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src)
      resolve(Number.isFinite(video.duration) ? Math.round(video.duration) : null)
    }
    video.onerror = () => resolve(null)
    video.src = URL.createObjectURL(file)
  })
}

function RoomCard({
  room,
  inspectionId,
  onOpen,
}: {
  room: RoomRow
  inspectionId: string
  onOpen: () => void
}) {
  const [pending, startTransition] = useTransition()
  const badge = ROOM_STATUS[room.status]
  const photos = room.captures.filter((c) => c.kind === 'PHOTO').length
  const videos = room.captures.filter((c) => c.kind === 'VIDEO').length

  return (
    <div className={`rounded-lg border border-gray-200 bg-white p-4 ${pending ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <input
            defaultValue={room.name}
            onBlur={(e) =>
              e.target.value !== room.name &&
              e.target.value.trim() &&
              startTransition(() => void renameRoom(room.id, inspectionId, e.target.value.trim()))
            }
            className="w-full rounded border border-transparent px-1 py-0.5 text-sm font-medium hover:border-gray-200 focus:border-brand-500 focus:outline-none"
          />
          <p className="mt-1 px-1 text-xs text-gray-500">
            {videos > 0 || photos > 0
              ? [
                  videos > 0 && `${videos} video${videos === 1 ? '' : 's'}`,
                  photos > 0 && `${photos} photo${photos === 1 ? '' : 's'}`,
                ]
                  .filter(Boolean)
                  .join(', ')
              : 'Nothing captured yet'}
            {room.itemCount > 0 && ` · ${room.itemCount} items`}
          </p>
        </div>
        <span
          className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}
        >
          {badge.text}
        </span>
      </div>

      {room.processingError && (
        <p className="mt-2 font-mono text-xs text-red-600">{room.processingError}</p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {room.status === 'REVIEW' || room.status === 'REVIEWED' ? (
          <Link
            href={`/inspections/${inspectionId}/rooms/${room.id}`}
            className="rounded-md bg-brand-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-600"
          >
            {room.status === 'REVIEW' ? 'Review' : 'Open'}
          </Link>
        ) : (
          <button
            type="button"
            onClick={onOpen}
            className="rounded-md bg-brand-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-600"
          >
            {room.captures.length > 0 ? 'Capture more' : 'Start capture'}
          </button>
        )}

        {room.captures.length > 0 && (room.status === 'CAPTURING' || room.status === 'FAILED') && (
          <button
            type="button"
            onClick={() => startTransition(() => void finishRoomCapture(room.id, inspectionId))}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            Done with this room
          </button>
        )}

        {(room.status === 'REVIEW' || room.status === 'REVIEWED') && (
          <>
            <button
              type="button"
              onClick={onOpen}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              Capture more
            </button>
            <button
              type="button"
              onClick={() => startTransition(() => void reprocessRoom(room.id, inspectionId))}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
              title="Re-reads this room's captures. Other rooms are not affected."
            >
              Re-read
            </button>
          </>
        )}

        {room.captures.length === 0 && (
          <button
            type="button"
            onClick={() => startTransition(() => void deleteRoom(room.id, inspectionId))}
            className="ml-auto text-xs text-gray-400 hover:text-red-600"
          >
            Remove room
          </button>
        )}
      </div>
    </div>
  )
}

function CaptureSheet({
  room,
  inspectionId,
  onClose,
}: {
  room: RoomRow
  inspectionId: string
  onClose: () => void
}) {
  const { add } = useUploadQueue()
  const videoInput = useRef<HTMLInputElement>(null)
  const photoInput = useRef<HTMLInputElement>(null)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function capture(file: File, kind: CaptureKind) {
    setSaving(true)
    try {
      await add({
        roomId: room.id,
        inspectionId,
        kind,
        blob: file,
        filename: file.name || (kind === 'VIDEO' ? 'walkthrough.mp4' : 'photo.jpg'),
        mimeType: file.type || (kind === 'VIDEO' ? 'video/mp4' : 'image/jpeg'),
        durationSec: kind === 'VIDEO' ? await readDuration(file) : null,
        note: note.trim() || null,
        createdAt: Date.now(),
      })
      setNote('')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label={`Capture ${room.name}`}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:rounded-2xl"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base font-semibold">{room.name}</h2>
            <p className="mt-0.5 text-sm text-gray-500">
              Walk the room narrating what you see, then photograph anything with small
              print on it.
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-sm text-gray-400 hover:text-gray-700">
            Close
          </button>
        </div>

        <label className="mt-5 block text-xs font-medium text-gray-600">
          Note for the next capture (optional)
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="e.g. Chip on the worktop, right of the sink"
            className="mt-1 w-full resize-none rounded border border-gray-200 px-2.5 py-2 text-sm font-normal focus:border-brand-500 focus:outline-none"
          />
        </label>

        <input
          ref={videoInput}
          type="file"
          accept="video/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void capture(file, 'VIDEO')
            e.target.value = ''
          }}
        />
        <input
          ref={photoInput}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void capture(file, 'PHOTO')
            e.target.value = ''
          }}
        />

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={saving}
            onClick={() => videoInput.current?.click()}
            className="rounded-md bg-brand-500 px-4 py-3 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
          >
            Record walkthrough
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => photoInput.current?.click()}
            className="rounded-md border border-gray-300 px-4 py-3 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            Photograph a label
          </button>
        </div>

        <p className="mt-3 text-xs text-gray-500">
          Photograph rating plates, model and serial labels, and meter faces up close.
          Video is compressed too far to read small print reliably. The photo is what
          gets transcribed character-for-character.
        </p>

        {room.captures.length > 0 && (
          <ul className="mt-5 divide-y divide-gray-100 rounded-lg border border-gray-200">
            {room.captures.map((capture) => (
              <li key={capture.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                <span className="w-14 shrink-0 text-xs font-medium uppercase text-gray-500">
                  {capture.kind === 'VIDEO' ? 'Video' : 'Photo'}
                </span>
                <span className="min-w-0 flex-1 truncate text-gray-600">
                  {capture.note ?? (capture.durationSec ? `${capture.durationSec}s` : 'no note')}
                </span>
                <span className="shrink-0 text-xs text-gray-400">
                  {(capture.sizeBytes / 1_000_000).toFixed(1)} MB
                </span>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    startTransition(() => void deleteCapture(capture.id, inspectionId))
                  }
                  className="shrink-0 text-xs text-gray-400 hover:text-red-600"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        {room.captures.length > 0 && (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await finishRoomCapture(room.id, inspectionId)
                onClose()
              })
            }
            className="mt-5 w-full rounded-md bg-gray-900 px-4 py-3 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            Done with {room.name}
          </button>
        )}
      </div>
    </div>
  )
}

export function RoomCapture({
  inspectionId,
  rooms,
}: {
  inspectionId: string
  rooms: RoomRow[]
}) {
  const [openRoomId, setOpenRoomId] = useState<string | null>(null)
  const [customName, setCustomName] = useState('')
  const [pending, startTransition] = useTransition()

  const used = new Set(rooms.map((r) => r.name))
  const suggestions = SUGGESTED.filter((name) => !used.has(name))
  const openRoom = rooms.find((r) => r.id === openRoomId) ?? null

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        {rooms.map((room) => (
          <RoomCard
            key={room.id}
            room={room}
            inspectionId={inspectionId}
            onOpen={() => setOpenRoomId(room.id)}
          />
        ))}
      </div>

      <div className="rounded-lg border border-dashed border-gray-300 bg-white p-4">
        <h2 className="text-sm font-medium">Add a room</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {suggestions.map((name) => (
            <button
              key={name}
              type="button"
              disabled={pending}
              onClick={() => startTransition(() => void addRoom(inspectionId, name))}
              className="rounded-full border border-gray-300 px-3 py-1 text-sm hover:border-brand-500 hover:text-brand-600 disabled:opacity-50"
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
            disabled={pending || !customName.trim()}
            onClick={() =>
              startTransition(async () => {
                await addRoom(inspectionId, customName.trim())
                setCustomName('')
              })
            }
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-40"
          >
            Add
          </button>
        </div>
      </div>

      {openRoom && (
        <CaptureSheet
          room={openRoom}
          inspectionId={inspectionId}
          onClose={() => setOpenRoomId(null)}
        />
      )}
    </div>
  )
}
