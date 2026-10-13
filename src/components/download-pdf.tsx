'use client'

import { useState, useTransition } from 'react'

/// Prints the signed report on the server and opens the file. Goes through the same
/// /api/v1 route as the app, which accepts this browser's session cookie.
export function DownloadPdf({ inspectionId }: { inspectionId: string }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <h2 className="text-sm font-medium">PDF copy</h2>
      <p className="mt-1 text-sm text-gray-500">
        The signed report as a PDF, headed with your agency if you have set it up in the
        app. Takes a few seconds.
      </p>
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(async () => {
          setError(null)
          const response = await fetch(`/api/v1/inspections/${inspectionId}/pdf`, { method: 'POST' })
          if (!response.ok) {
            setError('Could not make the PDF. Try again in a moment.')
            return
          }
          const { url } = await response.json() as { url: string }
          window.location.assign(url)
        })}
        className="mt-4 rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
      >
        {pending ? 'Preparing PDF…' : 'Download PDF'}
      </button>
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  )
}
