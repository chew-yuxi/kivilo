'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/// Extraction runs in the background after the response is sent, so the page has to
/// come back and look. Refreshing the server component is enough — the status lives
/// on the inspection row.
export function ProcessingPoller({ intervalMs = 5000 }: { intervalMs?: number }) {
  const router = useRouter()

  useEffect(() => {
    const timer = setInterval(() => router.refresh(), intervalMs)
    return () => clearInterval(timer)
  }, [router, intervalMs])

  return (
    <div className="mx-auto mt-6 h-1 w-40 overflow-hidden rounded-full bg-gray-200">
      <div className="h-full w-1/3 animate-[slide_1.4s_ease-in-out_infinite] rounded-full bg-brand-500" />
      <style>{`@keyframes slide { 0% { transform: translateX(-100%) } 100% { transform: translateX(300%) } }`}</style>
    </div>
  )
}
