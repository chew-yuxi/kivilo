'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase/client'

/// A six digit code rather than a magic link. A link opens the phone's default browser,
/// which for an installed PWA means the agent lands in Safari instead of the app they
/// were just using, with no session in the app itself. A code keeps them where they are.
export function LoginForm() {
  const router = useRouter()
  const next = useSearchParams().get('next') || '/inspections'

  const [stage, setStage] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function sendCode(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await supabaseBrowser().auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    })
    setBusy(false)
    if (error) return setError(error.message)
    setStage('code')
  }

  async function verify(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await supabaseBrowser().auth.verifyOtp({
      email,
      token: code.trim(),
      type: 'email',
    })
    setBusy(false)
    if (error) return setError('That code is not right, or it has expired. Check the email or request a new one.')

    // Full navigation so the server picks up the new session cookie.
    router.replace(next)
    router.refresh()
  }

  return (
    <form onSubmit={stage === 'email' ? sendCode : verify} className="mt-8 space-y-4">
      <label className="block text-xs font-medium text-gray-600">
        Email
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          disabled={stage === 'code'}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-normal focus:border-brand-500 focus:outline-none disabled:bg-gray-50 disabled:text-gray-500"
        />
      </label>

      {stage === 'code' && (
        <p className="text-sm text-gray-500">
          Sent to <span className="font-medium text-gray-700">{email}</span>. It can take a
          minute; check spam if it does not arrive.
        </p>
      )}

      {stage === 'code' && (
        <label className="block text-xs font-medium text-gray-600">
          Six digit code
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-lg tracking-widest focus:border-brand-500 focus:outline-none"
          />
        </label>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-md bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
      >
        {busy ? 'Working…' : stage === 'email' ? 'Email me a code' : 'Sign in'}
      </button>

      {stage === 'code' && (
        <button
          type="button"
          onClick={() => {
            setStage('email')
            setCode('')
            setError(null)
          }}
          className="w-full text-xs text-gray-500 hover:underline"
        >
          Use a different email
        </button>
      )}
    </form>
  )
}
