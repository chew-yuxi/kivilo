import Link from 'next/link'
import { ViewTabs } from '@/components/view-tabs'
import { requireAgent } from '@/lib/auth'
import { agencyList } from '@/lib/agency'
import { syncCheckoutSession, syncSubscription } from '@/lib/billing'
import { openBillingPortal, startCheckout } from '@/lib/billing-actions'
import { PRO_ACTIVE_PROPERTIES_PER_SEAT, subscriptionCanResume, workspacePlan } from '@/lib/plan'
import { checkoutOpen } from '@/lib/stripe'
import { SignOut } from '@/components/sign-out'
import { languagePilotEnabled } from '@/lib/i18n'
import { LanguageSelect } from '@/components/language-select'
import { formatDate, messages } from '@/lib/i18n'
import { requestLocale } from '@/lib/i18n/request'

const SUPPORT = 'hello@nottoosweetlabs.com'

export const dynamic = 'force-dynamic'
export async function generateMetadata() {
  return { title: messages(await requestLocale(await requireAgent())).pwa.account }
}

/// Stripe Checkout and the portal both return here, and
/// this page syncs from Stripe on the way in, so the plan shown is current even when the
/// webhook has not landed yet.
export default async function AccountPage({ searchParams }: PageProps<'/account'>) {
  const agent = await requireAgent()
  const m = messages(await requestLocale(agent))
  const w = m.pwa
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

      {agencies.length > 0 && (
        <ViewTabs label={w.billingWorkspace} className="mt-8">
          <Link href="/account" aria-current={!agencyId ? 'page' : undefined}>{w.personal}</Link>
          {agencies.map((agency) => (
            <Link key={agency.id} href={`/account?agencyId=${encodeURIComponent(agency.id)}`} aria-current={agencyId === agency.id ? 'page' : undefined}>
              {agency.name}
            </Link>
          ))}
        </ViewTabs>
      )}

      {languagePilotEnabled() && (
        <section className="mt-8 rounded-lg border border-gray-200 bg-white p-5">
          <LanguageSelect />
        </section>
      )}

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
        <p className="mt-2 text-xs text-gray-500">{w.planCounts}{workspace.team && ' Shared by everyone on this team.'}
        </p>

        {pro && subscription && (
          <div className="mt-4 space-y-1 text-sm text-gray-600">
            <p>
              {w.seats(subscription.seats)}
              {comped && ` · ${w.complimentary}`}
              {play && ' · paid through Google Play'}
              {apple && ' · paid through the App Store'}
            </p>
            {(subscription.status === 'past_due' || subscription.status === 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD') && (
              <p className="text-red-600">{w.theLastPaymentFailedYourPaymentProvider}</p>
            )}
            {subscription.currentPeriodEnd && (
              <p>
                {w.renewsOn(subscription.cancelAtPeriodEnd, date(subscription.currentPeriodEnd))}
              </p>
            )}
          </div>
        )}
        {agencyId && !workspace.isManager && !subscription?.managedBy && (
          <p className="mt-4 text-sm text-gray-600">{w.aTeamOwnerOrManagerCanSubscribe}</p>
        )}
        {subscription?.managedBy && subscription.managedById !== agent.id && (
          <p className="mt-4 text-sm text-gray-600">{w.billingManagedBy(subscription.managedBy.name)}</p>
        )}

        {workspace.team && <p className="mt-3 text-sm text-gray-600">{workspace.seatsNeeded} {w.activeTeam} {workspace.seatsNeeded === 1 ? w.member : w.members}.</p>}
        {workspace.needsMoreSeats && <p className="mt-3 text-sm text-red-600">{w.addASeatForEveryActiveTeam}</p>}
        {playCanResume && !pro && <p className="mt-4 text-sm text-gray-600">{w.resolveOrResumeThisSubscriptionInGoogle}</p>}
        {appleCanResume && !pro && <p className="mt-4 text-sm text-gray-600">{w.resolveOrResumeThisSubscriptionInThe}</p>}
        {!pro && !playCanResume && !appleCanResume && (
          <p className="mt-4 text-sm leading-relaxed text-gray-600">{w.proIsS39PerAgentEach} {PRO_ACTIVE_PROPERTIES_PER_SEAT}{' '}{w.activePropertiesForEachAgent}{workspace.team ? w.sharedAcrossThisTeam : ''}.
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
        {(managesBilling || canCheckout || ((play || apple) && workspace.isManager)) && (
          <div className="mt-4 flex flex-wrap gap-3">
            {canCheckout && (
              <form action={startCheckout} className="space-y-3">
                <input type="hidden" name="agencyId" value={agencyId ?? 'personal'} />
                {workspace.team && (
                  <label className="block text-sm text-gray-700">{w.seatsAtS39EachMonth}<input className="ml-3 w-20 rounded-md border border-gray-300 px-2 py-1" type="number" name="seats" min={workspace.seatsNeeded} max={1000} defaultValue={workspace.seatsNeeded} required />
                  </label>
                )}
                <button className="action-primary">
                  {w.upgradeToPro}
                </button>
              </form>
            )}
            {play && workspace.isManager && (
              <a href="https://play.google.com/store/account/subscriptions" target="_blank" rel="noopener noreferrer" className="action-secondary">{w.manageInGooglePlay}</a>
            )}
            {apple && workspace.isManager && (
              <a href="https://apps.apple.com/account/subscriptions" target="_blank" rel="noopener noreferrer" className="action-secondary">{w.manageInTheAppStore}</a>
            )}
            {managesBilling && (
              <form action={openBillingPortal}>
                <input type="hidden" name="agencyId" value={agencyId ?? 'personal'} />
                <button className="action-secondary">
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
