'use client'

import { useState, useSyncExternalStore, useTransition } from 'react'
import { sendOwnParticulars } from '@/lib/cdd-actions'

const input = 'mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none'

/// The client's own CEA due-diligence particulars, as on their ID. Sent once; the page then
/// shows the thank-you, from the server's fresh payload.
export function CddParticularsForm({ caseId }: { caseId: string }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [pep, setPep] = useState(false)
  // Disabled until hydrated: this page usually arrives by a full load straight after sign-in.
  const hydrated = useSyncExternalStore(subscribeNever, () => true, () => false)

  // onSubmit rather than a form action: React resets a form after its action, which
  // would clear every field the client typed whenever one of them is refused.
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    startTransition(async () => {
      setError(null)
      const text = (name: string) => String(form.get(name) ?? '')
      try {
        const result = await sendOwnParticulars(caseId, {
          legalName: text('legalName'),
          idType: text('idType'),
          idNumber: text('idNumber'),
          nationality: text('nationality'),
          dateOfBirth: text('dateOfBirth'),
          address: text('address'),
          pepDeclared: pep,
          pepDetails: pep ? text('pepDetails') : null,
        })
        if (result.error) setError(result.error)
      } catch {
        // The server's message does not survive a production build.
        setError('Could not send your details. Reload the page and try again.')
      }
    })
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block text-sm font-medium">
        Full name, as on your ID
        <input name="legalName" required autoComplete="name" className={input} />
      </label>
      <div className="grid grid-cols-[8rem_1fr] gap-3">
        <label className="block text-sm font-medium">
          ID type
          <select name="idType" defaultValue="NRIC" className={input}>
            <option value="NRIC">NRIC</option>
            <option value="FIN">FIN</option>
            <option value="PASSPORT">Passport</option>
          </select>
        </label>
        <label className="block text-sm font-medium">
          ID number
          <input name="idNumber" required autoComplete="off" className={input} />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-medium">
          Nationality
          <input name="nationality" required autoComplete="country-name" className={input} />
        </label>
        <label className="block text-sm font-medium">
          Date of birth
          <input name="dateOfBirth" type="date" required autoComplete="bday" className={input} />
        </label>
      </div>
      <label className="block text-sm font-medium">
        Residential address
        <textarea name="address" required rows={2} autoComplete="street-address" className={input} />
      </label>
      <fieldset>
        <legend className="text-sm font-medium">
          Do you, or a close family member or associate, hold or have held a prominent public
          position (for example a minister, senior official, judge or senior military officer)?
        </legend>
        <div className="mt-2 flex gap-6 text-sm">
          <label className="flex items-center gap-2">
            <input type="radio" name="pep" checked={!pep} onChange={() => setPep(false)} /> No
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="pep" checked={pep} onChange={() => setPep(true)} /> Yes
          </label>
        </div>
        {pep && (
          <label className="mt-3 block text-sm font-medium">
            Which position, and who holds it
            <textarea name="pepDetails" required rows={2} className={input} />
          </label>
        )}
      </fieldset>
      {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
      <button
        type="submit"
        disabled={!hydrated || pending}
        className="w-full rounded-md bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {pending ? 'Sending…' : 'Send my details'}
      </button>
    </form>
  )
}

const subscribeNever = () => () => {}
