'use client'

import { createContext, useContext } from 'react'
import { messages, type Locale } from '@/lib/i18n'

const LocaleContext = createContext<Locale>('en')

/// The agent's language for every client component under `(app)`, set once by the
/// layout from their stored choice or their browser's.
export function LocaleProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleContext value={locale}>{children}</LocaleContext>
}

export function useLocale() {
  return useContext(LocaleContext)
}

/// The web app's words in the agent's language.
export function usePwa() {
  return messages(useLocale()).pwa
}
