import assert from 'node:assert/strict'
import { mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { ORIGIN } from './indexnow-sync.mjs'
import { collectSearchVisibility, renderVisibility, robotsAccess, validateObservations } from './search-visibility.mjs'

const now = new Date('2026-10-26T08:00:00Z')
const page = (url, text = 'A written condition inventory.') => `<html><head><title>Kivilo</title><link rel="canonical" href="${url}"></head><body><h1>${text}</h1></body></html>`
const sitemap = urls => `<urlset>${urls.map(url => `<url><loc>${url}</loc></url>`).join('')}</urlset>`
const observation = extra => ({ id: 'google-search-clicks', source: 'google-search-console', metric: 'clicks', status: 'observed',
  value: 0, unit: 'clicks', observedAt: '2026-10-25T08:00:00Z',
  period: { start: '2026-10-20', end: '2026-10-24', timezone: 'America/Los_Angeles' },
  sourceUrl: 'https://search.google.com/search-console/performance/search-analytics', ...extra })

async function fixture(t, urls = [`${ORIGIN}/`, `${ORIGIN}/product`]) {
  const directory = await mkdtemp(join(tmpdir(), 'kivilo-visibility-test-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  const outputDir = join(directory, 'observations')
  const indexNowStateFile = join(directory, 'indexnow-state.json')
  const responses = new Map([
    [`${ORIGIN}/sitemap.xml`, { text: sitemap(urls), type: 'application/xml' }],
    [`${ORIGIN}/robots.txt`, { text: 'User-agent: *\nAllow: /\n', type: 'text/plain' }],
    [`${ORIGIN}/llms.txt`, { text: '# Kivilo\nPublic product facts.', type: 'text/plain' }],
    [`${ORIGIN}/llms-full.txt`, { text: '# Kivilo full reference', type: 'text/plain' }],
    ...urls.map(url => [url, { text: page(url), type: 'text/html' }]),
    ...urls.filter(url => /^\/(?:product|(?:compare|guides)\/[a-z0-9-]+)$/.test(new URL(url).pathname))
      .map(url => [`${url}/index.md`, { text: `# Kivilo\nCanonical: ${url}`, type: 'text/markdown', headers: { 'x-robots-tag': 'noindex' } }]),
  ])
  const requests = []
  const fetchImpl = async (url, init) => {
    requests.push({ url, ...init })
    assert.equal(init.method, 'GET')
    assert.equal(init.redirect, 'manual')
    assert.ok(init.signal instanceof AbortSignal)
    assert.equal(new URL(url).origin, ORIGIN)
    const result = responses.get(url)
    assert.ok(result, `Unexpected URL: ${url}`)
    if (result.error) throw Error(result.error)
    return new Response(result.text, { status: result.status ?? 200, headers: { 'content-type': result.type, ...result.headers } })
  }
  return { directory, outputDir, indexNowStateFile, responses, requests, fetchImpl,
    run: options => collectSearchVisibility({ outputDir, indexNowStateFile, fetchImpl, now: () => now, ...options }),
  }
}

test('observations preserve measured zero, unavailable null, period and evidence provenance', () => {
  const values = [observation(), observation({ id: 'google-ai-citations', metric: 'ai-citations', status: 'unavailable', value: null, period: null })]
  assert.deepEqual(validateObservations({ version: 1, observations: values }), values)
  for (const extra of [
    { status: 'unavailable', value: 0 }, { status: 'pending', value: 'Processing' }, { value: null },
    { observedAt: '2026-10-25' }, { observedAt: '2026-02-30T08:00:00Z' },
    { period: { start: '2026-10-26', end: '2026-10-20' } }, { period: { start: '2026-02-30', end: '2026-03-01' } },
    { sourceUrl: 'https://name:password@example.com' }, { sourceUrl: 'file:///tmp/private' },
    { id: undefined }, { value: -1 }, { value: Infinity }, { unit: undefined },
  ]) assert.throws(() => validateObservations({ version: 1, observations: [observation(extra)] }), undefined, JSON.stringify(extra))
  assert.throws(() => validateObservations({ version: 1, observations: [observation(), observation()] }), /unique/)
})

test('robots uses matching agents, most specific paths, allow ties and wildcard suffixes', () => {
  const rules = 'User-agent: *\nDisallow: /guides\nAllow: /guides/public\n\nUser-agent: Googlebot\nDisallow: /product$\n'
  assert.equal(robotsAccess(rules, `${ORIGIN}/guides/private`, 'bingbot'), 'disallowed')
  assert.equal(robotsAccess(rules, `${ORIGIN}/guides/public`, 'bingbot'), 'allowed')
  assert.equal(robotsAccess(rules, `${ORIGIN}/guides/private`, 'Googlebot'), 'allowed')
  assert.equal(robotsAccess(rules, `${ORIGIN}/product`, 'Googlebot'), 'disallowed')
  assert.equal(robotsAccess(rules, `${ORIGIN}/product/more`, 'Googlebot'), 'allowed')
  assert.equal(robotsAccess('User-agent: otherbot\nDisallow: /', `${ORIGIN}/`, 'bingbot'), 'allowed')
  assert.equal(robotsAccess('User-agent: \nDisallow: /', `${ORIGIN}/`, 'bingbot'), 'allowed')
  assert.equal(robotsAccess('User-agent: *\nDisallow: /*\nAllow: /product$', `${ORIGIN}/product`, 'bingbot'), 'allowed')
  assert.equal(robotsAccess('User-agent: *\nDisallow: /product\nAllow: /product', `${ORIGIN}/product`, 'bingbot'), 'allowed')
})

test('successful public checks write private history without inventing search or citation metrics', async t => {
  const f = await fixture(t)
  const { report, paths } = await f.run()
  assert.equal(report.status, 'complete')
  assert.equal(report.technical.pages.length, 2)
  assert.ok(report.technical.pages.every(row => row.indexability === 'passes-observed-checks' && /^[a-f0-9]{64}$/.test(row.fingerprint)))
  assert.deepEqual(report.automatedSearchMetrics, { indexedPages: null, searchClicks: null, searchImpressions: null, aiCitations: null })
  assert.equal(report.indexNow.status, 'not-found')
  assert.equal(f.requests.length, 7)
  assert.equal(report.technical.discovery.find(row => row.kind === 'reference').expectedNoindex, true)
  assert.deepEqual(JSON.parse(await readFile(paths.json, 'utf8')), report)
  assert.deepEqual(JSON.parse(await readFile(paths.latest, 'utf8')), report)
  assert.equal((await stat(paths.json)).mode & 0o777, 0o600)
  assert.equal((await stat(paths.markdown)).mode & 0o777, 0o600)
  assert.equal((await stat(f.outputDir)).mode & 0o777, 0o700)
  const markdown = await readFile(paths.markdown, 'utf8')
  assert.match(markdown, /do not establish crawling, indexing/)
  assert.match(markdown, /No source metrics supplied \| unknown/)
})

test('manual baselines and 202 receipts carry forward with original timestamps, never as fresh reads', async t => {
  const f = await fixture(t)
  const observationsFile = join(f.directory, 'manual.json')
  await writeFile(observationsFile, JSON.stringify({ version: 1, observations: [observation(), observation({
    id: 'bing-indexed-pages', source: 'bing-webmaster-tools', metric: 'indexed-pages', status: 'pending', value: null, unit: 'pages', period: null,
  })] }))
  await writeFile(f.indexNowStateFile, JSON.stringify({ version: 1, host: 'kivilo.app', receipts: [{
    submittedAt: '2026-10-25T17:27:20.701Z', status: 202, changes: [{ url: `${ORIGIN}/`, change: 'added' }],
  }] }))
  const stateBefore = await readFile(f.indexNowStateFile, 'utf8')
  const first = await f.run({ observationsFile })
  assert.equal(first.report.observations[0].value, 0)
  assert.equal(first.report.indexNow.receipts[0].result, 'key-validation-pending-at-submission')
  const second = await f.run({ now: () => new Date('2026-10-27T08:00:00Z') })
  assert.deepEqual(second.report.observations, first.report.observations)
  assert.deepEqual(second.report.observationUpdates, [])
  assert.match(renderVisibility(second.report), /2d old/)
  assert.equal(await readFile(f.indexNowStateFile, 'utf8'), stateBefore)
  assert.equal((await readdir(f.outputDir)).filter(name => name.endsWith('.md')).length, 2)
})

test('regressions, content changes and recoveries compare with the previous snapshot and preserve failures', async t => {
  const f = await fixture(t)
  await f.run()
  f.responses.set(`${ORIGIN}/`, { text: page(`${ORIGIN}/`, 'New public facts'), type: 'text/html' })
  f.responses.set(`${ORIGIN}/product`, { text: 'Unavailable', type: 'text/html', status: 503 })
  const failed = await f.run()
  assert.equal(failed.report.status, 'partial')
  assert.equal(failed.report.changes.regressions[0].url, `${ORIGIN}/product`)
  assert.deepEqual(failed.report.changes.changedContent, [`${ORIGIN}/`])
  assert.match(failed.report.errors[0].message, /503/)
  assert.equal(JSON.parse(await readFile(failed.paths.json, 'utf8')).technical.pages.find(row => row.url.endsWith('/product')).httpStatus, 503)
  f.responses.set(`${ORIGIN}/product`, { text: page(`${ORIGIN}/product`), type: 'text/html' })
  const recovered = await f.run()
  assert.equal(recovered.report.status, 'complete')
  assert.deepEqual(recovered.report.changes.recoveries, [`${ORIGIN}/product`])
})

test('canonical mismatch, noindex and search-bot disallow are technical failures even with HTTP 200', async t => {
  const f = await fixture(t)
  await f.run()
  f.responses.set(`${ORIGIN}/`, { text: page(`${ORIGIN}/product`), type: 'text/html' })
  f.responses.set(`${ORIGIN}/product`, { text: page(`${ORIGIN}/product`), type: 'text/html', headers: { 'x-robots-tag': 'noindex' } })
  f.responses.set(`${ORIGIN}/robots.txt`, { text: 'User-agent: OAI-SearchBot\nDisallow: /product\n', type: 'text/plain' })
  const { report } = await f.run()
  assert.equal(report.status, 'partial')
  assert.equal(report.changes.regressions.length, 2)
  assert.match(report.technical.pages.find(row => row.url === `${ORIGIN}/`).issues.join(' '), /Canonical/)
  const product = report.technical.pages.find(row => row.url.endsWith('/product'))
  assert.match(product.issues.join(' '), /noindex/)
  assert.match(product.issues.join(' '), /OAI-SearchBot/)
  assert.equal(product.robotsAccess.Googlebot, 'allowed')
  assert.equal(product.robotsAccess['OAI-SearchBot'], 'disallowed')
})

test('hostile/failed sitemaps never fetch private URLs or imply sitemap removals', async t => {
  const f = await fixture(t)
  await f.run()
  f.requests.length = 0
  f.responses.set(`${ORIGIN}/sitemap.xml`, { text: sitemap([`${ORIGIN}/reports/secret`, 'https://example.com/']), type: 'application/xml' })
  const { report } = await f.run()
  assert.equal(report.status, 'partial')
  assert.equal(report.technical.pages.length, 0)
  assert.deepEqual(report.changes.removedFromSitemap, [])
  assert.equal(f.requests.length, 4)
  assert.ok(f.requests.every(row => !row.url.includes('secret') && !row.url.includes('example.com')))
})

test('URL and response-size bounds produce saved partial observations instead of silent coverage gaps', async t => {
  const f = await fixture(t)
  const bounded = await f.run({ maxPages: 1 })
  assert.equal(bounded.report.technical.pages.length, 1)
  assert.equal(bounded.report.technical.truncated, true)
  assert.equal(bounded.report.status, 'partial')
  assert.match(bounded.report.errors[0].message, /checked the first 1/)
  f.responses.set(`${ORIGIN}/product`, { text: 'x'.repeat(1000), type: 'text/html' })
  const oversized = await f.run({ maxResponseBytes: 500 })
  assert.equal(oversized.report.status, 'partial')
  assert.match(oversized.report.technical.pages.find(row => row.url.endsWith('/product')).issues[0], /exceeds 500/)
  assert.ok(await readFile(oversized.paths.markdown, 'utf8'))
})

test('redirects are recorded without following them, and network failures keep unknown HTTP status', async t => {
  const f = await fixture(t)
  f.responses.set(`${ORIGIN}/`, { text: 'Moved', type: 'text/html', status: 302, headers: { location: 'https://my.kivilo.app/reports/private' } })
  f.responses.set(`${ORIGIN}/product`, { error: 'Connection failed' })
  const { report } = await f.run()
  assert.equal(report.status, 'partial')
  assert.equal(report.technical.pages.find(row => row.url === `${ORIGIN}/`).httpStatus, 302)
  assert.equal(report.technical.pages.find(row => row.url.endsWith('/product')).indexability, 'unknown')
  assert.ok(f.requests.every(row => row.url.startsWith(ORIGIN)))
})

test('invalid input preserves earlier measurements and writes visible failure evidence', async t => {
  const f = await fixture(t)
  const observationsFile = join(f.directory, 'manual.json')
  await writeFile(observationsFile, JSON.stringify({ version: 1, observations: [observation()] }))
  await f.run({ observationsFile })
  await writeFile(observationsFile, JSON.stringify({ version: 1, observations: [observation({ status: 'unavailable', value: 0 })] }))
  const failed = await f.run({ observationsFile })
  assert.equal(failed.report.status, 'partial')
  assert.equal(failed.report.observations[0].value, 0)
  assert.equal(failed.report.observations[0].status, 'observed')
  assert.match(failed.report.errors[0].message, /must be null/)
  await writeFile(join(f.outputDir, 'latest.json'), 'corrupted earlier history')
  const corrupt = await f.run()
  assert.equal(corrupt.report.status, 'partial')
  assert.equal(await readFile(join(f.outputDir, 'latest.json'), 'utf8'), 'corrupted earlier history')
  assert.ok(await readFile(corrupt.paths.json, 'utf8'))
})

test('Markdown alternates must remain readable with noindex while canonical HTML stays indexable', async t => {
  const f = await fixture(t)
  await f.run()
  f.responses.set(`${ORIGIN}/product/index.md`, { text: '# Kivilo', type: 'text/markdown' })
  const { report } = await f.run()
  assert.equal(report.status, 'partial')
  assert.ok(report.technical.pages.every(row => row.ok))
  assert.deepEqual(report.changes.regressions.map(row => row.url), [`${ORIGIN}/product/index.md`])
  assert.match(report.changes.regressions[0].issues[0], /expected noindex/)
})

test('request timeouts are recorded and the partial snapshot still completes', async t => {
  const f = await fixture(t)
  const fetchImpl = (_url, { signal }) => new Promise((resolve, reject) => {
    // A normal server response would keep the event loop alive. AbortSignal timers
    // alone do not, so this timer also makes the mock behave like a real request.
    const timer = setTimeout(() => resolve(new Response('late')), 1000)
    const abort = () => { clearTimeout(timer); reject(signal.reason) }
    if (signal.aborted) abort()
    else signal.addEventListener('abort', abort, { once: true })
  })
  const { report, paths } = await f.run({ fetchImpl, timeoutMs: 5, totalTimeoutMs: 30 })
  assert.equal(report.status, 'partial')
  assert.equal(report.technical.sitemap.httpStatus, null)
  assert.match(report.errors[0].message, /timeout/i)
  assert.ok(await readFile(paths.json, 'utf8'))
})

test('a collector holds an exclusive output lock so an overlapping run cannot lose imported observations', async t => {
  const f = await fixture(t)
  await f.run()
  const before = await readFile(join(f.outputDir, 'latest.json'), 'utf8')
  const observationsFile = join(f.directory, 'manual.json')
  await writeFile(observationsFile, JSON.stringify({ version: 1, observations: [observation()] }))
  let notifyStarted
  let resume
  const started = new Promise(resolve => { notifyStarted = resolve })
  const paused = new Promise(resolve => { resume = resolve })
  const first = f.run({ fetchImpl: async (url, init) => {
    if (url.endsWith('/sitemap.xml')) { notifyStarted(); await paused }
    return f.fetchImpl(url, init)
  } })
  await started
  try {
    const requestsBefore = f.requests.length
    await assert.rejects(f.run({ observationsFile }), /visibility collection is already running/)
    assert.equal(f.requests.length, requestsBefore)
    assert.equal(await readFile(join(f.outputDir, 'latest.json'), 'utf8'), before)
  } finally { resume() }
  await first
  const imported = await f.run({ observationsFile })
  assert.deepEqual(imported.report.observationUpdates, ['google-search-clicks'])
  assert.equal(JSON.parse(await readFile(imported.paths.latest, 'utf8')).observations[0].value, 0)
  await assert.rejects(stat(join(f.outputDir, '.collection.lock')), { code: 'ENOENT' })
  await assert.rejects(f.run({ now: () => { throw Error('Clock failed') } }), /Clock failed/)
  await assert.rejects(stat(join(f.outputDir, '.collection.lock')), { code: 'ENOENT' })
})

test('merging 500 existing observations and a new id preserves valid history and exposes overflow', async t => {
  const f = await fixture(t)
  const observationsFile = join(f.directory, 'manual.json')
  const existing = Array.from({ length: 500 }, (_, index) => observation({ id: `metric-${index}` }))
  await writeFile(observationsFile, JSON.stringify({ version: 1, observations: existing }))
  const first = await f.run({ observationsFile })
  assert.equal(first.report.status, 'complete')
  await writeFile(observationsFile, JSON.stringify({ version: 1, observations: [observation({ id: 'new-metric' })] }))
  const overflow = await f.run({ observationsFile })
  assert.equal(overflow.report.status, 'partial')
  assert.match(overflow.report.errors[0].message, /at most 500 observations/)
  assert.equal(overflow.report.observations.length, 500)
  assert.deepEqual(overflow.report.observationUpdates, [])
  assert.equal(JSON.parse(await readFile(overflow.paths.latest, 'utf8')).observations.length, 500)
  const next = await f.run()
  assert.equal(next.report.status, 'complete')
  assert.deepEqual(next.report.observations, first.report.observations)
})
