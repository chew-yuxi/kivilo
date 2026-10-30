'use client'

import { useState, useSyncExternalStore, useTransition } from 'react'
import { sendOwnParticulars } from '@/lib/cdd-actions'
import { idNumberProblem, normalizeIdNumber } from '@/lib/cdd/id-number'

const input = 'mt-1.5 block min-h-12 w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-base text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-100'
const label = 'block text-sm font-medium text-gray-700'
const primary = 'flex min-h-12 w-full items-center justify-center rounded-xl bg-brand-500 px-4 text-[15px] font-semibold text-white transition-colors hover:bg-brand-600 disabled:opacity-50'
const secondary = 'flex min-h-12 w-full items-center justify-center rounded-xl bg-brand-50 px-4 text-[15px] font-semibold text-brand-700 transition-colors hover:bg-brand-100'

const STEPS = ['Your details', 'Your ID', 'Confirm'] as const
const ID_TYPES = [
  { value: 'NRIC', label: 'NRIC' },
  { value: 'FIN', label: 'FIN' },
  { value: 'PASSPORT', label: 'Passport' },
] as const
type IdType = (typeof ID_TYPES)[number]['value']

type Values = {
  legalName: string
  dateOfBirth: string
  nationality: string
  address: string
  idType: IdType
  idNumber: string
  pepDetails: string
}

