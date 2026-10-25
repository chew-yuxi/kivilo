import { Suspense } from 'react'
import { LoginForm } from '@/components/login-form'

export const metadata = { title: 'Welcome to Kivilo' }

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-gray-50 px-5 py-10 sm:py-16" aria-labelledby="welcome-title">
      <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white px-6 py-8 sm:p-10">
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-[11.2px] bg-brand-500" aria-hidden="true">
            <span className="size-[14.4px] rounded-full bg-white" />
          </span>
          <span className="text-3xl font-extrabold tracking-[-1.2px]">kivilo</span>
        </div>
        <h1 id="welcome-title" className="mt-9 text-[32px] leading-tight font-semibold tracking-tight sm:text-4xl">Welcome to Kivilo</h1>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  )
}
