'use client'

import { useLocale, usePwa } from '@/components/locale'

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { documentRequest } from '@/lib/supporting-documents-client'
import { AgreementTermsPanel } from '@/components/supporting-documents-terms'
import { zoneLabel } from '@/lib/country'
import type { Country } from '@/generated/prisma'
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


function dateLabel(value: string, country: Country, locale: string) {
  return `${new Date(value).toLocaleString(locale, {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Singapore',
  })} ${zoneLabel(country)}`
}

function sizeLabel(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function SupportingDocumentsPanel({ workspace, viewerId, requestedRequestId }: {
  workspace: SupportingDocumentsWorkspace
  viewerId: string
  requestedRequestId?: string
}) {
  const locale = useLocale()
  const w = usePwa()
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
            if (!requestId) throw new Error(w.couldNotPrepareThisDocumentPleaseRetry)
            const path = `${base}/${requestId}`
            const permission = await documentRequest<UploadPermission>(`${path}/upload-url`, viewerId, metadata)
            if (!permission.alreadyRegistered) {
              if (!permission.alreadyUploaded) {
                if (!permission.token) throw new Error(w.couldNotStartTheUploadPleaseTry)
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
                  if (result.error) throw new Error(w.theUploadWasInterruptedYourFileIs)
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
              failure instanceof Error ? failure.message : w.theUploadWasInterruptedPleaseRetry)
          }
        }
      } while (flushAgain.current && active.current)
    } catch {
      if (active.current) setError(w.couldNotReadSavedFilesOnThis)
    } finally {
      flushing.current = false
      if (active.current) {
        setUploading(null)
        if (uploaded) {
          setNotice(w.yourDocumentHasBeenSubmitted)
          router.refresh()
        }
      }
    }
  }, [w, base, router, viewerId, workspace.canUpload, workspace.agreement.canUpload, workspace.tenancyId])

  useEffect(() => {
    active.current = true
    void refreshSupportingDocuments().then(flush).catch(() => {
      if (active.current) setError(w.couldNotReadSavedFilesOnThis)
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
  }, [flush, w])

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
      <p className="text-sm text-gray-500">{w.privateToThisTenancysTenantLandlordAnd}</p>
      {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="text-sm text-brand-700">{notice}</p>}

      <section id="tenancy-agreement" aria-label={w.tenancyAgreement} className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold tracking-tight">{w.tenancyAgreement}</h2>
        <p className="mt-2 text-sm text-gray-600">
          {agreement.canReview
            ? w.keepTheAgreementHereThenReviewIts
            : w.keepTheAgreementHereAndViewThe}
        </p>
        {currentAgreement && agreement.requestId && (
          <DocumentFiles country={workspace.country} files={[currentAgreement]} opening={opening} onDownload={(file) => downloadFile(agreement.requestId!, file)} />
        )}
        <PendingFiles files={agreementPending} uploading={uploading} />
        {agreement.canUpload && (
          <UploadField
            id="agreement-upload"
            label={currentAgreement ? w.uploadNewAgreement : w.uploadAgreement}
            disabled={selecting !== null}
            hint={selecting === 'agreement' ? w.savingToDevice : w.agreementFormats}
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
            country={workspace.country}
          />
        )}
        {previousAgreements.length > 0 && agreement.requestId && (
          <details className="mt-5 border-t border-gray-100 pt-4">
            <summary className="cursor-pointer text-sm font-medium text-gray-600">{w.previousAgreements}{previousAgreements.length})</summary>
            <DocumentFiles country={workspace.country} files={previousAgreements} opening={opening} onDownload={(file) => downloadFile(agreement.requestId!, file)} />
          </details>
        )}
      </section>

      <details ref={otherDocuments} className="group rounded-xl border border-gray-200 bg-white" data-testid="other-documents">
        <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 p-5">
          <span>
            <span className="block text-sm font-medium">{w.otherDocuments}</span>
            <span className="mt-1 block text-xs text-gray-500">{w.optionalFilesRequestedForThisTenancy}</span>
          </span>
          <span className="text-xs text-gray-500">
            {workspace.requests.length ? `${workspace.requests.length} ${workspace.requests.length === 1 ? w.request : w.requests}` : w.optionalLabel} ·{' '}
            <span className="group-open:hidden">{w.show}</span><span className="hidden group-open:inline">{w.hide}</span>
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
                  setNotice(w.documentRequestedTheTenantCanNowAdd)
                  router.refresh()
                } catch (failure) {
                  setError(failure instanceof Error ? failure.message : w.couldNotRequestTheDocumentPleaseTry)
                } finally { setRequesting(false) }
              }}
            >
              <label className="block text-sm font-medium" htmlFor="document-request-title">{w.documentToRequest}</label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  id="document-request-title" type="text" maxLength={120} required value={requestTitle} disabled={requesting}
                  placeholder={w.forExamplePaymentProof}
                  className="min-h-11 min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2 text-base"
                  onChange={(event) => { setRequestTitle(event.target.value); requestClientId.current = null }}
                />
                <button type="submit" disabled={requesting || !requestTitle.trim()} className="action-secondary shrink-0">
                  {requesting ? w.requesting : w.requestDocument}
                </button>
              </div>
              <p className="text-xs text-gray-500">{w.theTenantReceivesAPrivateRequestTo}</p>
            </form>
          )}
          {workspace.requests.length === 0 ? (
            <p className="text-sm text-gray-500">{w.noOtherDocumentsRequested}</p>
          ) : workspace.requests.map((request) => (
            <section
              key={request.id} ref={request.id === requestedRequestId ? requestedSection : null}
              tabIndex={-1} className="scroll-mt-5 border-t border-gray-100 pt-5" aria-label={request.title}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="break-words text-sm font-medium">{request.title}</h3>
                  <p className="mt-1 text-xs text-gray-500">{w.requestedBy} {request.requestedBy.name} · {dateLabel(request.requestedAt, workspace.country, locale)}</p>
                </div>
                <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600">
                  {request.files.length ? w.filesSubmitted(request.files.length) : w.requested}
                </span>
              </div>
              <DocumentFiles country={workspace.country} files={request.files} opening={opening} onDownload={(file) => downloadFile(request.id, file)} />
              <PendingFiles files={pending.filter((file) => file.kind !== 'AGREEMENT' && file.requestId === request.id)} uploading={uploading} />
              {request.canUpload && (
                <UploadField
                  id={`document-${request.id}`} label={request.files.length ? w.addAnotherFile : w.uploadAFile}
                  disabled={selecting !== null}
                  hint={selecting === request.id ? w.savingToDevice : w.supportingFormats}
                  onPick={(input) => pickFile(input, request.id)}
                />
              )}
            </section>
          ))}
        </div>
      </details>

      {pending.length > 0 && (
        <div className="flex flex-col items-start gap-2 text-sm">
          <p className="text-gray-600">{w.yourSavedFilesRetryWhileThisPage}</p>
          <button type="button" className="action-secondary" disabled={uploading !== null} onClick={() => void flush()}>
            {uploading ? w.uploading : w.retryUploads}
          </button>
        </div>
      )}
      <p className="text-xs text-gray-500">{w.theseDocumentsStaySeparateFromTheCondition}</p>
    </div>
  )
}