/// The client's own CEA due-diligence particulars, as on their ID, in three short steps.
/// Every check here is repeated on the server; these only save a round trip. Sent once;
/// the page then shows the confirmation, from the server's fresh payload.
export function CddParticularsForm({ caseId, agentName }: { caseId: string; agentName: string }) {
  const [step, setStep] = useState(0)
  const [values, setValues] = useState<Values>({
    legalName: '', dateOfBirth: '', nationality: '', address: '', idType: 'NRIC', idNumber: '', pepDetails: '',
  })
  const [pep, setPep] = useState<boolean | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  // Disabled until hydrated: this page usually arrives by a full load straight after sign-in.
  const hydrated = useSyncExternalStore(subscribeNever, () => true, () => false)

  const set = (key: keyof Values) => (event: { target: { value: string } }) =>
    setValues((current) => ({ ...current, [key]: event.target.value }))
  const idProblem = values.idNumber.trim() ? idNumberProblem(values.idType, values.idNumber) : null
  const idValid = values.idNumber.trim() !== '' && idProblem === null

  const next = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    if (step === 1 && !idValid) return setError(idProblem ?? 'Enter your ID number')
    if (step === 1 && pep === null) return setError('Answer the question about public positions')
    if (step < 2) return setStep(step + 1)
    startTransition(async () => {
      try {
        const result = await sendOwnParticulars(caseId, {
          ...values,
          idNumber: normalizeIdNumber(values.idNumber),
          pepDeclared: pep,
          pepDetails: pep ? values.pepDetails : null,
        })
        if (result.error) setError(result.error)
      } catch {
        // The server's message does not survive a production build.
        setError('Could not send your details. Reload the page and try again.')
      }
    })
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <ol className="flex gap-2" aria-label="Progress">
        {STEPS.map((name, i) => (
          <li key={name} className="flex-1" aria-current={i === step ? 'step' : undefined}>
            <span className={`block h-1.5 rounded-full ${i <= step ? 'bg-brand-500' : 'bg-gray-200'}`} />
            <span className={`mt-2 block text-xs font-medium ${i === step ? 'text-brand-700' : i < step ? 'text-gray-700' : 'text-gray-400'}`}>
              {name}
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-gray-400">Step {step + 1} of 3</p>

      <form onSubmit={next} className="mt-2 space-y-4">
        {step === 0 && (
          <>
            <h2 className="text-lg font-semibold text-gray-900">Your details</h2>
            <label className={label}>
              Full name, as on your ID
              <input value={values.legalName} onChange={set('legalName')} required autoComplete="name" className={input} />
            </label>
            <label className={label}>
              Date of birth
              <input value={values.dateOfBirth} onChange={set('dateOfBirth')} type="date" required autoComplete="bday" className={input} />
            </label>
            <label className={label}>
              Nationality
              <input value={values.nationality} onChange={set('nationality')} required autoComplete="country-name" className={input} />
            </label>
            <label className={label}>
              Residential address
              <textarea value={values.address} onChange={set('address')} required rows={2} autoComplete="street-address" className={input} />
            </label>
          </>
        )}

        {step === 1 && (
          <>
            <h2 className="text-lg font-semibold text-gray-900">Your ID</h2>
            <fieldset>
              <legend className={label}>ID type</legend>
              <div className="mt-1.5 grid grid-cols-3 gap-1 rounded-xl bg-gray-100 p-1">
                {ID_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    aria-pressed={values.idType === type.value}
                    onClick={() => setValues((current) => ({ ...current, idType: type.value }))}
                    className={`min-h-10 rounded-lg text-sm font-semibold ${values.idType === type.value ? 'bg-brand-500 text-white shadow-sm' : 'text-gray-600'}`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </fieldset>
            <label className={label}>
              ID number
              <span className="relative block">
                <input
                  value={values.idNumber}
                  onChange={set('idNumber')}
                  required
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  aria-invalid={idProblem !== null}
                  className={`${input} pr-11 font-mono uppercase tracking-wider ${idProblem ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : ''}`}
                />
                {idValid && (
                  <svg viewBox="0 0 24 24" aria-label="Valid" className="absolute right-3.5 top-1/2 size-5 -translate-y-1/2 text-green-600" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <path d="m5 12.5 4.5 4.5L19 7.5" />
                  </svg>
                )}
              </span>
              {idProblem && values.idNumber.trim().length >= 9 && <span className="mt-1.5 block text-sm text-red-700">{idProblem}</span>}
            </label>
            <fieldset>
              <legend className={label}>
                Do you, or a close family member or associate, hold or have held a prominent public
                position, such as a minister, senior official, judge or senior military officer?
              </legend>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {[false, true].map((answer) => (
                  <button
                    key={String(answer)}
                    type="button"
                    aria-pressed={pep === answer}
                    onClick={() => setPep(answer)}
                    className={`min-h-12 rounded-xl border text-sm font-semibold ${pep === answer ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-300 text-gray-700'}`}
                  >
                    {answer ? 'Yes' : 'No'}
                  </button>
                ))}
              </div>
              {pep && (
                <label className={`${label} mt-3`}>
                  Which position, and who holds it
                  <textarea value={values.pepDetails} onChange={set('pepDetails')} required rows={2} className={input} />
                </label>
              )}
            </fieldset>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="text-lg font-semibold text-gray-900">Check and confirm</h2>
            <dl className="divide-y divide-gray-100 rounded-xl bg-gray-50 px-4 text-sm">
              <Review label="Name" value={values.legalName} onEdit={() => setStep(0)} />
              <Review label="Date of birth" value={formatDate(values.dateOfBirth)} onEdit={() => setStep(0)} />
              <Review label="Nationality" value={values.nationality} onEdit={() => setStep(0)} />
              <Review label="Address" value={values.address} onEdit={() => setStep(0)} />
              <Review label={values.idType === 'PASSPORT' ? 'Passport' : values.idType} value={normalizeIdNumber(values.idNumber)} onEdit={() => setStep(1)} />
              <Review label="Public position" value={pep ? values.pepDetails || 'Yes' : 'None'} onEdit={() => setStep(1)} />
            </dl>
            <label className="flex items-start gap-3 rounded-xl border border-gray-200 p-3.5 text-sm text-gray-700">
              <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} required className="mt-0.5 size-5 shrink-0 accent-brand-500" />
              I confirm these details are true and match my ID. I understand {agentName} must keep
              them for five years, as the law requires.
            </label>
          </>
        )}

        {error && <p className="rounded-xl bg-red-50 px-3.5 py-3 text-sm text-red-800" role="alert">{error}</p>}
        <div className="space-y-3 pt-1">
          <button type="submit" disabled={!hydrated || pending || (step === 2 && !confirmed)} className={primary}>
            {step < 2 ? 'Continue' : pending ? 'Sending…' : 'Send my details'}
          </button>
          {step > 0 && (
            <button type="button" onClick={() => { setError(null); setStep(step - 1) }} className={secondary}>
              Back
            </button>
          )}
        </div>
      </form>
    </div>
  )
}

function Review({ label, value, onEdit }: { label: string; value: string; onEdit: () => void }) {
  return (
    <div className="flex items-start gap-3 py-3">
      <dt className="w-28 shrink-0 text-gray-500">{label}</dt>
      <dd className="min-w-0 flex-1 break-words font-medium text-gray-900">{value}</dd>
      <button type="button" onClick={onEdit} className="shrink-0 text-sm font-semibold text-brand-700">Edit</button>
    </div>
  )
}

function formatDate(iso: string) {
  const date = new Date(`${iso}T00:00:00Z`)
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString('en-SG', { timeZone: 'UTC', dateStyle: 'long' })
}

const subscribeNever = () => () => {}
