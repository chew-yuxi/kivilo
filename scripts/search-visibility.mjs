#!/usr/bin/env node
// Observe public delivery and import explicitly sourced dashboard measurements.
// GET requests only: this script never submits URLs or infers search-engine outcomes.
import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { ORIGIN, defaultStateFile, fingerprintPage, parseSitemap, publicPageUrl } from './indexnow-sync.mjs'

export const SEARCH_BOTS = ['Googlebot', 'bingbot', 'OAI-SearchBot', 'Claude-SearchBot', 'PerplexityBot']
const DISCOVERY = ['/robots.txt', '/llms.txt', '/llms-full.txt']
const MAX_FILE_BYTES = 5 * 1024 * 1024
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024
const USER_AGENT = 'KiviloVisibility/1.0 (+https://kivilo.app)'
const NOTE = 'HTTP, canonical and robots checks describe technical accessibility only. They do not establish crawling, indexing, rankings, traffic or AI citations. IndexNow receipts establish delivery only.'

export function defaultOutputDir() {
  return join(dirname(defaultStateFile()), 'visibility')
}

function timestamp(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) && calendarDate(value.slice(0, 10)) && Number.isFinite(Date.parse(value))
}

function calendarDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value
}

export function validateObservations(input) {
  if (!input || input.version !== 1 || !Array.isArray(input.observations) || input.observations.length > 500) throw Error('Expected version 1 with at most 500 observations.')
  const seen = new Set()
  return input.observations.map(row => {
    if (!row || typeof row.id !== 'string' || !/^[a-z0-9][a-z0-9._-]{0,119}$/.test(row.id) || seen.has(row.id)) throw Error('Observation ids must be unique stable lowercase identifiers.')
    seen.add(row.id)
    for (const field of ['source', 'metric']) {
      if (typeof row[field] !== 'string' || !row[field].trim() || row[field].length > 200) throw Error(`Observation ${row.id} needs ${field}.`)
    }
    if (!['observed', 'pending', 'unavailable', 'not-collected'].includes(row.status)) throw Error(`Invalid observation status: ${row.id}.`)
    if (row.status === 'observed') {
      if (!(typeof row.value === 'number' && Number.isFinite(row.value) && row.value >= 0) &&
          !(typeof row.value === 'string' && row.value.trim() && row.value.length <= 2000)) throw Error(`Observed value is required: ${row.id}.`)
    } else if (row.value !== null) throw Error(`Unknown/pending values must be null, not zero: ${row.id}.`)
    if (row.unit !== null && (typeof row.unit !== 'string' || !row.unit.trim() || row.unit.length > 100)) throw Error(`Explicit unit or null is required: ${row.id}.`)
    if (!timestamp(row.observedAt)) throw Error(`A timestamp with timezone is required: ${row.id}.`)
    if (row.period !== null) {
      if (!row.period || !calendarDate(row.period.start) || !calendarDate(row.period.end) || row.period.start > row.period.end) throw Error(`Explicit reporting period or null is required: ${row.id}.`)
      if (row.period.timezone !== undefined && (typeof row.period.timezone !== 'string' || !row.period.timezone.trim() || row.period.timezone.length > 100)) throw Error(`Invalid reporting timezone: ${row.id}.`)
    }
    const sourceUrl = new URL(row.sourceUrl)
    if (sourceUrl.protocol !== 'https:' || sourceUrl.username || sourceUrl.password) throw Error(`An HTTPS source URL without credentials is required: ${row.id}.`)
    if (row.notes !== undefined && (typeof row.notes !== 'string' || row.notes.length > 4000)) throw Error(`Invalid notes: ${row.id}.`)
    return {
      id: row.id, source: row.source, metric: row.metric, status: row.status, value: row.value,
      unit: row.unit, observedAt: row.observedAt, period: row.period === null ? null : {
        start: row.period.start, end: row.period.end, ...(row.period.timezone ? { timezone: row.period.timezone } : {}),
      }, sourceUrl: sourceUrl.href, ...(row.notes === undefined ? {} : { notes: row.notes }),
    }
  })
}

