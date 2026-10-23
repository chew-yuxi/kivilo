'use client'

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { documentRequest } from '@/lib/supporting-documents-client'
import { AgreementTermsPanel } from '@/components/supporting-documents-terms'
import {
  SUPPORTING_DOCUMENT_MAX_BYTES,
  SUPPORTING_DOCUMENT_MIME_TYPES,
  supportingDocumentUploadInput,
  type SupportingDocumentsWorkspace,
  type SupportingDocumentFileView,
} from '@/lib/supporting-documents-schema'
import {
  enqueueSupportingDocument,
  finishSupportingDocument,
  pendingSupportingDocuments,
  recordSupportingDocumentFailure,
  refreshSupportingDocuments,
  subscribeToSupportingDocuments,
  supportingDocumentsServerSnapshot,
  supportingDocumentsSnapshot,
  type PendingSupportingDocument,
} from '@/lib/supporting-documents-queue'

type UploadPermission = {
  storagePath: string
  token?: string
  alreadyUploaded?: boolean
  alreadyRegistered?: boolean
}


function dateLabel(value: string) {
  return new Date(value).toLocaleString('en-SG', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Singapore',
  })
}

function sizeLabel(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function SupportingDocumentsPanel({ workspace, viewerId, requestedRequestId }: {
  workspace: SupportingDocumentsWorkspace
  viewerId: string
  requestedRequestId?: string
}) {
  const router = useRouter()
  const base = `/api/v1/tenancies/${workspace.tenancyId}/documents`
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [requestTitle, setRequestTitle] = useState('')
  const [requesting, setRequesting] = useState(false)
  const [selecting, setSelecting] = useState<string | null>(null)
  const [opening, setOpening] = useState<string | null>(null)
  const [uploading, setUploading] = useState<string | null>(null)
  const requestClientId = useRef<string | null>(null)
  const flushing = useRef(false)
  const flushAgain = useRef(false)
  const active = useRef(false)
  const otherDocuments = useRef<HTMLDetailsElement>(null)
  const requestedSection = useRef<HTMLElement>(null)
  const hasRequestedTarget = workspace.requests.some((request) => request.id === requestedRequestId)
  const queue = useSyncExternalStore(
    subscribeToSupportingDocuments, supportingDocumentsSnapshot, supportingDocumentsServerSnapshot,
  )
  const pending = queue.filter((file) => file.ownerId === viewerId && file.tenancyId === workspace.tenancyId)

  useEffect(() => {
    if (!hasRequestedTarget || !otherDocuments.current || !requestedSection.current) return
    otherDocuments.current.open = true
    const section = requestedSection.current
    const target = section.querySelector<HTMLInputElement>('input[type="file"]') ?? section
    target.focus({ preventScroll: true })
    section.scrollIntoView({ block: 'start' })
  }, [requestedRequestId, hasRequestedTarget])

  const flush = useCallback(async () => {
    if (!navigator.onLine || !(workspace.canUpload || workspace.agreement.canUpload) || !active.current) return
    if (flushing.current) { flushAgain.current = true; return }
    flushing.current = true
    let uploaded = false
    try {
      do {
        flushAgain.current = false
        const files = (await pendingSupportingDocuments())
          .filter((file) => file.ownerId === viewerId && file.tenancyId === workspace.tenancyId)
          .sort((a, b) => a.attempts - b.attempts || a.createdAt - b.createdAt)
        for (const file of files) {
          if (!active.current || !navigator.onLine) break
          setUploading(file.clientId)
          try {
            const metadata = {
              clientId: file.clientId, fileName: file.fileName,
              mimeType: file.mimeType, byteSize: file.blob.size,
            }
            let requestId = file.requestId
            if (file.kind === 'AGREEMENT' && !requestId) {
              const prepared = await documentRequest<SupportingDocumentsWorkspace>(`${base}/agreement`, viewerId, {})
              requestId = prepared.agreement.requestId
            }
            if (!requestId) throw new Error('Could not prepare this document. Please retry.')
            const path = `${base}/${requestId}`
            const permission = await documentRequest<UploadPermission>(`${path}/upload-url`, viewerId, metadata)
            if (!permission.alreadyRegistered) {
              if (!permission.alreadyUploaded) {
                if (!permission.token) throw new Error('Could not start the upload. Please try again.')
                const controller = new AbortController()
                const timeout = window.setTimeout(() => controller.abort(), 120_000)
                try {
                  const storage = createClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                    {
                      auth: { persistSession: false, autoRefreshToken: false },
                      // uploadToSignedUrl has no signal option; the SDK forwards
                      // its request through this supported custom fetch instead.
                      global: { fetch: (input, init) => fetch(input, { ...init, signal: controller.signal }) },
                    },
                  ).storage.from('captures')
                  const result = await storage.uploadToSignedUrl(permission.storagePath, permission.token, file.blob, {
                    contentType: file.mimeType,
                  })
                  if (result.error) throw new Error('The upload was interrupted. Your file is saved on this device.')
                } finally {
                  window.clearTimeout(timeout)
                }
              }
              // A request interrupted after storage accepted the bytes resumes here
              // using the same client id, without making a second document.
              await documentRequest(`${path}/files`, viewerId, metadata)
            }
            await finishSupportingDocument(file.clientId)
            uploaded = true
          } catch (failure) {
            await recordSupportingDocumentFailure(file.clientId,
              failure instanceof Error ? failure.message : 'The upload was interrupted. Please retry.')
          }
        }
      } while (flushAgain.current && active.current)
    } catch {
      if (active.current) setError('Could not read saved files on this device. Reopen this page to try again.')
    } finally {
      flushing.current = false
      if (active.current) {
        setUploading(null)
        if (uploaded) {
          setNotice('Your document has been submitted.')
          router.refresh()
        }
      }
    }
  }, [base, router, viewerId, workspace.canUpload, workspace.agreement.canUpload, workspace.tenancyId])

  useEffect(() => {
    active.current = true
    void refreshSupportingDocuments().then(flush).catch(() => {
      if (active.current) setError('Could not read saved files on this device. Reopen this page to try again.')
    })
    const resume = () => { void flush() }
    window.addEventListener('online', resume)
    const timer = window.setInterval(() => {
      // A slow attempt should finish before the timer schedules another pass.
      if (!flushing.current) void flush()
    }, 20_000)
    return () => {
      active.current = false
      window.removeEventListener('online', resume)
      window.clearInterval(timer)
    }
  }, [flush])

  async function pickFile(input: HTMLInputElement, requestId: string | null, agreement = false) {
    const file = input.files?.[0]
    if (!file) return
    setError(null)
    setNotice(null)
    if (!SUPPORTING_DOCUMENT_MIME_TYPES.includes(file.type as typeof SUPPORTING_DOCUMENT_MIME_TYPES[number]) || file.size === 0 || file.size > SUPPORTING_DOCUMENT_MAX_BYTES) {
      setError('Choose a PDF, JPEG, PNG or WebP file up to 10 MB.')
      return
    }
    const metadata = supportingDocumentUploadInput.safeParse({
      clientId: crypto.randomUUID(), fileName: file.name, mimeType: file.type, byteSize: file.size,
    })
    if (!metadata.success) {
      setError('Rename this file using 1–180 characters, without slashes or control characters, then choose it again.')
      return
    }
    setSelecting(agreement ? 'agreement' : requestId)
    try {
      await enqueueSupportingDocument({
        clientId: metadata.data.clientId, ownerId: viewerId, tenancyId: workspace.tenancyId,
        requestId, ...(agreement ? { kind: 'AGREEMENT' as const } : {}),
        fileName: metadata.data.fileName, mimeType: metadata.data.mimeType, blob: file, createdAt: Date.now(),
      })
      input.value = ''
      void flush()
    } catch {
      setError('This file could not be saved on your device. Keep the original and choose it again to retry.')
    } finally { setSelecting(null) }
  }

  async function downloadFile(requestId: string, file: SupportingDocumentFileView) {
    setOpening(file.id)
    setError(null)
    try {
      const result = await documentRequest<{ url: string }>(`${base}/${requestId}/files/${file.id}`, viewerId)
      window.location.assign(result.url)
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not open this document. Please try again.')
    } finally { setOpening(null) }
  }

  const agreement = workspace.agreement
  const currentAgreement = agreement.files.find((file) => file.id === agreement.currentFileId)
  const previousAgreements = agreement.files.filter((file) => file.id !== agreement.currentFileId)
  const agreementPending = pending.filter((file) => file.kind === 'AGREEMENT')

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">Private to this tenancy&apos;s tenant, landlord and authorized agents.</p>
      {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="text-sm text-brand-700">{notice}</p>}

      <section id="tenancy-agreement" aria-label="Tenancy agreement" className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold tracking-tight">Tenancy agreement</h2>
        <p className="mt-2 text-sm text-gray-600">
          {agreement.canReview
            ? 'Keep the agreement here, then review its maintenance clauses and confirm the terms for this tenancy.'
            : 'Keep the agreement here and view the maintenance terms confirmed by your landlord or agent.'}
        </p>
        {currentAgreement && agreement.requestId && (
          <DocumentFiles files={[currentAgreement]} opening={opening} onDownload={(file) => downloadFile(agreement.requestId!, file)} />
        )}
        <PendingFiles files={agreementPending} uploading={uploading} />
        {agreement.canUpload && (
          <UploadField
            id="agreement-upload"
            label={currentAgreement ? 'Upload a newer agreement' : 'Upload tenancy agreement'}
            disabled={selecting !== null}
            hint={selecting === 'agreement' ? 'Saving on this device…' : 'PDF preferred, or JPEG, PNG and WebP · up to 10 MB'}
            onPick={(input) => pickFile(input, agreement.requestId, true)}
          />
        )}
        {currentAgreement && (
          <AgreementTermsPanel
            key={`${currentAgreement.id}-${agreement.terms?.confirmedAt ?? 'unreviewed'}`}
            tenancyId={workspace.tenancyId}
            viewerId={viewerId}
            file={currentAgreement}
            agreement={agreement}
            currentMinorRepairCap={workspace.currentMinorRepairCap}
          />
        )}
        {previousAgreements.length > 0 && agreement.requestId && (
          <details className="mt-5 border-t border-gray-100 pt-4">
            <summary className="cursor-pointer text-sm font-medium text-gray-600">Previous agreements ({previousAgreements.length})</summary>
            <DocumentFiles files={previousAgreements} opening={opening} onDownload={(file) => downloadFile(agreement.requestId!, file)} />
          </details>
        )}
      </section>

      <details ref={otherDocuments} className="group rounded-xl border border-gray-200 bg-white" data-testid="other-documents">
        <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 p-5">
          <span>
            <span className="block text-sm font-medium">Other documents</span>
            <span className="mt-1 block text-xs text-gray-500">Optional files requested for this tenancy</span>
          </span>
          <span className="text-xs text-gray-500">
            {workspace.requests.length ? `${workspace.requests.length} ${workspace.requests.length === 1 ? 'request' : 'requests'}` : 'Optional'} ·{' '}
            <span className="group-open:hidden">Show</span><span className="hidden group-open:inline">Hide</span>
          </span>
        </summary>
        <div className="space-y-5 border-t border-gray-100 p-5">
          {workspace.canRequest && (
            <form
              className="space-y-3"
              onSubmit={async (event) => {
                event.preventDefault()
                if (requesting) return
                setRequesting(true)
                setError(null)
                setNotice(null)
                requestClientId.current ??= crypto.randomUUID()
                try {
                  await documentRequest(base, viewerId, { clientId: requestClientId.current, title: requestTitle.trim() })
                  requestClientId.current = null
                  setRequestTitle('')
                  setNotice('Document requested. The tenant can now add a file here.')
                  router.refresh()
                } catch (failure) {
                  setError(failure instanceof Error ? failure.message : 'Could not request the document. Please try again.')
                } finally { setRequesting(false) }
              }}
            >
              <label className="block text-sm font-medium" htmlFor="document-request-title">Document to request</label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  id="document-request-title" type="text" maxLength={120} required value={requestTitle} disabled={requesting}
                  placeholder="For example, payment proof"
                  className="min-h-11 min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2 text-base"
                  onChange={(event) => { setRequestTitle(event.target.value); requestClientId.current = null }}
                />
                <button type="submit" disabled={requesting || !requestTitle.trim()} className="action-secondary shrink-0">
                  {requesting ? 'Requesting…' : 'Request document'}
                </button>
              </div>
              <p className="text-xs text-gray-500">The tenant receives a private request to upload this file.</p>
            </form>
          )}
          {workspace.requests.length === 0 ? (
            <p className="text-sm text-gray-500">No other documents requested.</p>
          ) : workspace.requests.map((request) => (
            <section
              key={request.id} ref={request.id === requestedRequestId ? requestedSection : null}
              tabIndex={-1} className="scroll-mt-5 border-t border-gray-100 pt-5" aria-label={request.title}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="break-words text-sm font-medium">{request.title}</h3>
                  <p className="mt-1 text-xs text-gray-500">Requested by {request.requestedBy.name} · {dateLabel(request.requestedAt)} SGT</p>
                </div>
                <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600">
                  {request.files.length ? `${request.files.length} submitted` : 'Requested'}
                </span>
              </div>
              <DocumentFiles files={request.files} opening={opening} onDownload={(file) => downloadFile(request.id, file)} />
              <PendingFiles files={pending.filter((file) => file.kind !== 'AGREEMENT' && file.requestId === request.id)} uploading={uploading} />
              {request.canUpload && (
                <UploadField
                  id={`document-${request.id}`} label={request.files.length ? 'Add another file' : 'Upload a file'}
                  disabled={selecting !== null}
                  hint={selecting === request.id ? 'Saving on this device…' : 'PDF, JPEG, PNG or WebP · up to 10 MB per file'}
                  onPick={(input) => pickFile(input, request.id)}
                />
              )}
            </section>
          ))}
        </div>
      </details>

      {pending.length > 0 && (
        <div className="flex flex-col items-start gap-2 text-sm">
          <p className="text-gray-600">Your saved files retry while this page is open. You can return later with this account.</p>
          <button type="button" className="action-secondary" disabled={uploading !== null} onClick={() => void flush()}>
            {uploading ? 'Uploading…' : 'Retry uploads'}
          </button>
        </div>
      )}
      <p className="text-xs text-gray-500">These documents stay separate from the condition report and never hold up signing.</p>
    </div>
  )
}

