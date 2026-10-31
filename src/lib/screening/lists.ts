import { createHash } from 'node:crypto'
import type { SanctionsSource } from '@/generated/prisma'
import { db } from '@/lib/db'
import { parseTsfaFirstSchedule, SG_TSFA_URL } from './sg-tsfa'
import { parseUnConsolidated, UN_CONSOLIDATED_URL, type ListEntry, type ParsedList } from './un-list'

/// The official lists Kivilo loads itself. PEP comes from a provider per check instead.
type ListSource = Exclude<SanctionsSource, 'PEP'>

const SOURCES: Record<ListSource, { url: string; parse: (body: string) => ParsedList; headers?: HeadersInit }> = {
  UN: { url: UN_CONSOLIDATED_URL, parse: parseUnConsolidated },
  // Singapore Statutes Online refuses requests that do not look like a browser.
  SG: {
    url: SG_TSFA_URL,
    parse: parseTsfaFirstSchedule,
    headers: { 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15' },
  },
}

export type RefreshResult =
  | { source: SanctionsSource; changed: boolean; entryCount: number; publishedAt: string | null }
  | { source: SanctionsSource; error: string }

/// Loads every source and stores a new version when its content changed. A version seen
/// again only has `fetchedAt` moved on, so the newest row is always the list last
/// confirmed. A download that parses to fewer than half the previous version's entries is
/// refused as truncated, and screening keeps using the previous version.
export async function refreshSanctionsLists(fetcher: typeof fetch = fetch): Promise<RefreshResult[]> {
  const results: RefreshResult[] = []
  for (const source of Object.keys(SOURCES) as ListSource[]) {
    const { url, parse, headers } = SOURCES[source]
    try {
      const response = await fetcher(url, { headers, cache: 'no-store' })
      if (!response.ok) throw new Error(`HTTP ${response.status} from ${url}`)
      const { entries, generatedAt } = parse(await response.text())
      const previous = await db.sanctionsList.findFirst({ where: { source }, orderBy: { fetchedAt: 'desc' } })
      if (entries.length === 0 || (previous && entries.length < previous.entryCount / 2)) {
        throw new Error(`${entries.length} entries parsed, previously ${previous?.entryCount ?? 0}`)
      }
      const checksum = createHash('sha256').update(JSON.stringify(entries)).digest('hex')
      await db.sanctionsList.upsert({
        where: { source_checksum: { source, checksum } },
        update: { fetchedAt: new Date() },
        create: { source, checksum, publishedAt: generatedAt, entryCount: entries.length, entries },
      })
      results.push({ source, changed: previous?.checksum !== checksum, entryCount: entries.length, publishedAt: generatedAt })
    } catch (error) {
      results.push({ source, error: error instanceof Error ? error.message : String(error) })
    }
  }
  return results
}

export type ListVersion = { source: SanctionsSource; publishedAt: string | null; checksum: string; fetchedAt: string }

/// The lists a screening runs against, and the versions it records. Screening never runs
/// without every list: a missing one is an error, not an empty result.
export async function currentSanctionsLists(): Promise<{ entries: ListEntry[]; versions: ListVersion[] }> {
  const entries: ListEntry[] = []
  const versions: ListVersion[] = []
  for (const source of Object.keys(SOURCES) as ListSource[]) {
    const list = await db.sanctionsList.findFirst({ where: { source }, orderBy: { fetchedAt: 'desc' } })
    if (!list) throw new Error(`The ${source} sanctions list has not been loaded`)
    entries.push(...(list.entries as ListEntry[]))
    versions.push({ source, publishedAt: list.publishedAt, checksum: list.checksum, fetchedAt: list.fetchedAt.toISOString() })
  }
  return { entries, versions }
}
