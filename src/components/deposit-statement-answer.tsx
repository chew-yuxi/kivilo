'use client'

import { useState, useSyncExternalStore, useTransition } from 'react'
import { answerDepositStatement, answerDepositStatementInPerson } from '@/lib/statement-actions'

/// Agree or dispute the deposit statement above. Without `inPerson`, by the signed-in
/// landlord or tenant, whom the server takes from the session. With it, the party taps
/// it on the agent's device and the server checks they belong to the tenancy.
export function DepositStatementAnswer({
  inspectionId,
  version,
  inPerson,
}: {
  inspectionId: string
  /// The version on screen, so an answer cannot land on a revision nobody has read.
  version: number
  inPerson?: { stakeholderId: string; name: string; role: string }
}) {
  const [pending, startTransition] = useTransition()
  const [disputing, setDisputing] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  // Disabled until hydrated, like the acknowledge button: this page often arrives by a
  // full load straight after sign-in.
  const hydrated = useSyncExternalStore(subscribeNever, () => true, () => false)

  const send = (input: { answer: 'AGREED' } | { answer: 'DISPUTED'; reason: string }) =>
    startTransition(async () => {
      setError(null)
      try {
        if (inPerson) await answerDepositStatementInPerson(inspectionId, inPerson.stakeholderId, { version, ...input })
        else await answerDepositStatement(inspectionId, { version, ...input })
      } catch {
        // The server's message does not survive a production build, and the likeliest
        // cause, a revision published meanwhile, is fixed by reloading.
        setError('Could not record that. Reload the page to see the latest statement, then try again.')
      }
    })

  const who = inPerson ? inPerson.name : 'you'
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      {inPerson ? (
        <>
          <h3 className="text-sm font-semibold">{inPerson.role}: {inPerson.name}</h3>
          <p className="mt-1 text-sm text-gray-700">
            If {inPerson.name} is with you, hand them this device to read the statement. Their
            answer is recorded as given in person, with the time and the exact statement shown.
          </p>
        </>
      ) : (
        <p className="text-sm text-gray-700">
          Your answer is recorded with the time and the exact statement shown above. If the
          agent revises it, you will be asked again.
        </p>
      )}

      {disputing ? (
        <div className="mt-3 space-y-2">
          <label className="block text-sm font-medium" htmlFor={`dispute-${inPerson?.stakeholderId ?? 'own'}`}>
            What {inPerson ? `${inPerson.name} disputes` : 'you dispute'}, and why
          </label>
          <textarea
            id={`dispute-${inPerson?.stakeholderId ?? 'own'}`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pending || !hydrated || reason.trim() === ''}
              onClick={() => send({ answer: 'DISPUTED', reason })}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {pending ? 'Recording…' : 'Record dispute'}
            </button>
            <button type="button" onClick={() => setDisputing(false)} className="px-3 py-2 text-sm text-gray-600">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending || !hydrated}
            aria-label={inPerson ? `Agree to the deposit statement, ${inPerson.name}` : undefined}
            onClick={() => send({ answer: 'AGREED' })}
            className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {pending ? 'Recording…' : `${who === 'you' ? 'I agree' : 'Agree'} to the deductions`}
          </button>
          <button
            type="button"
            disabled={pending || !hydrated}
            aria-label={inPerson ? `Dispute the deposit statement, ${inPerson.name}` : undefined}
            onClick={() => setDisputing(true)}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            Dispute
          </button>
        </div>
      )}
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  )
}

const subscribeNever = () => () => {}
