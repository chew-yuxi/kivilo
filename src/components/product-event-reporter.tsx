'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { screenForPath } from '@/lib/product-event-keys'
import { flushProductEvents, reportScreen } from '@/lib/product-event-reporter'

export function ProductEventReporter({ owner }: { owner: string }) {
  const pathname = usePathname()
  const previous = useRef<string | null>(null)
  useEffect(() => {
    const screen = screenForPath(pathname)
    if (screen && previous.current !== pathname) reportScreen(owner, screen)
    previous.current = pathname
  }, [owner, pathname])
  useEffect(() => {
    const flush = () => void flushProductEvents(owner)
    window.addEventListener('online', flush)
    flush()
    return () => window.removeEventListener('online', flush)
  }, [owner])
  return null
}
