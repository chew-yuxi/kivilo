'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'
import { useUploadQueue } from '@/components/upload-queue'
import { ProcessingPoller } from '@/components/processing-poller'
import { patch, take, type PendingCapture } from '@/lib/offline-queue'
import { MarkOverlay } from '@/components/mark-overlay'
import { MarkEditor, type Tool } from '@/components/mark-editor'
import { MAX_MARKS, type AnnotationInput, type Mark, type StoredAnnotations } from '@/lib/annotations'
import {
  renameRoom,
  deleteRoom,
  deleteCapture,
  updateCaptureNote,
  annotateCapture,
  finishRoomCapture,
} from '@/lib/actions'
import type { CaptureKind, RoomStatus } from '@/generated/prisma'

export type ServerCapture = {
  id: string
  kind: CaptureKind
  note: string | null
  durationSec: number | null
  url: string
  annotations: StoredAnnotations | null
  /// False once a capture arrived after the room's last read: new against the draft.
  processed: boolean
}

/// One thing on the screen, whether it is still on the phone or already on the server.
/// `marks` is the same shape either way, since the phone stores what it would send.
type Tile = {
  key: string
  kind: CaptureKind
  note: string | null
  marks: AnnotationInput | null
} & (
  | { source: 'server'; capture: ServerCapture }
  | { source: 'queue'; capture: PendingCapture }
)

/// Longest edge a photo is sent at. A phone camera frame is 4 to 6 MB; at this size it
/// is a fifth of that and a rating plate is still legible, which is all the model needs.
const MAX_PHOTO_EDGE = 2048

/// Resolves to null when the photo is already small enough, or when the browser cannot
/// decode it, in which case the original goes up as it is rather than being lost.
async function downscale(file: File): Promise<Blob | null> {
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    try {
      await image.decode()
    } catch {
      return null
    }
    const scale = Math.min(1, MAX_PHOTO_EDGE / Math.max(image.naturalWidth, image.naturalHeight))
    if (scale === 1) return null
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(image.naturalWidth * scale)
    canvas.height = Math.round(image.naturalHeight * scale)
    canvas.getContext('2d')!.drawImage(image, 0, 0, canvas.width, canvas.height)
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Could not encode the photo'))),
        'image/jpeg',
        0.85,
      ),
    )
  } finally {
    URL.revokeObjectURL(url)
  }
}

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

/// Full size is h-full w-full, not max-h-full max-w-full. With max-*, an image smaller
/// than its container is not scaled up, so the element shrinks to the picture while the
/// overlay still spans the container, and the two disagree by as much as 148px. Filling
/// the box and letting object-contain letterbox inside it is the same arithmetic
/// preserveAspectRatio="xMidYMid meet" does, so picture and marks coincide at any size.
/// Verified by pixel probe across phone, portrait and desktop-sized boxes.
const mediaClass = (full: boolean) =>
  full ? 'h-full w-full object-contain' : 'h-full w-full object-cover'

/// The fragment asks for a frame just after the start, which is what makes a video
/// thumbnail show a picture instead of black on iOS.
const mediaSrc = (kind: CaptureKind, url: string, full: boolean) =>
  kind === 'VIDEO' && !full ? `${url}#t=0.1` : url

