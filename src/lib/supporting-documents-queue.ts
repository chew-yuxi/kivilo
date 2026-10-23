'use client'

// This store is separate from room evidence: a receipt never becomes a photograph
// in the condition report. Each copy stays with the account that selected it.
const DATABASE = 'kivilo-supporting-documents'
const STORE = 'pending'

export type PendingSupportingDocument = {
  clientId: string
  ownerId: string
  tenancyId: string
  requestId: string | null
  // Absent on older queued supporting files. Agreement uploads can be saved before
  // the shared agreement slot has been created on the server.
  kind?: 'AGREEMENT'
  fileName: string
  mimeType: string
  blob: Blob
  createdAt: number
  attempts: number
  lastError: string | null
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1)
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE, { keyPath: 'clientId' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function transact<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>) {
  const database = await open()
  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(STORE, mode)
    const request = run(transaction.objectStore(STORE))
    // A successful request is not yet a committed write. Keep the picked File in
    // the input until the transaction confirms the durable copy.
    transaction.oncomplete = () => {
      database.close()
      resolve(request.result)
    }
    transaction.onerror = transaction.onabort = () => {
      database.close()
      reject(transaction.error ?? request.error ?? new Error('Could not save this file on your device.'))
    }
  })
}

export function pendingSupportingDocuments() {
  return transact<PendingSupportingDocument[]>('readonly', (store) => store.getAll())
}

const EMPTY: PendingSupportingDocument[] = []
let snapshot = EMPTY
const listeners = new Set<() => void>()

export function subscribeToSupportingDocuments(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export function supportingDocumentsSnapshot() { return snapshot }
export function supportingDocumentsServerSnapshot() { return EMPTY }

export async function refreshSupportingDocuments() {
  snapshot = await pendingSupportingDocuments()
  for (const listener of listeners) listener()
}

export async function enqueueSupportingDocument(document: Omit<PendingSupportingDocument, 'attempts' | 'lastError'>) {
  await transact('readwrite', (store) => store.add({ ...document, attempts: 0, lastError: null }))
  await refreshSupportingDocuments()
}

export async function recordSupportingDocumentFailure(clientId: string, message: string) {
  const database = await open()
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE, 'readwrite')
    const store = transaction.objectStore(STORE)
    const request = store.get(clientId) as IDBRequest<PendingSupportingDocument | undefined>
    request.onsuccess = () => {
      const record = request.result
      if (record) store.put({ ...record, attempts: record.attempts + 1, lastError: message })
    }
    transaction.oncomplete = () => { database.close(); resolve() }
    transaction.onerror = transaction.onabort = () => { database.close(); reject(transaction.error) }
  })
  await refreshSupportingDocuments()
}

export async function finishSupportingDocument(clientId: string) {
  await transact('readwrite', (store) => store.delete(clientId))
  await refreshSupportingDocuments()
}
