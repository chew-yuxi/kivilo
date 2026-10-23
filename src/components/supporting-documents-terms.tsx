'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { documentRequest } from '@/lib/supporting-documents-client'
import type { AgreementAnalysis, SupportingDocumentFileView, SupportingDocumentsWorkspace } from '@/lib/supporting-documents-schema'

export function AgreementTermsPanel({ tenancyId, viewerId, file, agreement, currentMinorRepairCap }: {
  tenancyId: string
  viewerId: string
  file: SupportingDocumentFileView
  agreement: SupportingDocumentsWorkspace['agreement']
  currentMinorRepairCap: string | null
}) {
  const router = useRouter()
  const existing = agreement.termsMatchCurrentFile ? agreement.terms : null
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [analysis, setAnalysis] = useState<AgreementAnalysis | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(existing?.page.toString() ?? '')
  const [quote, setQuote] = useState(existing?.quote ?? '')
  const [rule, setRule] = useState<'FIRST_AMOUNT' | 'OTHER'>(existing?.rule ?? 'OTHER')
  const [tenantCap, setTenantCap] = useState(existing?.tenantCap ?? '')
  const [notes, setNotes] = useState(existing?.notes ?? '')
  const base = `/api/v1/tenancies/${tenancyId}/documents/agreement`

  return (
    <div className="mt-5 space-y-3 border-t border-gray-100 pt-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">Maintenance terms</h3>
        <span className={`rounded-full px-2.5 py-1 text-xs ${existing ? 'bg-brand-50 text-brand-700' : 'bg-gray-100 text-gray-600'}`}>
          {existing ? 'Confirmed' : 'Needs review'}
        </span>
      </div>

      {agreement.terms && (
        <div className="space-y-2 rounded-lg bg-gray-50 p-4 text-sm">
          <p className="font-medium">
            {agreement.terms.rule === 'FIRST_AMOUNT'
              ? `Tenant pays the first S$${agreement.terms.tenantCap} per minor repair`
              : 'Another maintenance arrangement'}
          </p>
          <blockquote className="whitespace-pre-wrap border-l-2 border-gray-300 pl-3 text-gray-600">{agreement.terms.quote}</blockquote>
          {agreement.terms.notes && <p className="whitespace-pre-wrap text-gray-600">{agreement.terms.notes}</p>}
          <p className="break-words text-xs text-gray-500">{agreement.terms.sourceFileName ?? 'Tenancy agreement'} · Page {agreement.terms.page}</p>
          <p className="text-xs text-gray-500">
            Confirmed by {agreement.terms.confirmedBy.name} · {new Date(agreement.terms.confirmedAt).toLocaleString('en-SG', {
              dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Singapore',
            })} SGT
          </p>
        </div>
      )}
      {agreement.terms && !agreement.termsMatchCurrentFile && (
        <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">
          A newer agreement has been uploaded. The previous confirmed terms stay in use until this version is reviewed.
        </p>
      )}
      {!agreement.terms && (
        <p className="text-sm text-gray-600">
          {currentMinorRepairCap !== null
            ? `The current minor repair setting is S$${currentMinorRepairCap}. It has not been checked against this agreement.`
            : 'The maintenance terms have not been confirmed from this agreement.'}
        </p>
      )}

      {agreement.canReview && !editing && (
        <button
          type="button" className="action-secondary"
          onClick={async () => {
            setEditing(true)
            setLoading(true)
            setError(null)
            try {
              setAnalysis(await documentRequest<AgreementAnalysis>(`${base}/files/${file.id}/analysis`, viewerId))
            } catch {
              setError('Could not read this file. Open the original above and enter the clause below.')
            } finally { setLoading(false) }
          }}
        >{existing ? 'Review confirmed terms' : 'Review maintenance terms'}</button>
      )}

      {editing && (
        <form
          className="space-y-4 rounded-lg border border-gray-200 p-4"
          onSubmit={async (event) => {
            event.preventDefault()
            if (saving) return
            setSaving(true)
            setError(null)
            try {
              await documentRequest(base + '/terms', viewerId, {
                fileId: file.id, page: Number(page), quote: quote.trim(), rule,
                tenantCap: rule === 'FIRST_AMOUNT' ? tenantCap : null,
                notes: notes.trim() || null,
              })
              setEditing(false)
              router.refresh()
            } catch (failure) {
              setError(failure instanceof Error ? failure.message : 'Could not confirm these terms. Please try again.')
            } finally { setSaving(false) }
          }}
        >
          <p className="break-words text-sm font-medium">Reviewing {file.fileName}</p>
          {loading && <p role="status" className="text-sm text-gray-500">Reading the agreement…</p>}
          {analysis && analysis.candidates.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Possible maintenance clauses</h4>
              <p className="text-xs text-gray-500">Check the original agreement and any exceptions before using a clause.</p>
              {analysis.candidates.map((candidate, index) => (
                <div key={`${candidate.page}-${index}`} className="space-y-2 rounded-md bg-gray-50 p-3">
                  <p className="text-xs font-medium text-gray-500">Page {candidate.page}</p>
                  <p className="whitespace-pre-wrap text-sm text-gray-600">{candidate.text}</p>
                  <button
                    type="button" className="action-secondary" disabled={saving}
                    onClick={() => {
                      setPage(candidate.page.toString())
                      setQuote(candidate.text)
                      setRule(candidate.suggestedTenantCap === null ? 'OTHER' : 'FIRST_AMOUNT')
                      setTenantCap(candidate.suggestedTenantCap ?? '')
                      setNotes('')
                    }}
                  >Use this clause</button>
                </div>
              ))}
            </div>
          )}
          {analysis && analysis.candidates.length === 0 && (
            <p className="text-sm text-gray-600">
              {analysis.status === 'NO_TEXT'
                ? 'This file has no readable text. Open the original above and enter the clause below.'
                : analysis.status === 'UNREADABLE' || analysis.status === 'TOO_LONG'
                  ? 'This file could not be read here. Open the original above and enter the clause below.'
                  : 'No maintenance clause was found. Open the original above and enter the relevant clause below.'}
            </p>
          )}

          <label className="block text-sm font-medium">
            Page in agreement
            <input type="number" min={1} max={10000} step={1} required value={page} disabled={saving} onChange={(event) => setPage(event.target.value)} className="mt-1 block min-h-11 w-28 rounded-md border border-gray-300 px-3 py-2 text-base" />
          </label>
          <label className="block text-sm font-medium">
            Exact clause from agreement
            <textarea required maxLength={12000} rows={5} value={quote} disabled={saving} onChange={(event) => setQuote(event.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-base font-normal" />
          </label>
          <fieldset disabled={saving} className="space-y-2 text-sm">
            <legend className="mb-2 font-medium">What does this clause say?</legend>
            <label className="flex min-h-11 items-center gap-2 rounded-md border border-gray-200 px-3 py-2">
              <input type="radio" name="maintenance-rule" value="FIRST_AMOUNT" checked={rule === 'FIRST_AMOUNT'} onChange={() => setRule('FIRST_AMOUNT')} />
              Tenant pays the first amount of each minor repair
            </label>
            <label className="flex min-h-11 items-center gap-2 rounded-md border border-gray-200 px-3 py-2">
              <input type="radio" name="maintenance-rule" value="OTHER" checked={rule === 'OTHER'} onChange={() => setRule('OTHER')} />
              Another arrangement or exceptions
            </label>
          </fieldset>
          {rule === 'FIRST_AMOUNT' && (
            <label className="block text-sm font-medium">
              Tenant&apos;s amount per minor repair (SGD)
              <input type="number" min={0} max={99999999.99} step="0.01" required value={tenantCap} disabled={saving} onChange={(event) => setTenantCap(event.target.value)} className="mt-1 block min-h-11 w-40 rounded-md border border-gray-300 px-3 py-2 text-base font-normal" />
            </label>
          )}
          <label className="block text-sm font-medium">
            {rule === 'OTHER' ? 'Describe the arrangement and exceptions' : 'Exceptions or notes (optional)'}
            <textarea required={rule === 'OTHER'} maxLength={2000} rows={3} value={notes} disabled={saving} onChange={(event) => setNotes(event.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-base font-normal" />
          </label>
          <p className="text-xs text-gray-500">Confirm only what the agreement says. These terms can prefill a proposed cost split; each repair still needs a separate cost agreement.</p>
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={saving || loading} className="action-primary">{saving ? 'Confirming…' : 'Confirm maintenance terms'}</button>
            <button type="button" disabled={saving} className="action-secondary" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </form>
      )}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </div>
  )
}
