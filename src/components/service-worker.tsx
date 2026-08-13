'use client'

import { useEffect, useState } from 'react'

type InstallPromptEvent = Event & { prompt: () => Promise<void> }

export function ServiceWorker() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null)

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((error) => {
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
