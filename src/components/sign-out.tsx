'use client'

import { useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase/client'

/// `then` is where to go after: the login page by default, or the login page set up to
/// come back, as when someone opens a signing link while signed in as someone else.
export function SignOut({ email, then = '/login' }: { email: string | null; then?: string }) {
  const [busy, setBusy] = useState(false)

  return (
    <div className="flex items-center gap-3">
      {email && <span className="hidden text-xs text-gray-500 sm:inline">{email}</span>}
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true)
          await supabaseBrowser().auth.signOut()
          // A full load, as sign-in does: the client router still holds signed-in pages,
          // and Back would show them from that cache.
          window.location.replace(then)
        }}
        className="text-xs text-gray-500 hover:text-gray-900 disabled:opacity-50"
      >
        Sign out
      </button>
    </div>
  )
}
