'use client'

import { useState, useTransition } from 'react'
import { acknowledgeAddendum } from '@/lib/addendum-actions'

/// "I acknowledge this update", by the signed-in landlord or tenant. The server decides
/// who that is from the session; nothing here names a party.
export function AcknowledgeButton({ addendumId }: { addendumId: string }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  return (
    <div>
      <p className="text-sm text-gray-700">
        Acknowledging records that you have seen this update, with the time and the exact
        content shown above. It is not a new signature on the report.
      </p>
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(async () => {
          setError(null)
          try {
            await acknowledgeAddendum(addendumId)
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
