import { adminUsage } from '@/lib/admin-usage'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Usage and errors', robots: { index: false, follow: false } }

export default async function AdminPage() {
  const data = await adminUsage()
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
        <p className="mb-3 text-sm text-gray-500">Screen views currently cover the web app. Inspection progress includes every client.</p>
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
