'use client'

import { useEffect } from 'react'
import { flushErrorReports, reportError } from '@/lib/error-reporter'

/// Reports errors nothing else caught. Mounted in the (app) layout only, so a landlord
/// reading a shared report never posts to an endpoint they cannot sign in to.
export function ErrorReporter() {
  useEffect(() => {
    // A cross-origin script error and the harmless ResizeObserver loop notice both
    // arrive with no error object and nothing anyone could act on.
    const onError = (event: ErrorEvent) => {
      if (event.error) reportError(event.error, 'window')
    }
    const onRejection = (event: PromiseRejectionEvent) => reportError(event.reason, 'rejection')
    const onOnline = () => void flushErrorReports()

    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)
    window.addEventListener('online', onOnline)
    void flushErrorReports()
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
      window.removeEventListener('online', onOnline)
    }
  }, [])

  return null
}
