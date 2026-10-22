import Link from 'next/link'
import { UploadQueueProvider, QueueStatus } from '@/components/upload-queue'
import { ServiceWorker } from '@/components/service-worker'
import { ErrorReporter } from '@/components/error-reporter'
import { ProductEventReporter } from '@/components/product-event-reporter'
import { isAdmin } from '@/lib/admin'
import { SignOut } from '@/components/sign-out'
import { requireAgent } from '@/lib/auth'

/// Everything an inspector sees. Shared reports live outside this group and get none
/// of it, so a landlord following a link never meets the upload queue or an install
/// prompt for an app they have no reason to install.
export default async function AppLayout({ children }: LayoutProps<'/'>) {
  const agent = await requireAgent()

  return (
    <UploadQueueProvider>
      <ErrorReporter />
      <ProductEventReporter owner={agent.id} />
      <div className="app-shell flex min-h-full flex-col bg-gray-50">
        <header className="border-b border-gray-200 bg-white">
          <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4 sm:px-6">
            <Link href="/inspections" className="flex min-h-11 items-center gap-2">
              <span className="size-2.5 rounded-full bg-brand-500" />
              <span className="text-sm font-semibold tracking-tight">Kivilo</span>
            </Link>
            <span className="hidden text-sm text-gray-400 sm:inline">Check-in / check-out</span>
            <div className="ml-auto flex items-center gap-3">
              <QueueStatus />
              {isAdmin(agent.email) && <Link href="/admin" className="text-link inline-flex min-h-11 items-center text-xs">Admin</Link>}
              <ServiceWorker />
              <Link href="/account" className="action-secondary px-3 text-xs">
                Account
              </Link>
              {/* A phone header has room for the way home and Account; signing out,
                  done rarely, is on the Account page. */}
              <div className="hidden sm:block">
                <SignOut email={agent.email} />
              </div>
            </div>
          </div>
        </header>
        <nav aria-label="Workspace" className="border-b border-gray-200 bg-white">
          <div className="mx-auto flex max-w-5xl flex-wrap gap-2 px-4 py-2 sm:px-6">
            <Link href="/inspections" className="action-secondary">My work</Link>
            <Link href="/team" className="action-secondary">Team</Link>
            <Link href="/properties" className="action-secondary">Properties</Link>
          </div>
        </nav>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-10">{children}</main>
      </div>
    </UploadQueueProvider>
  )
}
