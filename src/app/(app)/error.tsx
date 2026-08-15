'use client'

import Link from 'next/link'
import { useEffect } from 'react'

/// Server actions throw plain errors for the authorization failures in src/lib/auth.ts,
/// and Next serialises those to a generic message in production rather than leaking the
/// text. This gives the agent somewhere to land and a way out, instead of a blank screen
/// mid-handover.
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Unhandled error in app route:', error)
  }, [error])

  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="text-lg font-semibold">Something went wrong</h1>
      <p className="mt-2 text-sm text-gray-600">
        Nothing you captured is lost. Anything still waiting to upload is saved on this
        device and will go up once this page is working again.
      </p>
      {error.digest && (
        <p className="mt-3 font-mono text-xs text-gray-400">Reference {error.digest}</p>
      )}
      <div className="mt-6 flex justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
        >
          All inspections
        </Link>
      </div>
    </div>
  )
}