function Media({
  kind,
  url,
  full = false,
  onReady,
}: {
  kind: CaptureKind
  url: string
  full?: boolean
  /// The upright intrinsic size, once the browser has it. Marks are stored against
  /// this, so nothing is ever re-measured on the server.
  onReady?: (w: number, h: number) => void
}) {
  if (kind === 'VIDEO') {
    return (
      <video
        src={mediaSrc(kind, url, full)}
        controls={full}
        muted={!full}
        playsInline
        preload="metadata"
        className={mediaClass(full)}
      />
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      onLoad={(e) => onReady?.(e.currentTarget.naturalWidth, e.currentTarget.naturalHeight)}
      className={mediaClass(full)}
    />
  )
}

/// A capture still on the phone is shown from its blob. The object URL is owned by the
/// effect, created and assigned there and revoked on cleanup, so a remount (StrictMode
/// in development does one on purpose) gets a fresh URL instead of a revoked one, and
/// nothing keeps a 12 MB video alive after the tile is gone.
function QueuedMedia({
  capture,
  full = false,
  onReady,
}: {
  capture: PendingCapture
  full?: boolean
  onReady?: (w: number, h: number) => void
}) {
  const element = useRef<HTMLImageElement & HTMLVideoElement>(null)
  // Keyed on the record, not the Blob: every queue read structured-clones a fresh
  // Blob, and the bytes behind a queue id never change.
  const { id, blob, kind } = capture
  useEffect(() => {
    const url = URL.createObjectURL(blob)
    element.current!.src = mediaSrc(kind, url, full)
    return () => URL.revokeObjectURL(url)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, kind, full])

  if (capture.kind === 'VIDEO') {
    return (
      <video
        ref={element}
        controls={full}
        muted={!full}
        playsInline
        preload="metadata"
        className={mediaClass(full)}
      />
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={element}
      alt=""
      // src is assigned in the effect, so onLoad is the only way the parent learns the
      // intrinsic size of a capture that is still on the phone.
      onLoad={(e) => onReady?.(e.currentTarget.naturalWidth, e.currentTarget.naturalHeight)}
      className={mediaClass(full)}
    />
  )
}

function tileState(tile: Tile, online: boolean, drafted: boolean): string | null {
  if (tile.source === 'queue') {
    if (!online) return 'On this phone'
    return tile.capture.attempts === 0 ? 'Uploading' : `Retrying (${tile.capture.attempts})`
  }
  if (drafted && !tile.capture.processed) return 'New'
  if (tile.kind === 'VIDEO' && tile.capture.durationSec) return `${tile.capture.durationSec}s`
  return null
}

/// Full screen look at one capture: its note, a two-step delete, and the surface the
/// inspector marks it up on. A <dialog>, so Escape and the Android back gesture close it
/// rather than leaving the room, and so annotate mode is one boolean rather than a
/// second route with its own history entry.
function Viewer({
  tile,
  inspectionId,
  startAnnotating = false,
  onClose,
}: {
  tile: Tile
  inspectionId: string
  startAnnotating?: boolean
  onClose: () => void
}) {
  const router = useRouter()
  const dialog = useRef<HTMLDialogElement>(null)
  const { flush, online, uploadedIdFor } = useUploadQueue()
  const [note, setNote] = useState(tile.note ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Marks are only meaningful once the browser has decoded the image, because their
  // coordinate space is its intrinsic size.
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null)
  const [annotating, setAnnotating] = useState(startAnnotating)
  const [tool, setTool] = useState<Tool>('ring')
  const saved = tile.marks?.marks ?? []
  const [marks, setMarks] = useState<Mark[]>(saved)
  // How far back Undo may reach. It starts at what was already saved, and drops to zero
  // when the inspector clears the set, so Undo still works on what they draw next.
  const [floor, setFloor] = useState(saved.length)
  const [dirty, setDirty] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  useEffect(() => {
    dialog.current?.showModal()
  }, [])

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await action()
      router.refresh()
      dialog.current?.close()
    } catch (e) {
      // Left open, with the marks still on screen. On the connections this product is
      // built for, a save that quietly failed is the inspector circling four defects,
      // walking out, and none of them existing.
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const saveNote = () =>
    run(async () => {
      const trimmed = note.trim() || null
      if (tile.source === 'server') {
        await updateCaptureNote(tile.capture.id, inspectionId, trimmed)
        return
      }
      // The capture may have finished uploading while this was open. Then the note
      // belongs on the server row it became.
      const id = tile.capture.id!
      if (await patch(id, { note: trimmed })) return
      const serverId = uploadedIdFor(id)
      if (!serverId) throw new Error('This capture is no longer on the phone')
      await updateCaptureNote(serverId, inspectionId, trimmed)
    })

  /// One write per marking session, not one per stroke, so a half-drawn set is never
  /// what got persisted. Same three branches as the note, in the same order.
  const saveMarks = () =>
    run(async () => {
      const input: AnnotationInput | null =
        marks.length > 0 && natural ? { w: natural.w, h: natural.h, marks } : null
      if (tile.source === 'server') {
        await annotateCapture(tile.capture.id, inspectionId, input)
        return
      }
      const id = tile.capture.id!
      if (await patch(id, { annotations: input })) return
      const serverId = uploadedIdFor(id)
      if (!serverId) throw new Error('This capture is no longer on the phone')
      await annotateCapture(serverId, inspectionId, input)
    })

  const destroy = () =>
    run(async () => {
      if (tile.source === 'server') {
        await deleteCapture(tile.capture.id, inspectionId)
        return
      }
      const id = tile.capture.id!
      if (await take(id)) return
      const serverId = uploadedIdFor(id)
      if (serverId) await deleteCapture(serverId, inspectionId)
    })

  const addMark = (mark: Mark) => {
    // The server accepts no more than this, and a queued capture carrying too many
    // would fail validation on every upload attempt and never leave the phone.
    setMarks((current) => (current.length >= MAX_MARKS ? current : [...current, mark]))
    setDirty(true)
  }

  const clearMarks = () => {
    setMarks([])
    setFloor(0)
    setDirty(true)
  }

  const leaveAnnotating = () => {
    setMarks(saved)
    setFloor(saved.length)
    setDirty(false)
    setConfirmDiscard(false)
    setAnnotating(false)
  }

  const tryClose = () => {
    if (annotating && dirty) {
      setConfirmDiscard(true)
      return
    }
    dialog.current?.close()
  }

  const noun = tile.kind === 'VIDEO' ? 'video' : 'photo'
  const failed = tile.source === 'queue' && tile.capture.attempts > 0
  const canMark = tile.kind === 'PHOTO' && natural !== null
  // Undo only reaches back into this session. Clearing marks that were already saved is
  // Remove marks, which shows the result before an explicit save confirms it.
  const canUndo = marks.length > floor

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onCancel={(event) => {
        // Escape and the Android back gesture. Unsaved marks get one interception, then
        // a second press closes and loses them, exactly as it loses an untyped note.
        if (annotating && dirty && !confirmDiscard) {
          event.preventDefault()
          setConfirmDiscard(true)
        }
      }}
      className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none bg-black p-0 text-white backdrop:bg-black"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between px-4 py-2">
          <span className="text-sm text-gray-300">
            {annotating ? (tool === 'ring' ? 'Drag a ring, or tap to point' : 'Drag from the spot') : <span className="capitalize">{noun}</span>}
          </span>
          <button
            type="button"
            onClick={tryClose}
            className="rounded-md px-3 py-2 text-sm font-medium active:bg-white/10"
          >
            Close
          </button>
        </div>

        {/* relative on the flex container, not on a wrapper around the image: a wrapper
            would give the image an auto-height containing block, max-h-full would
            resolve to none, and a portrait photo would overflow the note and buttons.
            Flex centres the contained image in both axes and xMidYMid centres the
            viewBox in both axes, so the two boxes coincide exactly. */}
        <div className="relative flex min-h-0 flex-1 items-center justify-center">
          {tile.source === 'queue' ? (
            <QueuedMedia capture={tile.capture} full onReady={(w, h) => setNatural({ w, h })} />
          ) : (
            <Media
              kind={tile.kind}
              url={tile.capture.url}
              full
              onReady={(w, h) => setNatural({ w, h })}
            />
          )}
          {annotating && natural ? (
            <MarkEditor
              w={natural.w}
              h={natural.h}
              marks={marks}
              tool={tool}
              onAdd={addMark}
            />
          ) : (
            <MarkOverlay annotations={tile.marks} />
          )}
        </div>

        <div className="space-y-3 bg-gray-900 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
          {failed && !annotating && (
            <p className="text-xs text-amber-300">
              Upload failed {tile.capture.attempts} time{tile.capture.attempts === 1 ? '' : 's'}
              {tile.capture.lastError && `: ${tile.capture.lastError}`}. It stays on this phone
              and is retried.{' '}
              <button type="button" onClick={flush} className="font-medium underline">
                Try again now
              </button>
            </p>
          )}

          {error && <p className="text-sm text-red-300">{error}</p>}

          {annotating ? (
            <>
              {!online && tile.source === 'server' && (
                <p className="text-xs text-amber-300">
                  Needs signal to save marks on a photo that has already uploaded.
                </p>
              )}
              {confirmDiscard ? (
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span>Discard these marks?</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={leaveAnnotating}
                      className="rounded-md bg-red-600 px-3 py-2 font-medium"
                    >
                      Discard
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDiscard(false)}
                      className="rounded-md px-3 py-2"
                    >
                      Keep drawing
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <div className="flex overflow-hidden rounded-md border border-gray-700">
                      {(['ring', 'arrow'] as const).map((option) => (
                        <button
                          key={option}
                          type="button"
                          aria-pressed={tool === option}
                          onClick={() => setTool(option)}
                          className={`px-4 py-3 text-sm font-medium capitalize ${
                            tool === option ? 'bg-white text-gray-900' : 'text-gray-200'
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      disabled={!canUndo}
                      onClick={() => setMarks((current) => current.slice(0, -1))}
                      className="rounded-md px-4 py-3 text-sm text-gray-200 active:bg-white/10 disabled:opacity-40"
                    >
                      Undo
                    </button>
                    {marks.length > 0 && (
                      <button
                        type="button"
                        onClick={clearMarks}
                        className="rounded-md px-4 py-3 text-sm text-gray-200 active:bg-white/10"
                      >
                        Remove marks
                      </button>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => (dirty ? setConfirmDiscard(true) : setAnnotating(false))}
                      className="rounded-md px-4 py-3 text-sm text-gray-300 active:bg-white/10"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={busy || !dirty}
                      onClick={saveMarks}
                      data-marks={marks.length}
                      className="rounded-md bg-brand-500 px-4 py-3 text-sm font-medium disabled:opacity-50"
                    >
                      Save marks
                    </button>
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              <textarea
                aria-label="Note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="What is this? e.g. Chip on the worktop, right of the sink"
                className="w-full resize-none rounded-md bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none"
              />
              <div className="flex items-center justify-between gap-3">
                {confirmDelete ? (
                  <div className="flex items-center gap-2 text-sm">
                    <span>Delete this {noun}?</span>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={destroy}
                      className="rounded-md bg-red-600 px-3 py-2 font-medium disabled:opacity-50"
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="rounded-md px-3 py-2"
                    >
                      Keep
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="rounded-md px-3 py-2 text-sm text-gray-300 active:bg-white/10"
                  >
                    Delete
                  </button>
                )}
                <div className="flex items-center gap-2">
                  {tile.kind === 'PHOTO' && (
                    <button
                      type="button"
                      disabled={!canMark}
                      onClick={() => setAnnotating(true)}
                      className="rounded-md border border-gray-600 px-4 py-2 text-sm font-medium text-white active:bg-white/10 disabled:opacity-40"
                    >
                      {saved.length > 0 ? 'Edit marks' : 'Mark up'}
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={saveNote}
                    className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium disabled:opacity-50"
                  >
                    Save note
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </dialog>
  )
}

export function RoomCaptureScreen({
  inspectionId,
  room,
  captures,
  position,
  next,
}: {
  inspectionId: string
  room: { id: string; name: string; status: RoomStatus; processingError: string | null }
  captures: ServerCapture[]
  position: { index: number; total: number }
  next: { href: string; name: string } | null
}) {
  const router = useRouter()
  const { pending, online, add, uploadedIdFor } = useUploadQueue()
  const photoInput = useRef<HTMLInputElement>(null)
  const videoInput = useRef<HTMLInputElement>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewing, setViewing] = useState<{ tile: Tile; annotate: boolean } | null>(null)
  // The queue id of the shot just taken, so the one photo the inspector is still
  // thinking about is one tap from being marked up.
  const [justShot, setJustShot] = useState<number | null>(null)
  const [finishing, startFinish] = useTransition()
  const [busy, startTransition] = useTransition()

  const queued = pending.filter((c) => c.roomId === room.id)
  const drafted = room.status === 'REVIEW' || room.status === 'REVIEWED'
  const processing = room.status === 'PROCESSING'
  const newSinceDraft = captures.filter((c) => !c.processed).length

  const tiles: Tile[] = [
    ...captures.map((c) => ({
      source: 'server' as const,
      key: c.id,
      kind: c.kind,
      note: c.note,
      marks: c.annotations,
      capture: c,
    })),
    ...queued.map((c) => ({
      source: 'queue' as const,
      key: `queue-${c.id}`,
      kind: c.kind,
      note: c.note,
      marks: c.annotations,
      capture: c,
    })),
  ]

  // Still on the phone, or already uploaded and now a server tile. Either way it is the
  // same photograph, so the row follows it across the hand-over instead of vanishing.
  const lastShot =
    justShot === null
      ? null
      : (tiles.find((tile) => tile.source === 'queue' && tile.capture.id === justShot) ??
        tiles.find(
          (tile) => tile.source === 'server' && tile.capture.id === uploadedIdFor(justShot),
        ) ??
        null)

  const inspectionHref = `/inspections/${inspectionId}`
  const reviewHref = `${inspectionHref}/rooms/${room.id}`

  async function capture(file: File, kind: CaptureKind) {
    setSaving(true)
    setError(null)
    try {
      const shrunk = kind === 'PHOTO' ? await downscale(file) : null
      const id = await add({
        roomId: room.id,
        inspectionId,
        kind,
        blob: shrunk ?? file,
        filename: shrunk ? 'photo.jpg' : file.name || (kind === 'VIDEO' ? 'walkthrough.mp4' : 'photo.jpg'),
        mimeType: shrunk ? 'image/jpeg' : file.type || (kind === 'VIDEO' ? 'video/mp4' : 'image/jpeg'),
        durationSec: kind === 'VIDEO' ? await readDuration(file) : null,
        note: null,
        annotations: null,
        createdAt: Date.now(),
      })
      // Video is not markable, so it never offers the row.
      setJustShot(kind === 'PHOTO' ? id : null)
    } catch (e) {
      // The one place a capture can actually be lost: the phone refused to store it.
      setError(
        `Could not save this ${kind === 'VIDEO' ? 'video' : 'photo'} on the phone: ${
          e instanceof Error ? e.message : String(e)
        }. Free up some storage and take it again.`,
      )
    } finally {
      setSaving(false)
    }
  }

  const finish = () =>
    startFinish(async () => {
      setError(null)
      try {
        await finishRoomCapture(room.id, inspectionId)
      } catch (e) {
        setError(`Could not hand ${room.name} over: ${e instanceof Error ? e.message : String(e)}`)
        return
      }
      router.push(next?.href ?? inspectionHref)
    })

  const canFinish = online && queued.length === 0 && captures.length > 0 && !finishing
  const doneLabel =
    queued.length > 0
      ? online
        ? `Waiting for ${queued.length} upload${queued.length === 1 ? '' : 's'}`
        : `${queued.length} saved on this phone, waiting for signal`
      : !online
        ? 'Waiting for signal'
        : drafted
          ? `Re-read ${room.name}`
          : `Done with ${room.name}`

  const statusLine = () => {
    switch (room.status) {
      case 'PENDING':
        return 'Nothing captured yet.'
      case 'CAPTURING':
        return `${tiles.length} capture${tiles.length === 1 ? '' : 's'}.`
      case 'PROCESSING':
        return `Drafting the inventory from ${captures.length} capture${captures.length === 1 ? '' : 's'}. A minute or two.`
      case 'FAILED':
        return `Drafting failed: ${room.processingError}. Done tries again.`
      default:
        return newSinceDraft > 0
          ? `Draft ready. ${newSinceDraft} new since the draft; re-read to include ${newSinceDraft === 1 ? 'it' : 'them'}. Your edits are kept.`
          : 'Draft ready.'
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between text-sm">
        <Link href={inspectionHref} className="text-gray-600 hover:underline">
          ← All rooms
        </Link>
        <span className="text-gray-600">
          {position.index} of {position.total}
        </span>
      </div>

      <div className={busy ? 'opacity-60' : ''}>
        <input
          defaultValue={room.name}
          aria-label="Room name"
          onBlur={(e) =>
            e.target.value !== room.name &&
            e.target.value.trim() &&
            startTransition(() => void renameRoom(room.id, inspectionId, e.target.value.trim()))
          }
          className="w-full rounded border border-transparent px-1 py-0.5 text-2xl font-semibold tracking-tight focus:border-brand-500 focus:outline-none"
        />
        <p className="mt-1 px-1 text-sm text-gray-600">
          {statusLine()}
          {drafted && (
            <>
              {' '}
              <Link href={reviewHref} className="font-medium text-brand-600 hover:underline">
                Open the draft
              </Link>
            </>
          )}
        </p>
      </div>

      {processing && <ProcessingPoller />}

      {!processing && (
        <div className="space-y-3">
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
          <button
            type="button"
            disabled={saving}
            onClick={() => photoInput.current?.click()}
            className="w-full rounded-lg bg-brand-500 px-4 py-4 text-base font-semibold text-white active:bg-brand-600 disabled:opacity-50"
          >
            {saving ? 'Saving' : 'Take a photo'}
          </button>
          {lastShot ? (
            <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-2">
              <div className="relative size-16 shrink-0 overflow-hidden rounded-md bg-gray-100">
                {lastShot.source === 'queue' ? (
                  <QueuedMedia capture={lastShot.capture} />
                ) : (
                  <Media kind={lastShot.kind} url={lastShot.capture.url} />
                )}
              </div>
              <p className="min-w-0 flex-1 text-sm text-gray-600">
                {lastShot.marks ? 'Marked' : 'Circle the damage'}
              </p>
              <button
                type="button"
                onClick={() => setViewing({ tile: lastShot, annotate: true })}
                className="shrink-0 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium active:bg-gray-100"
              >
                Mark it up ›
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-600">
              Each corner, every appliance and fixture, rating plates and meters up close, any
              damage.
            </p>
          )}
          <button
            type="button"
            disabled={saving}
            onClick={() => videoInput.current?.click()}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium active:bg-gray-100 disabled:opacity-50"
          >
            Record a walkthrough
          </button>
          <p className="text-sm text-gray-600">Walk the room once, saying what you see.</p>
          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        </div>
      )}

      {tiles.length > 0 && (
        <ul className="grid grid-cols-3 gap-2">
          {tiles.map((tile, index) => {
            const state = tileState(tile, online, drafted)
            const noun = tile.kind === 'VIDEO' ? 'Video' : 'Photo'
            return (
              <li key={tile.key}>
                <button
                  type="button"
                  onClick={() => setViewing({ tile, annotate: false })}
                  aria-label={`${noun} ${index + 1}${tile.note ? `: ${tile.note}` : ''}${
                    tile.marks ? ', marked' : ''
                  }`}
                  className="block w-full text-left"
                >
                  <div className="relative aspect-square overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                    {tile.source === 'queue' ? (
                      <QueuedMedia capture={tile.capture} />
                    ) : (
                      <Media kind={tile.kind} url={tile.capture.url} />
                    )}
                    {state && (
                      <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[11px] font-medium text-white">
                        {state}
                      </span>
                    )}
                    {tile.marks && (
                      <span className="absolute bottom-1 right-1 rounded bg-red-600 px-1.5 py-0.5 text-[11px] font-medium text-white">
                        Marked
                      </span>
                    )}
                  </div>
                  <p className="mt-1 truncate text-xs text-gray-600">{tile.note ?? noun}</p>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {tiles.length === 0 && !processing && !drafted && (
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            startTransition(async () => {
              await deleteRoom(room.id, inspectionId)
              router.push(inspectionHref)
            })
          }
          className="px-1 text-sm text-gray-600 hover:text-red-600"
        >
          Remove this room
        </button>
      )}

      <div className="sticky bottom-0 -mx-4 border-t border-gray-200 bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:mx-0 sm:rounded-lg sm:border">
        <div className="flex items-center gap-3">
          {processing ? (
            <p className="flex-1 text-sm text-gray-600">Drafting {room.name}</p>
          ) : drafted && newSinceDraft === 0 && queued.length === 0 ? (
            <Link
              href={reviewHref}
              className="flex-1 rounded-md bg-gray-900 px-4 py-3 text-center text-sm font-medium text-white active:bg-gray-800"
            >
              Review {room.name}
            </Link>
          ) : (
            <button
              type="button"
              disabled={!canFinish}
              onClick={finish}
              className="flex-1 rounded-md bg-gray-900 px-4 py-3 text-sm font-medium text-white active:bg-gray-800 disabled:opacity-50"
            >
              {doneLabel}
            </button>
          )}
          {next && (
            <Link
              href={next.href}
              className="shrink-0 rounded-md border border-gray-300 bg-white px-4 py-3 text-sm font-medium active:bg-gray-100"
            >
              Next room ›
            </Link>
          )}
        </div>
      </div>

      {viewing && (
        <Viewer
          key={viewing.tile.key}
          tile={viewing.tile}
          inspectionId={inspectionId}
          startAnnotating={viewing.annotate}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  )
}
