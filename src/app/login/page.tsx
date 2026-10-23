import { Suspense } from 'react'
import type { Metadata } from 'next'
import { LoginForm } from '@/components/login-form'
import { messages } from '@/lib/i18n'
import { requestLocale } from '@/lib/i18n/request'

export async function generateMetadata(): Promise<Metadata> {
  return { title: messages(await requestLocale()).web.login.pageTitle }
}

/// In the browser's language. Not the language stored for the `email` a signing link
/// carries: that would tell anyone probing this page which addresses have an account.
export default async function LoginPage() {
  const locale = await requestLocale()
  return (
    <div lang={locale} className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-12">
      <div className="flex items-center gap-2">
        <span className="size-2.5 rounded-full bg-brand-500" />
        <span className="text-sm font-semibold tracking-tight">Kivilo</span>
      </div>
      <h1 className="mt-6 text-xl font-semibold tracking-tight">{messages(locale).web.login.title}</h1>
      <Suspense>
        <LoginForm locale={locale} />
      </Suspense>
    </div>
  )
}
