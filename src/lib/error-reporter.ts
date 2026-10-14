/// The browser half of error tracking (the server half is `src/lib/errors.ts`). A report
/// is written to localStorage the moment it is made and leaves only once the server has
/// confirmed it: errors cluster where the signal is worst, and the report sent into a
/// dead connection is the one we most needed.

const STORAGE_KEY = 'kivilo:error-reports'
/// Enough to see what went wrong without letting a phone that is offline for a week
/// hoard every error it saw.
const MAX_PENDING = 20

type Context = 'boundary' | 'window' | 'rejection'

type PendingReport = {
  id: string
  context: Context
  name: string
  message: string
  stack: string | null
  path: string
  release: string | null
  occurredAt: string
}

/// One report per message per page load, so a render loop is one report, not thousands.
const reported = new Set<string>()

function pending(): PendingReport[] {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
}

export function reportError(error: unknown, context: Context) {
  // A digest means the server threw it, and `onRequestError` has already recorded it
  // with the real message. The browser only holds a redacted copy. Next's redirect and
  // not-found signals carry one too, and are not errors at all.
  if (typeof error === 'object' && error !== null && 'digest' in error) return

  const { name, message, stack } = error instanceof Error
    ? error
    : { name: 'NonError', message: String(error), stack: undefined }
  const key = `${name}: ${message}`
  if (reported.has(key)) return
  reported.add(key)

  const report: PendingReport = {
    id: crypto.randomUUID(),
    context,
    name: name.slice(0, 200),
    message: message.slice(0, 2000),
    stack: stack?.slice(0, 8000) ?? null,
    path: location.pathname.slice(0, 500),
    release: process.env.NEXT_PUBLIC_BUILD_ID ?? null,
    occurredAt: new Date().toISOString(),
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...pending(), report].slice(-MAX_PENDING)))
  void flushErrorReports()
}

export async function flushErrorReports() {
  const reports = pending()
  if (reports.length === 0) return

  let response: Response
  try {
    response = await fetch('/api/v1/errors', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ errors: reports }),
    })
  } catch {
    // Offline. Nothing is lost: the reports stay in storage and go with the next flush,
    // on the next page load or the moment the connection comes back.
    return
  }
  // A 400 will never be accepted, so it is dropped rather than retried forever. Any other
  // failure keeps the reports for next time.
  if (!response.ok && response.status !== 400) return
  const sent = new Set(reports.map((report) => report.id))
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(pending().filter((report) => !sent.has(report.id))),
  )
}