function DocumentFiles({ files, country, opening, onDownload }: {
  files: SupportingDocumentFileView[]
  country: Country
  opening: string | null
  onDownload: (file: SupportingDocumentFileView) => Promise<void>
}) {
  const locale = useLocale()
  const w = usePwa()
  if (!files.length) return null
  return (
    <ul className="mt-4 divide-y divide-gray-100">
      {files.map((file) => (
        <li key={file.id} className="flex items-start justify-between gap-3 py-3 first:pt-0">
          <div className="min-w-0">
            <p className="break-words text-sm font-medium">{file.fileName}</p>
            <p className="mt-1 text-xs text-gray-500">{w.submittedBy} {file.submittedBy.name} · {dateLabel(file.submittedAt, country, locale)}</p>
            <p className="mt-1 text-xs text-gray-500">{sizeLabel(file.byteSize)}</p>
          </div>
          <button type="button" aria-label={`Download ${file.fileName}`} disabled={opening !== null} className="action-secondary shrink-0" onClick={() => void onDownload(file)}>
            {opening === file.id ? w.opening : w.download}
          </button>
        </li>
      ))}
    </ul>
  )
}

function PendingFiles({ files, uploading }: { files: PendingSupportingDocument[]; uploading: string | null }) {
  const w = usePwa()
  if (!files.length) return null
  return (
    <ul className="mt-4 space-y-2" aria-label={w.filesSavedOnThisDevice}>
      {files.map((file) => (
        <li key={file.clientId} className="rounded-md bg-amber-50 p-3 text-sm">
          <p className="break-words font-medium">{file.fileName}</p>
          <p className="mt-1 text-xs text-amber-900">{uploading === file.clientId ? w.uploading : w.savedOnThisDeviceWaitingToUpload}</p>
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
