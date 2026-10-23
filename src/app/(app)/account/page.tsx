import Link from 'next/link'
import { requireAgent } from '@/lib/auth'
import { syncCheckoutSession, syncSubscription } from '@/lib/billing'
import { openBillingPortal, startCheckout } from '@/lib/billing-actions'
import { PRO_ACTIVE_PROPERTIES_PER_SEAT, workspacePlan } from '@/lib/plan'
import { checkoutOpen } from '@/lib/stripe'
import { SignOut } from '@/components/sign-out'
import { LanguageSelect } from '@/components/language-select'
import { formatDate, messages } from '@/lib/i18n'
import { requestLocale } from '@/lib/i18n/request'

const SUPPORT = 'hello@nottoosweetlabs.com'

export const dynamic = 'force-dynamic'
export async function generateMetadata() {
  return { title: messages(await requestLocale(await requireAgent())).pwa.account }
}

/// Prices appear here, on the web, and never in the app: the stores forbid pointing a
/// buyer at an outside purchase. Stripe Checkout and the portal both return here, and
/// this page syncs from Stripe on the way in, so the plan shown is current even when the
/// webhook has not landed yet.
export default async function AccountPage({ searchParams }: PageProps<'/account'>) {
  const agent = await requireAgent()
  const m = messages(await requestLocale(agent))
  const w = m.pwa
  const { checkout, billing } = await searchParams
  if (typeof checkout === 'string') {
    await syncCheckoutSession(checkout)
  } else if (billing === 'returned') {
    const { subscription } = await workspacePlan(agent)
    if (subscription?.stripeSubscriptionId) await syncSubscription(subscription.stripeSubscriptionId)
  }

  const workspace = await workspacePlan(agent)
  const { subscription } = workspace
  const pro = workspace.plan === 'PRO'
  const comped = subscription?.status === 'comped'
  // Strictly the payer: the portal shows their card and invoices.
  const managesBilling = !!subscription?.stripeCustomerId && subscription.managedById === agent.id
  const date = (value: Date) => formatDate(m, value, { dateStyle: 'long' })

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-semibold tracking-tight">{w.account}</h1>
      <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
        <span>{w.signedInAs(agent.email ?? agent.name)}</span>
        {/* The header keeps this on wider screens only; on a phone it lives here. */}
        <SignOut email={null} />
      </div>

      <div className="mt-6 space-y-3">
        <Link href="/team" className="nav-row">
          <span>{w.teamMembersInvitations}</span><span aria-hidden="true">›</span>
        </Link>
        <Link href="/properties" className="nav-row">
          <span>{w.propertiesArchived}</span><span aria-hidden="true">›</span>
        </Link>
      </div>

      <section className="mt-8 rounded-lg border border-gray-200 bg-white p-5">
        <LanguageSelect />
      </section>

      <section className="mt-6 rounded-lg border border-gray-200 bg-white p-5">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-sm font-semibold">
            {workspace.team ? w.teamPlan(workspace.team.name) : w.yourPlan}
          </h2>
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
            {pro ? 'Pro' : w.free}
          </span>
        </div>

        <p className="mt-4 text-sm" data-testid="plan-usage">
          {w.planUsage(workspace.active, workspace.limit)}
        </p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100">
          <div
            className={`h-full rounded-full ${workspace.active >= workspace.limit ? 'bg-red-500' : 'bg-brand-500'}`}
            style={{ width: `${Math.min(100, (workspace.active / workspace.limit) * 100)}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-gray-500">
          {w.planCounts}
          {workspace.team && ` ${w.planShared}`}
        </p>

        {pro && subscription && (
          <div className="mt-4 space-y-1 text-sm text-gray-600">
            <p>
              {w.seats(subscription.seats)}
              {comped && ` · ${w.complimentary}`}
            </p>
            {subscription.status === 'past_due' && (
              <p className="text-red-600">{w.paymentFailed}</p>
            )}
            {subscription.currentPeriodEnd && (
              <p>
                {w.renewsOn(subscription.cancelAtPeriodEnd, date(subscription.currentPeriodEnd))}
              </p>
            )}
          </div>
        )}
        {subscription?.managedBy && subscription.managedById !== agent.id && (
          <p className="mt-4 text-sm text-gray-600">{w.billingManagedBy(subscription.managedBy.name)}</p>
        )}

        {!pro && (
          <p className="mt-4 text-sm leading-relaxed text-gray-600">
            {w.proPrice(PRO_ACTIVE_PROPERTIES_PER_SEAT)}
            {!checkoutOpen() && (
              <>
                {' '}{w.emailToUpgrade}{' '}
                <a href={`mailto:${SUPPORT}?subject=Kivilo%20Pro`} className="text-brand-600 underline">
                  {SUPPORT}
                </a>
                .
              </>
            )}
          </p>
        )}
        {(managesBilling || (!pro && workspace.isManager && checkoutOpen())) && (
          <div className="mt-4 flex flex-wrap gap-3">
            {!pro && workspace.isManager && checkoutOpen() && (
              <form action={startCheckout}>
                <button className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">
                  {w.upgradeToPro}
                </button>
              </form>
            )}
            {managesBilling && (
              <form action={openBillingPortal}>
                <button className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  {w.manageBilling}
                </button>
              </form>
            )}
          </div>
        )}
      </section>

      <section className="mt-6 text-sm">
        <Link href="/delete-account" className="action-danger">
          {w.deleteAccount}
        </Link>
      </section>
    </div>
  )
}
