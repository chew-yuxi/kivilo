'use client'

import { useEffect, useState, type ReactNode } from 'react'
import styles from '../app/landing.module.css'

export function LandingHeader({ children }: { children: ReactNode }) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const updateScrolled = () => setScrolled(window.scrollY > 0)
    updateScrolled()
    window.addEventListener('scroll', updateScrolled, { passive: true })
    return () => window.removeEventListener('scroll', updateScrolled)
  }, [])

  return (
    <header className={`${styles.stickyHeader} ${scrolled ? styles.headerScrolled : ''}`}>
      <div className={styles.header}>{children}</div>
    </header>
  )
}
