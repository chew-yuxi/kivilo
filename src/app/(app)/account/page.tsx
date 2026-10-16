import Link from 'next/link'
import { requireAgent } from '@/lib/auth'
import { syncCheckoutSession, syncSubscription } from '@/lib/billing'
import { openBillingPortal, startCheckout } from '@/lib/billing-actions'
import { PRO_ACTIVE_PROPERTIES_PER_SEAT, workspacePlan } from '@/lib/plan'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Account' }

/// Prices appear here, on the web, and never in the app: the stores forbid pointing a
/// buyer at an outside purchase. Stripe Checkout and the portal both return here, and
/// this page syncs from Stripe on the way in, so the plan shown is current even when the
/// webhook has not landed yet.
export default async function AccountPage({ searchParams }: PageProps<'/account'>) {
  const agent = await requireAgent()
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
  const date = (value: Date) => value.toLocaleDateString('en-SG', { dateStyle: 'long' })

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
      <p className="mt-1 text-sm text-gray-500">Signed in as {agent.email}</p>

      <section className="mt-8 rounded-lg border border-gray-200 bg-white p-5">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-sm font-semibold">
            {workspace.team ? `${workspace.team.name}'s plan` : 'Your plan'}
          </h2>
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
            {pro ? 'Pro' : 'Free'}
          </span>
        </div>

        <p className="mt-4 text-sm" data-testid="plan-usage">
          {workspace.active} of {workspace.limit} active{' '}
          {workspace.limit === 1 ? 'property' : 'properties'}
        </p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100">
          <div
            className={`h-full rounded-full ${workspace.active >= workspace.limit ? 'bg-red-500' : 'bg-brand-500'}`}
            style={{ width: `${Math.min(100, (workspace.active / workspace.limit) * 100)}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-gray-500">
          A property counts while its tenancy runs, until its check-out is signed.
          {workspace.team && ' Shared by everyone on your team.'}
        </p>

        {pro && subscription && (
          <div className="mt-4 space-y-1 text-sm text-gray-600">
            <p>
              {subscription.seats} {subscription.seats === 1 ? 'seat' : 'seats'}
              {comped && ' · complimentary'}
            </p>
            {subscription.status === 'past_due' && (
              <p className="text-red-600">The last payment failed. We are retrying the card.</p>
            )}
            {subscription.currentPeriodEnd && (
              <p>
                {subscription.cancelAtPeriodEnd ? 'Ends' : 'Renews'} on{' '}
                {date(subscription.currentPeriodEnd)}
              </p>
            )}
          </div>
        )}
        {subscription?.managedBy && subscription.managedById !== agent.id && (
          <p className="mt-4 text-sm text-gray-600">Billing is managed by {subscription.managedBy.name}.</p>
        )}

        {!pro && (
          <p className="mt-4 text-sm leading-relaxed text-gray-600">
            Pro is S$39 per agent each month and includes {PRO_ACTIVE_PROPERTIES_PER_SEAT}{' '}
            active properties for each agent, shared across your team.
          </p>
        )}
        {(managesBilling || (!pro && workspace.isManager)) && (
          <div className="mt-4 flex flex-wrap gap-3">
            {!pro && workspace.isManager && (
              <form action={startCheckout}>
                <button className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">
                  Upgrade to Pro
                </button>
              </form>
            )}
            {managesBilling && (
              <form action={openBillingPortal}>
                <button className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Manage billing
                </button>
              </form>
            )}
          </div>
        )}
      </section>

      <section className="mt-6 text-sm">
        <Link href="/delete-account" className="text-gray-500 hover:underline">
          Delete your account
        </Link>
      </section>
    </div>
  )
}