// Robots rules are evaluated for this public URL only. A fetched file is not evidence
// that any named bot visited the site, nor does an allow rule override a CDN refusal.
export function robotsAccess(text, url, bot) {
  const groups = []
  let group = null
  let hasRules = false
  for (const original of text.split(/\r?\n/)) {
    const line = original.replace(/#.*$/, '').trim()
    if (!line) continue
    const match = /^([^:]+):\s*(.*)$/.exec(line)
    if (!match) continue
    const name = match[1].trim().toLowerCase()
    const value = match[2].trim()
    if (name === 'user-agent') {
      if (!value) continue
      if (!group || hasRules) { group = { agents: [], rules: [] }; groups.push(group); hasRules = false }
      group.agents.push(value.toLowerCase())
    } else if (group && (name === 'allow' || name === 'disallow')) {
      hasRules = true
      if (value) group.rules.push({ allow: name === 'allow', pattern: value })
    }
  }
  const token = bot.toLowerCase()
  const specificity = group => Math.max(-1, ...group.agents.map(agent => agent === '*' ? 0 : token.includes(agent) ? agent.length : -1))
  const best = Math.max(-1, ...groups.map(specificity))
  if (best < 0) return 'allowed'
  const pathname = new URL(url).pathname
  const matches = groups.filter(group => specificity(group) === best).flatMap(group => group.rules).filter(rule => {
    const end = rule.pattern.endsWith('$')
    const pattern = (end ? rule.pattern.slice(0, -1) : rule.pattern).split('*')
      .map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*')
    return new RegExp(`^${pattern}${end ? '$' : ''}`).test(pathname)
  }).sort((a, b) => b.pattern.replace(/[*$]/g, '').length - a.pattern.replace(/[*$]/g, '').length || Number(b.allow) - Number(a.allow))
  return matches[0]?.allow === false ? 'disallowed' : 'allowed'
}

async function readJson(file) {
  if ((await stat(file)).size > MAX_FILE_BYTES) throw Error('Local observation/state file exceeds 5 MiB.')
  return JSON.parse(await readFile(file, 'utf8'))
}

function compareSnapshots(previous, report) {
  const changes = { previousCheckedAt: previous?.checkedAt ?? null, regressions: [], recoveries: [], changedContent: [], addedToSitemap: [], removedFromSitemap: [] }
  if (!previous) return changes
  const before = new Map([...previous.technical.pages, ...previous.technical.discovery, previous.technical.sitemap].filter(Boolean).map(row => [row.url, row]))
  for (const row of [...report.technical.pages, ...report.technical.discovery, report.technical.sitemap].filter(Boolean)) {
    const prior = before.get(row.url)
    if (!prior) continue
    if (prior.ok && !row.ok) changes.regressions.push({ url: row.url, issues: row.issues })
    if (!prior.ok && row.ok) changes.recoveries.push(row.url)
    const previousHash = row.kind === 'page' ? prior.fingerprint : prior.sha256
    const currentHash = row.kind === 'page' ? row.fingerprint : row.sha256
    if (previousHash && currentHash && previousHash !== currentHash) changes.changedContent.push(row.url)
  }
  // A failed or partial sitemap parse is never evidence that URLs were removed.
  if (previous.technical.sitemap?.ok && report.technical.sitemap?.ok) {
    const oldUrls = new Set(previous.technical.sitemapEntries.map(row => row.url))
    const currentUrls = new Set(report.technical.sitemapEntries.map(row => row.url))
    changes.addedToSitemap = [...currentUrls].filter(url => !oldUrls.has(url))
    changes.removedFromSitemap = [...oldUrls].filter(url => !currentUrls.has(url))
  }
  return changes
}

function cell(value) {
  return String(value ?? '').replace(/[\r\n]+/g, ' ').replace(/\|/g, '\\|').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function renderVisibility(report) {
  const checked = report.technical.pages.length
  const passing = report.technical.pages.filter(page => page.ok).length
  const lines = [
    '# Kivilo search visibility observations', '',
    `Checked: ${report.checkedAt}. Run: ${report.status}. Public origin: ${report.origin}.`, '',
    NOTE, '',
    `Canonical pages passing observed checks: ${passing}/${checked}; sitemap URLs: ${report.technical.sitemapEntries.length}. ${report.technical.truncated ? 'Page limit reached; this is partial coverage.' : ''}`, '',
    '## Technical observations', '',
    '| URL | HTTP | Observed checks | Issues |', '| --- | --- | --- | --- |',
    ...[report.technical.sitemap, ...report.technical.discovery, ...report.technical.pages].filter(Boolean)
      .map(row => `| ${cell(row.url)} | ${row.httpStatus ?? 'unknown'} | ${row.ok ? 'passed' : 'failed'} | ${cell(row.issues.join('; '))} |`), '',
    '## Changes since the previous snapshot', '',
    `Previous check: ${report.changes.previousCheckedAt ?? 'none; first observation'}.`, '',
    `Regressions: ${report.changes.regressions.length}. Recoveries: ${report.changes.recoveries.length}. Changed content: ${report.changes.changedContent.length}.`, '',
    ...report.changes.regressions.map(row => `- Regression: ${row.url} — ${cell(row.issues.join('; '))}`),
    ...report.changes.recoveries.map(url => `- Recovered: ${url}`),
    ...report.changes.changedContent.map(url => `- Content changed: ${url}`),
    ...report.changes.addedToSitemap.map(url => `- Added to sitemap: ${url}`),
    ...report.changes.removedFromSitemap.map(url => `- Removed from sitemap: ${url}`), '',
    '## Sourced search, traffic and citation observations', '',
    'Values below come only from explicitly recorded source observations. Carried values retain their original observation time; they are not a fresh dashboard read. Unknown is never treated as zero. Reporting periods/timezones are not combined.', '',
    '| Metric / source | Value | Status | Observed at (age) | Reporting period | Evidence |', '| --- | --- | --- | --- | --- | --- |',
    ...report.observations.map(row => {
      const age = Math.max(0, Math.floor((Date.parse(report.checkedAt) - Date.parse(row.observedAt)) / 86400000))
      const period = row.period ? `${row.period.start} to ${row.period.end}${row.period.timezone ? ` (${row.period.timezone})` : ''}` : 'point-in-time'
      return `| ${cell(`${row.metric} / ${row.source}`)} | ${row.value === null ? 'unknown' : cell(`${row.value}${row.unit ? ` ${row.unit}` : ''}`)} | ${row.status} | ${cell(row.observedAt)} (${age}d old) | ${cell(period)} | ${cell(row.sourceUrl)}${row.notes ? ` — ${cell(row.notes)}` : ''} |`
    }),
    ...(report.observations.length ? [] : ['| No source metrics supplied | unknown | not-collected | — | — | — |']), '',
    '## Local IndexNow receipts', '',
    `Receipt file: ${cell(report.indexNow.stateFile)}. State: ${report.indexNow.status}.`, '',
    ...report.indexNow.receipts.map(receipt => `- ${receipt.submittedAt}: HTTP ${receipt.httpStatus}, ${receipt.result}, ${receipt.urls.length} URL(s).`),
    'A 200 means received; a 202 means key validation pending at submission. Neither is confirmation of indexing, and an old 202 is not a fresh status poll.', '',
    ...(report.errors.length ? ['## Collection failures', '', ...report.errors.map(error => `- ${cell(error.source)}: ${cell(error.message)}`), ''] : []),
  ]
  return lines.join('\n')
}

export async function collectSearchVisibility({ outputDir = defaultOutputDir(), observationsFile,
  indexNowStateFile = defaultStateFile(), fetchImpl = fetch, now = () => new Date(),
  maxPages = 100, timeoutMs = 15000, totalTimeoutMs = 120000, maxResponseBytes = MAX_RESPONSE_BYTES,
} = {}) {
  if (!Number.isInteger(maxPages) || maxPages < 1 || maxPages > 100) throw Error('maxPages must be 1–100.')
  for (const value of [timeoutMs, totalTimeoutMs, maxResponseBytes]) if (!Number.isInteger(value) || value <= 0) throw Error('Request limits must be positive integers.')
  await mkdir(outputDir, { recursive: true, mode: 0o700 })
  const lock = join(outputDir, '.collection.lock')
  try { await mkdir(lock) }
  catch (error) {
    if (error.code === 'EEXIST') throw Error(`A visibility collection is already running or left a lock: ${lock}. Check for an active run before removing a stale lock.`)
    throw error
  }
  try {
    const checkedAt = now().toISOString()
    const report = {
      version: 1, origin: ORIGIN, mode: 'read-only', checkedAt, completedAt: null, status: 'complete', note: NOTE,
      technical: { sitemap: null, sitemapEntries: [], pages: [], discovery: [], truncated: false },
      // These remain unknown automatically, even when every public request succeeds.
      automatedSearchMetrics: { indexedPages: null, searchClicks: null, searchImpressions: null, aiCitations: null },
      observations: [], observationUpdates: [],
      indexNow: { stateFile: resolve(indexNowStateFile), checkedAt, status: 'not-found', receipts: [] },
      changes: null, errors: [],
    }
    const fail = (source, error) => report.errors.push({ source, message: error instanceof Error ? error.message : String(error) })
    let previous = null
    let historyValid = true
    try {
      previous = await readJson(join(outputDir, 'latest.json'))
      if (previous.version !== 1 || previous.origin !== ORIGIN || !timestamp(previous.checkedAt) ||
          !Array.isArray(previous.technical?.pages) || !Array.isArray(previous.technical?.discovery) || !Array.isArray(previous.technical?.sitemapEntries)) throw Error('Invalid previous visibility snapshot.')
      report.observations = validateObservations({ version: 1, observations: previous.observations })
    } catch (error) {
      if (error.code !== 'ENOENT') { fail('history', error); historyValid = false }
      previous = null
    }
    if (observationsFile) {
      try {
        const incoming = validateObservations(await readJson(observationsFile))
        if (incoming.some(row => Date.parse(row.observedAt) > Date.parse(checkedAt))) throw Error('An observation cannot be dated after this collection run.')
        const merged = new Map(report.observations.map(row => [row.id, row]))
        for (const row of incoming) {
          const prior = merged.get(row.id)
          if (prior && Date.parse(row.observedAt) < Date.parse(prior.observedAt)) throw Error(`Older observation would replace newer evidence: ${row.id}.`)
          merged.set(row.id, row)
        }
        report.observations = validateObservations({ version: 1, observations: [...merged.values()] })
        report.observationUpdates = incoming.map(row => row.id)
      } catch (error) { fail('observations', error) }
    }
    try {
      const state = await readJson(indexNowStateFile)
      if (state.version !== 1 || state.host !== 'kivilo.app' || !Array.isArray(state.receipts) || state.receipts.length > 5000) throw Error('Invalid IndexNow receipt state.')
      report.indexNow.receipts = state.receipts.map(receipt => {
        if (!timestamp(receipt.submittedAt) || ![200, 202].includes(receipt.status) || !Array.isArray(receipt.changes) || receipt.changes.length > 1000) throw Error('Invalid IndexNow receipt.')
        return { submittedAt: receipt.submittedAt, httpStatus: receipt.status,
          result: receipt.status === 202 ? 'key-validation-pending-at-submission' : 'received',
          urls: receipt.changes.map(change => publicPageUrl(change.url)) }
      })
      report.indexNow.status = 'observed'
    } catch (error) {
      if (error.code !== 'ENOENT') { report.indexNow.status = 'invalid'; fail('indexnow-receipts', error) }
    }

    const deadline = AbortSignal.timeout(totalTimeoutMs)
    const request = async (url, kind) => {
      const row = { url, kind, checkedAt: now().toISOString(), httpStatus: null, contentType: null, robotsHeader: null, bytes: null, sha256: null, ok: false, issues: [] }
      let text = null
      try {
        deadline.throwIfAborted()
        const response = await fetchImpl(url, { method: 'GET', redirect: 'manual',
          signal: AbortSignal.any([deadline, AbortSignal.timeout(timeoutMs)]), headers: { 'user-agent': USER_AGENT } })
        row.httpStatus = response.status
        row.contentType = response.headers.get('content-type')
        row.robotsHeader = response.headers.get('x-robots-tag')
        const chunks = []
        let bytes = 0
        if (response.body) for await (const chunk of response.body) {
          bytes += chunk.byteLength
          if (bytes > maxResponseBytes) throw Error(`Response exceeds ${maxResponseBytes} bytes.`)
          chunks.push(chunk)
        }
        text = Buffer.concat(chunks).toString('utf8')
        row.bytes = bytes
        row.sha256 = createHash('sha256').update(text).digest('hex')
        if (response.status !== 200) throw Error(`Expected HTTP 200; received ${response.status}. Redirects are not followed.`)
        row.ok = true
      } catch (error) { row.issues.push(error instanceof Error ? error.message : String(error)) }
      return { row, text }
    }
    const recordIssue = (row, message) => { row.ok = false; row.issues.push(message) }
    const sitemap = await request(`${ORIGIN}/sitemap.xml`, 'sitemap')
    if (sitemap.row.ok) {
      try {
        if (!/(?:application|text)\/xml\b/i.test(sitemap.row.contentType ?? '')) throw Error('Sitemap response is not XML.')
        report.technical.sitemapEntries = parseSitemap(sitemap.text)
      } catch (error) { recordIssue(sitemap.row, error.message) }
    }
    report.technical.sitemap = sitemap.row
    const discovery = await Promise.all(DISCOVERY.map(path => request(`${ORIGIN}${path}`, 'discovery')))
    for (const { row, text } of discovery) {
      if (row.ok && (!/^text\/(?:plain|markdown)\b/i.test(row.contentType ?? '') || !text.trim())) recordIssue(row, 'Expected nonempty plain text discovery file.')
    }
    report.technical.discovery = discovery.map(result => result.row)
    const robots = discovery[0]
    const entries = report.technical.sitemapEntries.slice(0, maxPages)
    if (report.technical.sitemapEntries.length > maxPages) {
      report.technical.truncated = true
      fail('page-limit', `Sitemap has ${report.technical.sitemapEntries.length} URLs; checked the first ${maxPages}.`)
    }
    // Four concurrent workers bound memory and request rate. Links within fetched files
    // are never followed; every page came through the strict public sitemap allowlist.
    let next = 0
    await Promise.all(Array.from({ length: Math.min(4, entries.length) }, async () => {
      while (next < entries.length) {
        const { url, lastmod } = entries[next++]
        const { row, text } = await request(url, 'page')
        row.lastmod = lastmod
        row.fingerprint = null
        row.robotsAccess = Object.fromEntries(SEARCH_BOTS.map(bot => [bot, robots.row.ok ? robotsAccess(robots.text, url, bot) : 'unknown']))
        if (row.ok) {
          try {
            if (!/^text\/html\b/i.test(row.contentType ?? '')) throw Error('Canonical page response is not HTML.')
            row.fingerprint = fingerprintPage(text, url, lastmod, row.robotsHeader ?? '')
          } catch (error) { recordIssue(row, error.message) }
        }
        const blocked = Object.entries(row.robotsAccess).filter(([, access]) => access === 'disallowed').map(([bot]) => bot)
        if (blocked.length) recordIssue(row, `robots.txt disallows ${blocked.join(', ')}.`)
        if (!robots.row.ok) recordIssue(row, 'Search-bot robots access is unknown because robots.txt could not be checked.')
        row.indexability = row.ok ? 'passes-observed-checks' : row.httpStatus === null ? 'unknown' : 'fails-observed-checks'
        report.technical.pages.push(row)
        // Only route families with published Markdown alternates: no fetched link can
        // expand this request list or introduce app/customer URLs.
        if (/^\/(?:product|(?:compare|guides)\/[a-z0-9-]+)$/.test(new URL(url).pathname)) {
          const reference = await request(`${url}/index.md`, 'reference')
          reference.row.canonicalPage = url
          reference.row.expectedNoindex = true
          if (reference.row.ok && (!/^text\/markdown\b/i.test(reference.row.contentType ?? '') || !reference.text.trim())) recordIssue(reference.row, 'Expected nonempty text/markdown alternate.')
          if (reference.row.ok && !/\bnoindex\b/i.test(reference.row.robotsHeader ?? '')) recordIssue(reference.row, 'Markdown alternate is missing its expected noindex header.')
          report.technical.discovery.push(reference.row)
        }
      }
    }))
    report.technical.pages.sort((a, b) => a.url.localeCompare(b.url))
    report.technical.discovery.sort((a, b) => a.url.localeCompare(b.url))
    for (const row of [report.technical.sitemap, ...report.technical.discovery, ...report.technical.pages]) {
      if (!row.ok) fail(row.url, row.issues.join('; '))
    }
    report.changes = compareSnapshots(previous, report)
    report.completedAt = now().toISOString()
    report.status = report.errors.length ? 'partial' : 'complete'
    const basename = `${checkedAt.replace(/[:.]/g, '-')}-${randomUUID().slice(0, 8)}`
    const paths = { json: join(outputDir, `${basename}.json`), markdown: join(outputDir, `${basename}.md`), latest: join(outputDir, 'latest.json') }
    const json = `${JSON.stringify(report, null, 2)}\n`
    await writeFile(paths.json, json, { mode: 0o600, flag: 'wx', flush: true })
    await writeFile(paths.markdown, `${renderVisibility(report)}\n`, { mode: 0o600, flag: 'wx', flush: true })
    if (historyValid) {
      const temporary = join(outputDir, `latest-${randomUUID()}.tmp`)
      await writeFile(temporary, json, { mode: 0o600, flag: 'wx', flush: true })
      await rename(temporary, paths.latest)
    }
    return { report, paths }
  } finally { await rm(lock, { recursive: true }) }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    const options = {}
    const args = process.argv.slice(2)
    for (let index = 0; index < args.length; index++) {
      const key = { '--output-dir': 'outputDir', '--observations': 'observationsFile' }[args[index]]
      if (!key || options[key] || !args[index + 1] || args[index + 1].startsWith('--')) throw Error('Usage: node scripts/search-visibility.mjs [--output-dir PATH] [--observations PATH]')
      options[key] = resolve(args[++index])
    }
    const { report, paths } = await collectSearchVisibility(options)
    console.log(JSON.stringify({ status: report.status, checkedAt: report.checkedAt, pages: report.technical.pages.length,
      errors: report.errors, regressions: report.changes.regressions.length, paths }, null, 2))
    if (report.errors.length) process.exitCode = 1
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}
