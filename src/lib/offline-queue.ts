'use client'

/// Captures are recorded where the signal is worst: empty units, basements, lift
/// lobbies. A capture is written to IndexedDB the moment it is taken and only leaves
/// the queue once storage has confirmed it. Losing a walkthrough because the upload
/// died halfway is the failure that loses you the agent, so nothing is held in memory
/// and nothing is dropped on a failed attempt.

const DB_NAME = 'mobility-captures'
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
  createdAt: number
  attempts: number
  lastError: string | null
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

export async function enqueue(capture: Omit<PendingCapture, 'id' | 'attempts' | 'lastError'>) {
  await transact('readwrite', (store) => store.add({ ...capture, attempts: 0, lastError: null }))
  await refreshSnapshot()
}

export async function remove(id: number) {
  await transact('readwrite', (store) => store.delete(id))
  await refreshSnapshot()
}

export async function update(capture: PendingCapture) {
  await transact('readwrite', (store) => store.put(capture))
  await refreshSnapshot()
}
