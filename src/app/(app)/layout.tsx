import Link from 'next/link'
import { UploadQueueProvider } from '@/components/upload-queue'
import { ServiceWorker } from '@/components/service-worker'
import { SignOut } from '@/components/sign-out'
import { requireAgent } from '@/lib/auth'

/// Everything an inspector sees. Shared reports live outside this group and get none
/// of it, so a landlord following a link never meets the upload queue or an install
/// prompt for an app they have no reason to install.
export default async function AppLayout({ children }: LayoutProps<'/'>) {
  const agent = await requireAgent()

  return (
    <UploadQueueProvider>
      <div className="flex min-h-full flex-col bg-gray-50">
        <header className="border-b border-gray-200 bg-white">
          <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4 sm:px-6">
            <Link href="/inspections" className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-brand-500" />
              <span className="text-sm font-semibold tracking-tight">Kivilo</span>
            </Link>
            <span className="hidden text-sm text-gray-400 sm:inline">Check-in / check-out</span>
            <div className="ml-auto flex items-center gap-3">
              <ServiceWorker />
              <SignOut email={agent.email} />
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-24 sm:px-6 sm:py-10">{children}</main>
      </div>
    </UploadQueueProvider>
  )
}
