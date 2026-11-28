'use client'

import Link from 'next/link'
import { ViewTabs } from '@/components/view-tabs'
import { usePathname } from 'next/navigation'

export function MainNavigation({ label, properties, work, team }: {
  label: string
  properties: string
  work: string
  team: string
}) {
  const pathname = usePathname()
  return (
    <div className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <ViewTabs label={label} className="border-b-0">
          {([['/properties', properties], ['/inspections', work], ['/team', team]] as const).map(([href, text]) => (
            <Link key={href} href={href}
              aria-current={pathname === href ? 'page' : pathname.startsWith(href + '/') ? 'location' : undefined}>
              {text}
            </Link>
          ))}
        </ViewTabs>
      </div>
    </div>
  )
}
