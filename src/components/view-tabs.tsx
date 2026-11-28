'use client'

import { useLayoutEffect, useRef, type ReactNode } from 'react'

/** Links keep their URLs and keyboard behaviour. Only the moving mark needs measurement. */
export function ViewTabs({ label, children, className = '' }: {
  label: string
  children: ReactNode
  className?: string
}) {
  const strip = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const row = strip.current!
    const viewport = row.parentElement!
    const current = row.querySelector<HTMLElement>('a[aria-current]')
    if (!current) {
      delete row.dataset.measured
      return
    }

    const align = () => {
      const left = current.offsetLeft
      const right = left + current.offsetWidth
      row.style.setProperty('--tab-center', `${(left + right) / 2}px`)
      row.dataset.measured = 'true'
      // Leave a couple of pixels at the edge for fractional text widths on phones.
      if (left < viewport.scrollLeft + 2) viewport.scrollLeft = left - 2
      else if (right > viewport.scrollLeft + viewport.clientWidth - 2) viewport.scrollLeft = right - viewport.clientWidth + 2
    }
    align()
    const observer = new ResizeObserver(align)
    observer.observe(viewport)
    for (const link of row.querySelectorAll('a')) observer.observe(link)
    return () => observer.disconnect()
  }, [children])

  return (
    <nav aria-label={label} className={`view-tabs ${className}`}>
      <div ref={strip} className="view-tab-strip">{children}</div>
    </nav>
  )
}
