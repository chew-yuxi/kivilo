import Link from 'next/link'
import { requireAgent } from '@/lib/auth'
import { agencyList } from '@/lib/agency'
import { syncCheckoutSession, syncSubscription } from '@/lib/billing'
import { openBillingPortal, startCheckout } from '@/lib/billing-actions'
import { PRO_ACTIVE_PROPERTIES_PER_SEAT, subscriptionCanResume, workspacePlan } from '@/lib/plan'
import { checkoutOpen } from '@/lib/stripe'
import { SignOut } from '@/components/sign-out'

const SUPPORT = 'hello@nottoosweetlabs.com'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Account' }

/// Stripe Checkout and the portal both return here, and
/// this page syncs from Stripe on the way in, so the plan shown is current even when the
/// webhook has not landed yet.
export default async function AccountPage({ searchParams }: PageProps<'/account'>) {
  const agent = await requireAgent()
  const { checkout, billing, agencyId: selectedAgency } = await searchParams
  const agencyId = typeof selectedAgency === 'string' && selectedAgency !== 'personal' ? selectedAgency : null
  const { agencies } = await agencyList(agent.id)
  if (typeof checkout === 'string') {
    await syncCheckoutSession(checkout)
  } else if (billing === 'returned') {
    const { subscription } = await workspacePlan(agent, agencyId)
    if (subscription?.stripeSubscriptionId) await syncSubscription(subscription.stripeSubscriptionId)
  }

  const workspace = await workspacePlan(agent, agencyId)
  const { subscription } = workspace
  const pro = workspace.plan === 'PRO'
  const comped = subscription?.status === 'comped'
  const play = !!subscription?.googlePlayPurchaseId
  const apple = !!subscription?.applePurchaseId
  const playCanResume = play && subscriptionCanResume(subscription!)
  const appleCanResume = apple && subscriptionCanResume(subscription!)
  const canCheckout = !pro && !playCanResume && !appleCanResume && workspace.isManager && checkoutOpen()
  // Strictly the payer: the portal shows their card and invoices.
  const managesBilling = !play && !apple && !!subscription?.stripeCustomerId && subscription.managedById === agent.id && workspace.isManager
  const date = (value: Date) => value.toLocaleDateString('en-SG', { dateStyle: 'long' })

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
      <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
        <span>Signed in as {agent.email}</span>
        {/* The header keeps this on wider screens only; on a phone it lives here. */}
        <SignOut email={null} />
      </div>

      <div className="mt-6 space-y-3">
        <Link href="/team" className="nav-row">
          <span>Team members and invitations</span><span aria-hidden="true">›</span>
        </Link>
        <Link href="/properties" className="nav-row">
          <span>Properties and archived work</span><span aria-hidden="true">›</span>
        </Link>
      </div>

      {agencies.length > 0 && (
        <nav aria-label="Billing workspace" className="mt-8 flex flex-wrap gap-2">
          <Link href="/account" aria-current={!agencyId ? 'page' : undefined} className={`rounded-full border px-3 py-1.5 text-sm ${!agencyId ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-300'}`}>Personal</Link>
          {agencies.map((agency) => (
            <Link key={agency.id} href={`/account?agencyId=${encodeURIComponent(agency.id)}`} aria-current={agencyId === agency.id ? 'page' : undefined} className={`rounded-full border px-3 py-1.5 text-sm ${agencyId === agency.id ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-300'}`}>
              {agency.name}
            </Link>
          ))}
        </nav>
      )}

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
          {workspace.team && ' Shared by everyone on this team.'}
        </p>

        {pro && subscription && (
          <div className="mt-4 space-y-1 text-sm text-gray-600">
            <p>
              {subscription.seats} {subscription.seats === 1 ? 'seat' : 'seats'}
              {comped && ' · complimentary'}
              {play && ' · paid through Google Play'}
              {apple && ' · paid through the App Store'}
            </p>
            {(subscription.status === 'past_due' || subscription.status === 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD') && (
              <p className="text-red-600">The last payment failed. Your payment provider is retrying it.</p>
            )}
            {subscription.currentPeriodEnd && (
              <p>
                {subscription.cancelAtPeriodEnd ? 'Ends' : 'Renews'} on{' '}
                {date(subscription.currentPeriodEnd)}
              </p>
            )}
          </div>
        )}
        {agencyId && !workspace.isManager && !subscription?.managedBy && (
          <p className="mt-4 text-sm text-gray-600">A team owner or manager can subscribe for this team.</p>
        )}
        {subscription?.managedBy && subscription.managedById !== agent.id && (
          <p className="mt-4 text-sm text-gray-600">Billing is managed by {subscription.managedBy.name}.</p>
        )}

        {workspace.team && <p className="mt-3 text-sm text-gray-600">{workspace.seatsNeeded} active team {workspace.seatsNeeded === 1 ? 'member' : 'members'}.</p>}
        {workspace.needsMoreSeats && <p className="mt-3 text-sm text-red-600">Add a seat for every active team member before adding more properties. Existing work stays available.</p>}
        {playCanResume && !pro && <p className="mt-4 text-sm text-gray-600">Resolve or resume this subscription in Google Play to restore Pro.</p>}
        {appleCanResume && !pro && <p className="mt-4 text-sm text-gray-600">Resolve or resume this subscription in the App Store to restore Pro.</p>}
        {!pro && !playCanResume && !appleCanResume && (
          <p className="mt-4 text-sm leading-relaxed text-gray-600">
            Pro is S$39 per agent each month and includes {PRO_ACTIVE_PROPERTIES_PER_SEAT}{' '}
            active properties for each agent{workspace.team ? ', shared across this team' : ''}.
            {!checkoutOpen() && (
              <>
                {' '}To move to Pro, email{' '}
                <a href={`mailto:${SUPPORT}?subject=Kivilo%20Pro`} className="text-brand-600 underline">
                  {SUPPORT}
                </a>
                .
              </>
            )}
          </p>
        )}
        {(managesBilling || canCheckout || ((play || apple) && workspace.isManager)) && (
          <div className="mt-4 flex flex-wrap gap-3">
            {canCheckout && (
              <form action={startCheckout} className="space-y-3">
                <input type="hidden" name="agencyId" value={agencyId ?? 'personal'} />
                {workspace.team && (
                  <label className="block text-sm text-gray-700">
                    Seats at S$39 each / month
                    <input className="ml-3 w-20 rounded-md border border-gray-300 px-2 py-1" type="number" name="seats" min={workspace.seatsNeeded} max={1000} defaultValue={workspace.seatsNeeded} required />
                  </label>
                )}
                <button className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">
                  Upgrade to Pro
                </button>
              </form>
            )}
            {play && workspace.isManager && (
              <a href="https://play.google.com/store/account/subscriptions" target="_blank" rel="noopener noreferrer" className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Manage in Google Play</a>
            )}
            {apple && workspace.isManager && (
              <a href="https://apps.apple.com/account/subscriptions" target="_blank" rel="noopener noreferrer" className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Manage in the App Store</a>
            )}
            {managesBilling && (
              <form action={openBillingPortal}>
                <input type="hidden" name="agencyId" value={agencyId ?? 'personal'} />
                <button className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Manage billing
                </button>
              </form>
            )}
          </div>
        )}
      </section>

      <section className="mt-6 text-sm">
        <Link href="/delete-account" className="action-danger">
          Delete your account
        </Link>
      </section>
    </div>
  )
}
