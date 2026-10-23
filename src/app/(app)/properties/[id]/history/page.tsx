import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAgent } from '@/lib/auth'
import { propertyHistory } from '@/lib/property-history'
import { RestoreButton } from '@/components/restore-button'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Property history' }

const day = (iso: string) => new Date(iso).toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Singapore' })
const time = (iso: string) => new Date(iso).toLocaleTimeString('en-SG', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Singapore' })

export default async function PropertyHistoryPage({ params, searchParams }: PageProps<'/properties/[id]/history'>) {
  const agent = await requireAgent()
  const [{ id }, query] = await Promise.all([params, searchParams])
  const filter = query.filter === 'deletions' ? 'deletions' : 'all'
  let history
  try {
    history = await propertyHistory(id, agent.id, filter)
  } catch (error) {
    if (error instanceof Error && /not found/i.test(error.message)) notFound()
    throw error
  }
  const days = new Map<string, typeof history.events>()
  for (const event of history.events) days.set(day(event.at), [...(days.get(day(event.at)) ?? []), event])

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link className="text-link inline-flex min-h-11 items-center text-sm" href={`/properties/${id}/settings`}>
        ← Property settings
      </Link>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">History</h1>
        <p className="mt-2 break-words text-gray-700">{history.property.address}</p>
        <p className="mt-2 text-sm text-gray-600">
          Every change and deletion, with who made it. Deleted rooms, lines, photos and findings can be
          restored for 30 days. History is recorded from 23 October 2026.
        </p>
      </div>
      <nav aria-label="Filter history" className="flex flex-wrap gap-2">
        {(['all', 'deletions'] as const).map((value) => (
          <Link
            key={value}
            href={value === 'all' ? `/properties/${id}/history` : `/properties/${id}/history?filter=deletions`}
            aria-current={filter === value ? 'page' : undefined}
            className={filter === value ? 'action-primary' : 'action-secondary'}
          >
            {value === 'all' ? 'All changes' : 'Deletions'}
          </Link>
        ))}
      </nav>
      {history.events.length === 0 ? (
        <p className="rounded-lg border border-gray-200 bg-white p-5 text-sm text-gray-600">
          {filter === 'deletions' ? 'Nothing has been deleted.' : 'No changes recorded yet.'}
        </p>
      ) : (
        [...days].map(([label, events]) => (
          <section key={label} className="rounded-lg border border-gray-200 bg-white">
            <h2 className="border-b border-gray-100 px-5 py-3 text-sm font-semibold text-gray-700">{label}</h2>
            <ul className="divide-y divide-gray-100">
              {events.map((event) => (
                <li key={event.id} className="px-5 py-4 text-sm">
                  <p>
                    <span className="font-medium">{event.actorName}</span> {event.summary}
                    <span className="text-gray-500"> · {time(event.at)}</span>
                  </p>
                  {event.changes.length > 0 && (
                    <ul className="mt-2 space-y-1 text-gray-600">
                      {event.changes.map((change) => (
                        <li key={change.field}>
                          {change.field}: <span className="line-through">{change.from ?? 'empty'}</span> → {change.to ?? 'empty'}
                        </li>
                      ))}
                    </ul>
                  )}
                  {event.bin && (event.bin.restoredAt ? (
                    <p className="mt-2 text-gray-500">Restored</p>
                  ) : event.bin.restorable ? (
                    <>
                      <p className="mt-2 text-gray-500">
                        In the bin until {new Date(event.bin.expiresAt).toLocaleDateString('en-SG', { dateStyle: 'long', timeZone: 'Asia/Singapore' })}
                      </p>
                      <RestoreButton binItemId={event.bin.id} propertyId={id} />
                    </>
                  ) : null)}
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  )
}
