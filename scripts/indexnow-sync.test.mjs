import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { BATCH_SIZE, ENDPOINT, ORIGIN, fingerprintPage, parseSitemap, publicPageUrl, syncIndexNow } from './indexnow-sync.mjs'

const key = '0123456789abcdef0123456789abcdef'
const keyLocation = `${ORIGIN}/${key}.txt`
const page = (url, text = 'Write the inventory.') => `<!doctype html><html><head><title>Kivilo</title><meta name="description" content="Property inventories"><link rel="canonical" href="${url}"></head><body><h1>${text}</h1><a href="/product">Product</a></body></html>`
const sitemap = entries => `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.map(({ url, lastmod }) => `<url><loc>${url}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`).join('')}</urlset>`

async function fixture(t, entries = [{ url: `${ORIGIN}/` }]) {
  const directory = await mkdtemp(join(tmpdir(), 'kivilo-indexnow-test-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  const stateFile = join(directory, 'state.json')
  const configFile = join(directory, 'config.json')
  await writeFile(configFile, JSON.stringify({ host: 'kivilo.app', key, keyLocation }))
  const responses = new Map([
    [keyLocation, { body: `${key}\n`, type: 'text/plain' }],
    [`${ORIGIN}/sitemap.xml`, { body: sitemap(entries), type: 'application/xml' }],
    ...entries.map(({ url }) => [url, { body: page(url), type: 'text/html' }]),
  ])
  const requests = []
  const statuses = [200]
  const fetchImpl = async (url, init) => {
    requests.push({ url, ...init })
    assert.equal(init.redirect, 'manual')
    assert.ok(init.signal instanceof AbortSignal)
    if (url === ENDPOINT) {
      assert.equal(init.method, 'POST')
      const payload = JSON.parse(init.body)
      assert.equal(payload.host, 'kivilo.app')
      assert.equal(payload.keyLocation, keyLocation)
      assert.ok(payload.urlList.length <= BATCH_SIZE)
      payload.urlList.forEach(publicPageUrl)
      return new Response('', { status: statuses.length > 1 ? statuses.shift() : statuses[0] })
    }
    const response = responses.get(url)
    assert.ok(response, `Unexpected request: ${url}`)
    return new Response(response.body, { status: response.status ?? 200,
      headers: { 'content-type': response.type, ...response.headers } })
  }
  return { directory, stateFile, responses, requests, statuses,
    run: options => syncIndexNow({ stateFile, configFile, fetchImpl, ...options }),
    state: async () => JSON.parse(await readFile(stateFile, 'utf8')) }
}

test('sitemap admission rejects private URLs, duplicate entries and incomplete input', () => {
  const entries = [{ url: `${ORIGIN}/` }, { url: `${ORIGIN}/compare/kivilo-vs-report-and-run`, lastmod: '2026-10-25' }]
  assert.deepEqual(parseSitemap(sitemap(entries)), entries.map(entry => ({ lastmod: '', ...entry })))
  for (const url of [
    'http://kivilo.app/', 'https://my.kivilo.app/', 'https://example.com/',
    'https://user:password@kivilo.app/', `${ORIGIN}/?token=private`, `${ORIGIN}/#fragment`,
    `${ORIGIN}/reports/private-token`, `${ORIGIN}/sign/123`, `${ORIGIN}/properties`, `${ORIGIN}/api/v1/me`,
    `${ORIGIN}/login`, `${ORIGIN}/product/index.md`, `${ORIGIN}/llms.txt`, `${ORIGIN}/compare/`,
    `${ORIGIN}/guides/%2e%2e/login`, `${ORIGIN}/product/../guides`, `${ORIGIN}:443/`,
  ]) assert.throws(() => parseSitemap(sitemap([{ url }])), undefined, url)
  for (const xml of [
    '<urlset></urlset>', sitemap([entries[0], entries[0]]), '<urlset><url><loc>https://kivilo.app/</loc></url>',
    '<sitemapindex><sitemap><loc>https://kivilo.app/sitemap.xml</loc></sitemap></sitemapindex>',
    '<!DOCTYPE urlset [<!ENTITY x SYSTEM "file:///etc/passwd">]>' + sitemap(entries),
    sitemap([{ url: `${ORIGIN}/`, lastmod: 'yesterday' }]),
  ]) assert.throws(() => parseSitemap(xml))
})

test('fingerprints notice content and metadata without resubmitting for bundle churn', () => {
  const url = `${ORIGIN}/compare`
  const html = page(url)
  const expected = fingerprintPage(html, url)
  assert.equal(fingerprintPage(html.replace('</body>', '<script src="/_next/new-build.js"></script><script>self.__next_f.push(["new-build"])</script></body>'), url), expected)
  assert.notEqual(fingerprintPage(page(url, 'Record the condition.'), url), expected)
  assert.notEqual(fingerprintPage(html.replace('content="Property inventories"', 'content="Rental handovers"'), url), expected)
  assert.notEqual(fingerprintPage(html.replace('href="/product"', 'href="/guides"'), url), expected)
  assert.notEqual(fingerprintPage(html, url, '2026-10-25'), expected)
  assert.notEqual(fingerprintPage(html.replace('</head>', '<script type="application/ld+json">{"@type":"WebPage"}</script></head>'), url), expected)
  assert.throws(() => fingerprintPage(html.replace(url, `${ORIGIN}/product`), url), /Canonical/)
  assert.throws(() => fingerprintPage(html.replace('</head>', '<meta name="robots" content="noindex"></head>'), url), /noindex/)
  assert.throws(() => fingerprintPage(html, url, '', 'bingbot: noindex'), /noindex/)
  assert.equal(fingerprintPage(page(`${ORIGIN}/`).replace(`href="${ORIGIN}/"`, `href="${ORIGIN}"`), `${ORIGIN}/`), fingerprintPage(page(`${ORIGIN}/`), `${ORIGIN}/`))
})

test('default dry run fetches live evidence but creates no state and never posts', async t => {
  const f = await fixture(t)
  const report = await f.run()
  assert.equal(report.error, undefined)
  assert.equal(report.mode, 'dry-run')
  assert.deepEqual(report.changes, [{ url: `${ORIGIN}/`, change: 'added' }])
  assert.equal(report.remaining, 1)
  assert.equal(report.received, 0)
  assert.equal(f.requests.some(request => request.method === 'POST'), false)
  await assert.rejects(readFile(f.stateFile), { code: 'ENOENT' })
})

test('200 receipt persists, unchanged content stays quiet, and an undated hub update is detected', async t => {
  const url = `${ORIGIN}/compare`
  const f = await fixture(t, [{ url }])
  const first = await f.run({ submit: true })
  assert.equal(first.received, 1)
  assert.equal((await f.state()).receipts[0].result, 'received')
  const second = await f.run({ submit: true })
  assert.deepEqual(second.changes, [])
  assert.equal(f.requests.filter(request => request.method === 'POST').length, 1)
  f.responses.set(url, { body: page(url, 'New product comparison'), type: 'text/html' })
  const third = await f.run()
  assert.deepEqual(third.changes, [{ url, change: 'changed' }])
  assert.equal((await f.state()).receipts.length, 1)
})

test('202 is saved as receipt pending key validation, never reported as indexed or validated', async t => {
  const f = await fixture(t)
  f.statuses[0] = 202
  const report = await f.run({ submit: true })
  assert.equal(report.received, 0)
  assert.equal(report.keyValidationPending, 1)
  assert.equal(report.remaining, 0)
  assert.equal(report.storedPendingValidationReceipts, 1)
  const state = await f.state()
  assert.equal(state.receipts[0].status, 202)
  assert.equal(state.receipts[0].result, 'key-validation-pending')
  assert.equal(state.urls[`${ORIGIN}/`].status, 202)
  const later = await f.run()
  assert.deepEqual(later.changes, [])
  assert.equal(later.storedPendingValidationReceipts, 1)
})

test('accepted batches survive a later refusal and retry submits only the remaining URLs', async t => {
  const entries = Array.from({ length: BATCH_SIZE + 1 }, (_, index) => ({ url: `${ORIGIN}/guides/topic-${index}` }))
  const f = await fixture(t, entries)
  f.statuses.splice(0, 1, 200, 429)
  const report = await f.run({ submit: true })
  assert.match(report.error, /429/)
  assert.equal(report.received, BATCH_SIZE)
  assert.equal(report.remaining, 1)
  assert.equal(Object.keys((await f.state()).urls).length, BATCH_SIZE)
  assert.equal((await f.state()).receipts.length, 1)
  f.statuses[0] = 200
  const resumed = await f.run({ submit: true })
  assert.equal(resumed.error, undefined)
  assert.deepEqual(resumed.changes, [{ url: entries.at(-1).url, change: 'added' }])
  assert.equal(Object.keys((await f.state()).urls).length, entries.length)
})

test('live key mismatch or unavailable page cannot post or alter the previous snapshot', async t => {
  const f = await fixture(t)
  await f.run({ submit: true })
  const previous = await readFile(f.stateFile, 'utf8')
  f.responses.set(keyLocation, { body: 'wrong-key', type: 'text/plain' })
  assert.match((await f.run({ submit: true })).error, /key file/)
  f.responses.set(keyLocation, { body: key, type: 'text/plain' })
  f.responses.set(`${ORIGIN}/`, { body: 'Temporary failure', type: 'text/html', status: 503 })
  assert.match((await f.run({ submit: true })).error, /unavailable/)
  assert.equal(await readFile(f.stateFile, 'utf8'), previous)
  assert.equal(f.requests.filter(request => request.method === 'POST').length, 1)
})

test('removed pages require a confirmed 404/410 and accepted deletion leaves a durable receipt', async t => {
  const url = `${ORIGIN}/product`
  const f = await fixture(t, [{ url: `${ORIGIN}/` }, { url }])
  await f.run({ submit: true })
  const previous = await readFile(f.stateFile, 'utf8')
  f.responses.set(`${ORIGIN}/sitemap.xml`, { body: sitemap([{ url: `${ORIGIN}/` }]), type: 'application/xml' })
  assert.match((await f.run({ submit: true })).error, /not 404\/410/)
  assert.equal(await readFile(f.stateFile, 'utf8'), previous)
  f.responses.set(url, { body: 'Gone', status: 410, type: 'text/html' })
  const report = await f.run({ submit: true })
  assert.equal(report.error, undefined)
  assert.deepEqual(report.changes, [{ url, change: 'deleted' }])
  assert.equal((await f.state()).urls[url], undefined)
  assert.deepEqual((await f.state()).receipts.at(-1).changes, [{ url, change: 'deleted' }])
})

test('empty sitemap, noncanonical and noindex pages are rejected before any submission', async t => {
  const f = await fixture(t)
  const invalid = [
    [ `${ORIGIN}/sitemap.xml`, { body: '<urlset></urlset>', type: 'application/xml' }, /valid public URLs/ ],
    [ `${ORIGIN}/`, { body: page(`${ORIGIN}/product`), type: 'text/html' }, /Canonical/ ],
    [ `${ORIGIN}/`, { body: page(`${ORIGIN}/`), type: 'text/html', headers: { 'x-robots-tag': 'noindex' } }, /noindex/ ],
  ]
  for (const [url, response, expected] of invalid) {
    const before = f.responses.get(url)
    f.responses.set(url, response)
    assert.match((await f.run({ submit: true })).error, expected)
    f.responses.set(url, before)
  }
  assert.equal(f.requests.some(request => request.method === 'POST'), false)
  await assert.rejects(readFile(f.stateFile), { code: 'ENOENT' })
})

test('a corrupted/private state and an existing run lock fail closed', async t => {
  const f = await fixture(t)
  await writeFile(f.stateFile, JSON.stringify({ version: 1, host: 'kivilo.app', receipts: [],
    urls: { [`${ORIGIN}/reports/credential`]: { fingerprint: 'a'.repeat(64), lastmod: '' } } }))
  assert.match((await f.run({ submit: true })).error, /Only canonical/)
  assert.equal(f.requests.length, 0)
  await mkdir(`${f.stateFile}.lock`)
  await writeFile(join(`${f.stateFile}.lock`, 'owner'), 'active')
  assert.match((await f.run({ submit: true })).error, /lock exists/)
  assert.equal(await readFile(join(`${f.stateFile}.lock`, 'owner'), 'utf8'), 'active')
})

test('bounded reads and HTTP failures leave the first batch unacknowledged', async t => {
  const f = await fixture(t)
  f.responses.set(keyLocation, { body: key.repeat(40), type: 'text/plain' })
  assert.match((await f.run({ submit: true })).error, /exceeds 1024/)
  f.responses.set(keyLocation, { body: key, type: 'text/plain' })
  f.statuses[0] = 403
  assert.match((await f.run({ submit: true })).error, /403/)
  await assert.rejects(readFile(f.stateFile), { code: 'ENOENT' })
})
