'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase/client'

export function SignOut({ email }: { email: string | null }) {
  const router = useRouter()
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
          router.replace('/login')
          router.refresh()
        }}
        className="text-xs text-gray-500 hover:text-gray-900 disabled:opacity-50"
      >
        Sign out
      </button>
    </div>
  )
}
