import { adminUsage } from '@/lib/admin-usage'
import { adminAcquisition } from '@/lib/admin-acquisition'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Usage and errors', robots: { index: false, follow: false } }

export default async function AdminPage() {
  const [data, acquisition] = await Promise.all([adminUsage(), adminAcquisition()])
  const stages = [
    ['Created', data.created], ['Has captures', data.captured], ['Room reviewed', data.reviewed],
    ['Sent for signature', data.sent], ['Countersigned', data.completed],
  ] as const
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Usage and errors</h1>
        <p className="mt-1 text-sm text-gray-500">Last 30 days · {data.active} accounts with recorded screen views</p>
      </div>
      <section>
        <h2 className="mb-3 text-lg font-semibold">Acquisition and conversion</h2>
        <p className="mb-4 text-sm text-gray-500">
          Accounts verified in the last 30 days, with progress observed so far. Older linked accounts are not backfilled.
          {' '}{acquisition.excluded} admin, reviewer or test accounts excluded. Newer accounts have had less time to complete a report or pay.
        </p>
        <p className="mb-4 text-xs text-gray-500">
          Cohort: <time dateTime={acquisition.since.toISOString()}>{acquisition.since.toUTCString()}</time>
          {' '}through <time dateTime={acquisition.until.toISOString()}>{acquisition.until.toUTCString()}</time>.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {([
            ['Verified accounts', acquisition.accounts],
            ['Completed a report after signup', acquisition.completed],
            ['Made a live payment', acquisition.paid],
          ] as const).map(([label, count]) => (
            <div key={label} className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-2xl font-semibold">{count}</p>
              <p className="mt-1 text-xs text-gray-500">{label}</p>
            </div>
          ))}
        </div>
        <p className="my-4 text-sm text-gray-500">
          Report completion belongs to the report&apos;s responsible agent, not its signers. Payment means a successful positive live Stripe payment by the payer;
          trials, comps and test payments are excluded. This is a historical milestone, not current subscription revenue.
          Sources are first-visit browser observations. Missing attribution, including native installs, stays unattributed.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead><tr className="border-b">
              <th className="py-2">Source / medium</th><th>Landing / campaign</th><th>Entry</th>
              <th className="text-right">Accounts</th><th className="text-right">Report completed</th><th className="text-right">Paid</th>
            </tr></thead>
            <tbody>{acquisition.groups.map((group, index) => (
              <tr key={index} className="border-b border-gray-100">
                <td className="py-2 pr-4">{group.source}{group.medium ? ` / ${group.medium}` : ''}</td>
                <td className="pr-4">{group.landing ?? 'Unknown'}{group.campaign ? ` / ${group.campaign}` : ''}</td>
                <td className="pr-4">{group.entryPoint === 'WEB' ? 'Web' : 'Bearer / app'}</td>
                <td className="text-right">{group.accounts}</td><td className="text-right">{group.completed}</td><td className="text-right">{group.paid}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        {acquisition.groups.length === 0 && <p className="mt-3 text-sm text-gray-500">No tracked verified accounts in this cohort yet.</p>}
      </section>
      <section>
        <h2 className="mb-3 text-lg font-semibold">Inspection progress</h2>
        <p className="mb-4 text-sm text-gray-500">Inspections created in the last 30 days, across web and mobile. Each count shows saved progress; captures and reviews can be removed while a report is open.</p>
        <div className="grid gap-3 sm:grid-cols-5">
          {stages.map(([label, count]) => (
            <div key={label} className="rounded-lg border border-gray-200 bg-white p-4">
              <p className="text-2xl font-semibold">{count}</p>
              <p className="mt-1 text-xs text-gray-500">{label}</p>
            </div>
          ))}
        </div>
      </section>
      <section>
        <h2 className="mb-3 text-lg font-semibold">Screen views</h2>
        <p className="mb-3 text-sm text-gray-500">Screen views from web, iOS and Android. Mobile counts begin when the app receives the update.</p>
        <table className="w-full text-left text-sm">
          <thead><tr className="border-b"><th className="py-2">Screen</th><th className="py-2 text-right">Views</th></tr></thead>
          <tbody>{data.screens.map((group, index) => (
            <tr key={index} className="border-b border-gray-100">
              <td className="py-2">{String((group.properties as { screen: string }).screen).replaceAll('_', ' ')}</td>
              <td className="py-2 text-right">{group._count}</td>
            </tr>
          ))}</tbody>
        </table>
        {data.screens.length === 0 && <p className="mt-3 text-sm text-gray-500">No screen events yet.</p>}
      </section>
      <section>
        <h2 className="mb-3 text-lg font-semibold">Frequent errors</h2>
        <table className="w-full text-left text-sm">
          <thead><tr className="border-b"><th className="py-2">Reference</th><th>Source</th><th>Error</th><th className="text-right">Occurrences</th></tr></thead>
          <tbody>{data.errors.map((group) => (
            <tr key={`${group.fingerprint}:${group.source}:${group.name}`} className="border-b border-gray-100">
              <td className="py-2 font-mono text-xs">{group.fingerprint}</td><td>{group.source}</td><td>{group.name}</td><td className="text-right">{group._count}</td>
            </tr>
          ))}</tbody>
        </table>
        {data.errors.length === 0 && <p className="mt-3 text-sm text-gray-500">No errors recorded in this period.</p>}
      </section>
    </div>
  )
}
