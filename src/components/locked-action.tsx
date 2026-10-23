'use client'

import { useState } from 'react'

/// Every action stays visible to everyone working a property; the ones this person may
/// not do explain who can, instead of disappearing. The server still refuses them on its
/// own, so this is guidance and never the control.
export function LockedAction({
  label,
  who,
  askNames,
  className = 'action-secondary',
}: {
  label: string
  /// Who is allowed, e.g. "the responsible agent or a team owner or manager".
  who: string
  askNames: string[]
  className?: string
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="space-y-2">
      <button type="button" className={className} aria-expanded={open} onClick={() => setOpen(!open)}>
        {label}
      </button>
      {open && (
        <p className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700" role="status">
          Only {who} can do this.{askNames.length > 0 && ` Ask ${listNames(askNames)}.`}
        </p>
      )}
    </div>
  )
}

export function listNames(names: string[]) {
  if (names.length <= 1) return names.join('')
  return `${names.slice(0, -1).join(', ')} or ${names[names.length - 1]}`
}
