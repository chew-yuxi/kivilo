'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import {
  ACQUISITION_COOKIE,
  ACQUISITION_MAX_AGE_SECONDS,
  acquisitionTouchForEntry,
  parseAcquisitionCookie,
} from '../../src/lib/acquisition-keys'

// A first-party cookie carries only the finite categories to the browser app.
// Native store installs and the old app host have no attribution transport.
export function captureAcquisition() {
  if (window.location.origin !== 'https://kivilo.app') return
  try {
    const raw = document.cookie.split(';').map(part => part.trim())
      .find(part => part.startsWith(`${ACQUISITION_COOKIE}=`))
      ?.slice(ACQUISITION_COOKIE.length + 1)
    // Preserve both the first touch and its expiry; navigation never renews it.
    if (parseAcquisitionCookie(raw)) return
    const touch = acquisitionTouchForEntry({
      origin: window.location.origin,
      pathname: window.location.pathname,
      search: window.location.search,
      referrer: document.referrer,
    })
    if (!touch) return
    document.cookie = `${ACQUISITION_COOKIE}=${encodeURIComponent(JSON.stringify(touch))}; Domain=kivilo.app; Path=/; Max-Age=${ACQUISITION_MAX_AGE_SECONDS}; SameSite=Lax; Secure`
  } catch (error) {
    // Some browser privacy settings deny cookie access instead of ignoring writes.
    // Attribution is optional and must not stop a visitor from using the website.
    if (error instanceof DOMException && (error.name === 'SecurityError' || error.name === 'QuotaExceededError')) return
    throw error
  }
}

export function AcquisitionCapture() {
  const pathname = usePathname()
  useEffect(() => { captureAcquisition() }, [pathname])
  return null
}
