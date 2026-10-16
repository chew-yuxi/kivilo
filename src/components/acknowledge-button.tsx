'use client'

import { useState, useSyncExternalStore, useTransition } from 'react'
import { acknowledgeAddendum, acknowledgeAddendumInPerson } from '@/lib/addendum-actions'

/// "I acknowledge this update". Without `inPerson`, by the signed-in landlord or tenant:
/// the server decides who that is from the session and nothing here names a party. With
/// it, the party taps it on the agent's device, as they would sign there, and the server
/// checks the named party belongs to the tenancy.
export function AcknowledgeButton({
  addendumId,
  inPerson,
}: {
  addendumId: string
  inPerson?: { stakeholderId: string; name: string; role: string }
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  // Server-rendered disabled: the page often arrives by a full load straight after sign-in,
  // and a tap before hydration would otherwise land on a button with no handler and vanish.
  const hydrated = useSyncExternalStore(subscribeNever, () => true, () => false)

  return (
    <div>
      {inPerson ? (
        <>
          <h2 className="text-sm font-semibold">{inPerson.role}: {inPerson.name}</h2>
          <p className="mt-1 text-sm text-gray-700">
            If {inPerson.name} is with you, hand them this device to read the update above. Their
            acknowledgement is recorded as given in person, with the time and the exact content
            shown. It is not a new signature on the report.
          </p>
        </>
      ) : (
        <p className="text-sm text-gray-700">
          Acknowledging records that you have seen this update, with the time and the exact
          content shown above. It is not a new signature on the report.
        </p>
      )}
      <button
        type="button"
        disabled={pending || !hydrated}
        aria-label={inPerson ? `I acknowledge this update, ${inPerson.name}` : undefined}
        onClick={() => startTransition(async () => {
          setError(null)
          try {
            if (inPerson) await acknowledgeAddendumInPerson(addendumId, inPerson.stakeholderId)
            else await acknowledgeAddendum(addendumId)
          } catch {
            setError('Could not record that. Try again in a moment.')
          }
        })}
        className="mt-4 rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
      >
        {pending ? 'Recording…' : 'I acknowledge this update'}
      </button>
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  )
}

const subscribeNever = () => () => {}
