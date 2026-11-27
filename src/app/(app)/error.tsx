'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { reportError } from '@/lib/error-reporter'

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
    reportError(error, 'boundary')
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
      <div className="action-group mt-6 justify-center">
        <button
          type="button"
          onClick={reset}
          className="action-primary"
        >
          Try again
        </button>
        <Link
          href="/inspections"
          className="action-secondary"
        >
          All inspections
        </Link>
      </div>
    </div>
  )
}
