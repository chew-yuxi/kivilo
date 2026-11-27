'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { reportError } from '@/lib/error-reporter'
import { usePwa } from '@/components/locale'

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
  const w = usePwa()
  useEffect(() => {
    console.error('Unhandled error in app route:', error)
    reportError(error, 'boundary')
  }, [error])

  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="text-lg font-semibold">{w.somethingWrong}</h1>
      <p className="mt-2 text-sm text-gray-600">
        {w.nothingLost}
      </p>
      {error.digest && (
        <p className="mt-3 font-mono text-xs text-gray-400">{w.reference(error.digest)}</p>
      )}
      <div className="mt-6 flex justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          {w.tryAgain}
        </button>
        <Link
          href="/inspections"
          className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
        >
          {w.allInspectionsLink}
        </Link>
      </div>
    </div>
  )
}
