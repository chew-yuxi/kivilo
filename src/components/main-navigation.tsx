'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function MainNavigation({ label, properties, work, team }: {
  label: string
  properties: string
  work: string
  team: string
}) {
  const pathname = usePathname()
  return (
    <nav aria-label={label} className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-5xl gap-2 overflow-x-auto px-4 sm:px-6">
        {([['/properties', properties], ['/inspections', work], ['/team', team]] as const).map(([href, text]) => (
          <Link key={href} href={href} className="nav-tab"
            aria-current={pathname === href ? 'page' : pathname.startsWith(href + '/') ? 'location' : undefined}>
            {text}
          </Link>
        ))}
      </div>
    </nav>
  )
}
