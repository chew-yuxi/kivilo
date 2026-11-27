'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setLanguage } from '@/lib/language-actions'
import { useLocale, usePwa } from '@/components/locale'

/// Each language in its own words, so it can be found by someone who cannot read the
/// current one.
const NAMES = { en: 'English', zh: '中文（简体）', th: 'ไทย' } as const

export function LanguageSelect() {
  const w = usePwa()
  const locale = useLocale()
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  return (
    <label className="block text-sm">
      <span className="font-medium">{w.language}</span>
      <select
        value={locale}
        disabled={pending}
        onChange={(event) => {
          const next = event.target.value
          startTransition(async () => {
            await setLanguage(next)
            router.refresh()
          })
        }}
        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
      >
        {Object.entries(NAMES).map(([code, name]) => <option key={code} value={code}>{name}</option>)}
      </select>
      <span className="mt-1 block text-xs text-gray-500">{w.languageNote}</span>
    </label>
  )
}