function DocumentFiles({ files, opening, onDownload }: {
  files: SupportingDocumentFileView[]
  opening: string | null
  onDownload: (file: SupportingDocumentFileView) => Promise<void>
}) {
  if (!files.length) return null
  return (
    <ul className="mt-4 divide-y divide-gray-100">
      {files.map((file) => (
        <li key={file.id} className="flex items-start justify-between gap-3 py-3 first:pt-0">
          <div className="min-w-0">
            <p className="break-words text-sm font-medium">{file.fileName}</p>
            <p className="mt-1 text-xs text-gray-500">Submitted by {file.submittedBy.name} · {dateLabel(file.submittedAt)} SGT</p>
            <p className="mt-1 text-xs text-gray-500">{sizeLabel(file.byteSize)}</p>
          </div>
          <button type="button" aria-label={`Download ${file.fileName}`} disabled={opening !== null} className="action-secondary shrink-0" onClick={() => void onDownload(file)}>
            {opening === file.id ? 'Opening…' : 'Download'}
          </button>
        </li>
      ))}
    </ul>
  )
}

function PendingFiles({ files, uploading }: { files: PendingSupportingDocument[]; uploading: string | null }) {
  if (!files.length) return null
  return (
    <ul className="mt-4 space-y-2" aria-label="Files saved on this device">
      {files.map((file) => (
        <li key={file.clientId} className="rounded-md bg-amber-50 p-3 text-sm">
          <p className="break-words font-medium">{file.fileName}</p>
          <p className="mt-1 text-xs text-amber-900">{uploading === file.clientId ? 'Uploading…' : 'Saved on this device · waiting to upload'}</p>
          {file.lastError && <p className="mt-1 text-xs text-amber-900">{file.lastError}</p>}
        </li>
      ))}
    </ul>
  )
}

function UploadField({ id, label, disabled, hint, onPick }: {
  id: string; label: string; disabled: boolean; hint: string; onPick: (input: HTMLInputElement) => Promise<void>
}) {
  return (
    <div className="mt-4 space-y-2">
      <label className="block text-sm font-medium" htmlFor={id}>{label}</label>
      <input
        id={id} type="file" accept="application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp"
        disabled={disabled}
        className="block min-h-11 w-full min-w-0 text-sm text-gray-600 file:mr-3 file:min-h-11 file:rounded-md file:border file:border-gray-300 file:bg-white file:px-3 file:text-sm file:font-medium file:text-gray-900"
        onChange={(event) => void onPick(event.currentTarget)}
      />
      <p className="text-xs text-gray-500">{hint}</p>
    </div>
  )
}
