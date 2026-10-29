import { readFileSync } from 'node:fs'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/lib/db'
import { currentSanctionsLists, refreshSanctionsLists } from './lists'
import { SG_TSFA_URL } from './sg-tsfa'
import { UN_CONSOLIDATED_URL } from './un-list'

const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')
const un = fixture('un-consolidated-sample.xml')
const sg = fixture('sg-tsfa-first-schedule.html')

function serving(bodies: Record<string, string | number>): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const body = bodies[String(input)]
    return typeof body === 'number' ? new Response('', { status: body }) : new Response(body)
  }) as typeof fetch
}

// The table only ever holds downloaded lists; tests start and end with it empty.
beforeEach(() => db.sanctionsList.deleteMany())
afterAll(() => db.sanctionsList.deleteMany())

describe('sanctions lists', () => {
  it('refuses to screen before any list is loaded', async () => {
    await expect(currentSanctionsLists()).rejects.toThrow('has not been loaded')
  })

  it('stores each source once and returns both for screening with their versions', async () => {
    const results = await refreshSanctionsLists(serving({ [UN_CONSOLIDATED_URL]: un, [SG_TSFA_URL]: sg }))
    expect(results).toEqual([
      expect.objectContaining({ source: 'UN', changed: true, entryCount: 5 }),
      expect.objectContaining({ source: 'SG', changed: true, entryCount: 33, publishedAt: '2026-08-26' }),
    ])
    const { entries, versions } = await currentSanctionsLists()
    expect(entries).toHaveLength(38)
    expect(versions.map((version) => version.source)).toEqual(['UN', 'SG'])
  })

  it('keeps one row for an unchanged list and moves its confirmation time on', async () => {
    const fetcher = serving({ [UN_CONSOLIDATED_URL]: un, [SG_TSFA_URL]: sg })
    await refreshSanctionsLists(fetcher)
    const first = await db.sanctionsList.findFirstOrThrow({ where: { source: 'UN' } })
    const [again] = await refreshSanctionsLists(fetcher)
    expect(again).toMatchObject({ source: 'UN', changed: false })
    expect(await db.sanctionsList.count({ where: { source: 'UN' } })).toBe(1)
    const confirmed = await db.sanctionsList.findFirstOrThrow({ where: { source: 'UN' } })
    expect(confirmed.fetchedAt.getTime()).toBeGreaterThanOrEqual(first.fetchedAt.getTime())
  })

  it('stores a new version when the content changes, and screens against the newest', async () => {
    await refreshSanctionsLists(serving({ [UN_CONSOLIDATED_URL]: un, [SG_TSFA_URL]: sg }))
    const added = sg.replace('Tan Jun Jie', 'Tan Jun Jie @ Tan JJ')
    const [, sgResult] = await refreshSanctionsLists(serving({ [UN_CONSOLIDATED_URL]: un, [SG_TSFA_URL]: added }))
    expect(sgResult).toMatchObject({ source: 'SG', changed: true })
    expect(await db.sanctionsList.count({ where: { source: 'SG' } })).toBe(2)
    const { entries } = await currentSanctionsLists()
    expect(entries.some((entry) => entry.names.some((name) => name.name === 'Tan JJ'))).toBe(true)
  })

  it('refuses a failed or truncated download and keeps the last good version', async () => {
    await refreshSanctionsLists(serving({ [UN_CONSOLIDATED_URL]: un, [SG_TSFA_URL]: sg }))
    const truncated = sg.slice(0, sg.indexOf('(zc)') > 0 ? sg.indexOf('(zc)') : 4000) + 'In this Schedule'
    const results = await refreshSanctionsLists(serving({ [UN_CONSOLIDATED_URL]: 503, [SG_TSFA_URL]: truncated }))
    expect(results[0]).toMatchObject({ source: 'UN', error: expect.stringContaining('503') })
    expect(results[1]).toMatchObject({ source: 'SG', error: expect.stringContaining('previously 33') })
    expect((await currentSanctionsLists()).entries).toHaveLength(38)
  })
})
