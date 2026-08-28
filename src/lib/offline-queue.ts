'use client'

import type { AnnotationInput } from '@/lib/annotations'

/// Captures are recorded where the signal is worst: empty units, basements, lift
/// lobbies. A capture is written to IndexedDB the moment it is taken and only leaves
/// the queue once storage has confirmed it. Losing a walkthrough because the upload
/// died halfway is the failure that loses you the agent, so nothing is held in memory
/// and nothing is dropped on a failed attempt.

const DB_NAME = 'kivilo-captures'
const STORE = 'pending'
const VERSION = 1

export type PendingCapture = {
  id?: number
  roomId: string
  inspectionId: string
  kind: 'VIDEO' | 'PHOTO'
  blob: Blob
  filename: string
  mimeType: string
  durationSec: number | null
  note: string | null
  /// Marks drawn while the capture is still on the phone. Plain numbers, so IndexedDB
  /// structured-clones them with no serialization step.
  annotations: AnnotationInput | null
  createdAt: number
  attempts: number
  lastError: string | null
  /// Set the moment the server has the bytes. From then on the record is only a
  /// hand-over of the phone's copy (its note, or its deletion) and is never sent again.
  uploadedId?: string
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, VERSION)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(STORE)) {
        database.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function transact<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>) {
  return open().then(
    (database) =>
      new Promise<T>((resolve, reject) => {
        const tx = database.transaction(STORE, mode)
        const request = run(tx.objectStore(STORE))
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
        tx.oncomplete = () => database.close()
      }),
  )
}

export function listPending(): Promise<PendingCapture[]> {
  return transact<PendingCapture[]>('readonly', (store) => store.getAll())
}

// ---------------------------------------------------------------------------
// The queue is an external store, so React reads it through useSyncExternalStore
// rather than mirroring it into component state. Every mutation refreshes the
// snapshot and notifies, which keeps the on-screen count honest without any
// component having to remember to re-read.
// ---------------------------------------------------------------------------

const EMPTY: PendingCapture[] = []
let snapshot: PendingCapture[] = EMPTY
const listeners = new Set<() => void>()

async function refreshSnapshot() {
  snapshot = await listPending()
  for (const listener of listeners) listener()
}

export function subscribeToQueue(onChange: () => void) {
  listeners.add(onChange)
  if (listeners.size === 1) void refreshSnapshot()
  return () => {
    listeners.delete(onChange)
  }
}

/// Must return a stable reference between mutations, or React re-renders forever.
export function getQueueSnapshot() {
  return snapshot
}

/// There is no queue on the server.
export function getServerQueueSnapshot() {
  return EMPTY
}

/// Resolves to the key IndexedDB assigned, so the caller can point at the capture it
/// just took without re-reading the queue.
export async function enqueue(
  capture: Omit<PendingCapture, 'id' | 'attempts' | 'lastError' | 'uploadedId'>,
) {
  const key = await transact<IDBValidKey>('readwrite', (store) =>
    store.add({ ...capture, attempts: 0, lastError: null }),
  )
  await refreshSnapshot()
  return key as number
}

/// Read-then-write in one transaction, so a stale copy can never be put back over a
/// record the uploader has just removed. Resolves to the record as it was read, or null
/// if it was no longer there.
function withRecord(id: number, apply: (store: IDBObjectStore, record: PendingCapture) => void) {
  return open().then(
    (database) =>
      new Promise<PendingCapture | null>((resolve, reject) => {
        const tx = database.transaction(STORE, 'readwrite')
        const store = tx.objectStore(STORE)
        const request = store.get(id) as IDBRequest<PendingCapture | undefined>
        let record: PendingCapture | null = null
        request.onsuccess = () => {
          if (!request.result) return
          record = request.result
          apply(store, record)
        }
        tx.oncomplete = () => {
          database.close()
          resolve(record)
        }
        tx.onerror = () => reject(tx.error)
        tx.onabort = () => reject(tx.error)
      }),
  )
}

/// Changes a queued capture in place. The inspector's note goes on this way while the
/// capture is still on the phone; the uploader records a failed attempt, and then the
/// server id, this way. Resolves to whether the record was still queued.
export async function patch(
  id: number,
  changes: Partial<
    Pick<PendingCapture, 'note' | 'annotations' | 'attempts' | 'lastError' | 'uploadedId'>
  >,
) {
  const record = await withRecord(id, (store, current) => void store.put({ ...current, ...changes }))
  await refreshSnapshot()
  return record !== null
}

/// Removes a queued capture and resolves to the record as it was at that moment, or
/// null if it had already gone. The uploader hands over from that record, so a note
/// typed right up to the delete still reaches the server row; a null tells it the
/// inspector deleted the capture while it was in flight. The viewer uses null to
/// notice that a capture finished uploading meanwhile.
export async function take(id: number) {
  const record = await withRecord(id, (store) => void store.delete(id))
  await refreshSnapshot()
  return record
}
