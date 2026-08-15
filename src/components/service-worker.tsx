'use client'

import { useEffect, useState } from 'react'

type InstallPromptEvent = Event & { prompt: () => Promise<void> }

export function ServiceWorker() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null)

  useEffect(() => {
    // Development only ever registered it to be confusing: dev asset filenames are
    // stable, so the cache-first rule served yesterday's CSS and JS. Offline capture
    // does not depend on the worker anyway, since the queue lives in IndexedDB.
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      const build = process.env.NEXT_PUBLIC_BUILD_ID || 'unknown'
      navigator.serviceWorker.register(`/sw.js?v=${build}`).catch((error) => {
        // A failed registration costs offline page loads, not captures, which are
        // already safe in IndexedDB. Don't take the app down over it.
        console.error('Service worker registration failed:', error)
      })
    }

    const onPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as InstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  if (!installPrompt) return null

  return (
    <button
      type="button"
      onClick={() => {
        void installPrompt.prompt()
        setInstallPrompt(null)
      }}
      className="rounded-full border border-gray-300 px-3 py-1 text-xs font-medium hover:border-brand-500 hover:text-brand-600"
    >
      Install app
    </button>
  )
}
