import { Suspense } from 'react'
import { LoginForm } from '@/components/login-form'

export const metadata = { title: 'Sign in to Kivilo' }

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-12">
      <div className="flex items-center gap-2">
        <span className="size-2.5 rounded-full bg-brand-500" />
        <span className="text-sm font-semibold tracking-tight">Kivilo</span>
      </div>
      <h1 className="mt-6 text-xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-1 text-sm text-gray-500">
        We send a six digit code to your email. No password to remember on site.
      </p>
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  )
}
