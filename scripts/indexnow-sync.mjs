#!/usr/bin/env node
// Run after a marketing deployment. Read-only unless --submit is supplied.
// IndexNow receipts acknowledge delivery, not crawling or inclusion in search results.
import { createHash, randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const ORIGIN = 'https://kivilo.app'
export const ENDPOINT = 'https://api.indexnow.org/indexnow'
export const BATCH_SIZE = 100
const MAX_BATCHES = 5
const MAX_URLS = 1000
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024
const USER_AGENT = 'KiviloIndexNow/1.0 (+https://kivilo.app)'

// Extend deliberately when adding a public marketing route family. A sitemap or
// state file must never cause report credentials or app URLs to be submitted.
export function publicPageUrl(value) {
  if (typeof value !== 'string' || value.length > 2048) throw Error('Invalid public page URL.')
  const url = new URL(value)
  if (url.origin !== ORIGIN || url.username || url.password || url.search || url.hash ||
      value !== url.href || !/^\/(?:product|compare(?:\/[a-z0-9-]+)?|guides(?:\/[a-z0-9-]+)?)?$/.test(url.pathname)) {
    throw Error('Only canonical Kivilo marketing HTML URLs may be submitted.')
  }
  return value
}

function decodeEntities(value) {
  return value.replace(/&(?:amp|quot|apos|lt|gt|#\d+|#x[\da-f]+);/gi, entity => {
    const named = { '&amp;': '&', '&quot;': '"', '&apos;': "'", '&lt;': '<', '&gt;': '>' }
    if (named[entity.toLowerCase()]) return named[entity.toLowerCase()]
    const number = entity[2].toLowerCase() === 'x' ? parseInt(entity.slice(3, -1), 16) : Number(entity.slice(2, -1))
    return String.fromCodePoint(number)
  })
}

export function parseSitemap(xml) {
  if (!/<urlset\b[^>]*>/.test(xml) || !/<\/urlset>\s*$/.test(xml) || /<!DOCTYPE|<!ENTITY/i.test(xml)) {
    throw Error('Expected one complete URL sitemap; refusing to infer deletions.')
  }
  const entries = []
  const seen = new Set()
  for (const [block] of xml.matchAll(/<url>\s*[\s\S]*?<\/url>/g)) {
    const locations = [...block.matchAll(/<loc>([^<]+)<\/loc>/g)]
    const dates = [...block.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)]
    if (locations.length !== 1 || dates.length > 1) throw Error('Malformed sitemap entry.')
    const url = publicPageUrl(decodeEntities(locations[0][1].trim()))
    const lastmod = dates[0]?.[1].trim() ?? ''
    if (lastmod && (!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(lastmod) || !Number.isFinite(Date.parse(lastmod)))) {
      throw Error('Invalid sitemap lastmod.')
    }
    if (seen.has(url)) throw Error('Duplicate sitemap URL.')
    seen.add(url)
    entries.push({ url, lastmod })
  }
  if (!entries.length || entries.length > MAX_URLS || entries.length !== [...xml.matchAll(/<loc>/g)].length) {
    throw Error('Sitemap must contain 1–1000 valid public URLs; nothing submitted.')
  }
  return entries
}

function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)]
    .map(([, name, double, single]) => [name.toLowerCase(), decodeEntities(double ?? single)]))
}

export function fingerprintPage(html, url, lastmod = '', robotsHeader = '') {
  const links = [...html.matchAll(/<link\b[^>]*>/gi)].map(([tag]) => attributes(tag))
  const canonical = links.filter(link => link.rel?.toLowerCase() === 'canonical')
  const metadata = [...html.matchAll(/<meta\b[^>]*>/gi)].map(([tag]) => attributes(tag))
  const robots = metadata.filter(meta => /^(robots|bingbot|googlebot)$/i.test(meta.name ?? '')).map(meta => meta.content).join(',')
  if (canonical.length !== 1 || !canonical[0].href || new URL(canonical[0].href).href !== url) throw Error(`Canonical does not match ${url}.`)
  if (/\b(?:noindex|none)\b/i.test(`${robotsHeader},${robots}`)) throw Error(`Page is marked noindex: ${url}.`)
  const body = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1]
  const title = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]
  if (!body || !title) throw Error(`Incomplete HTML page: ${url}.`)
  const visible = body.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '').replace(/<!--[\s\S]*?-->/g, '')
  const text = decodeEntities(visible.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim()
  const structuredData = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
    .map(([, json]) => JSON.parse(json))
  // Hash reader-visible content, destinations, metadata and structured data, not
  // Next.js bundle names / hydration payloads that change on unrelated builds.
  return createHash('sha256').update(JSON.stringify({
    lastmod, title: decodeEntities(title), text,
    metadata: metadata.filter(meta => /^(description|og:|twitter:)/.test(meta.name ?? meta.property ?? '')),
    destinations: [...visible.matchAll(/<(?:a|img)\b[^>]*>/gi)].map(([tag]) => {
      const { href, src, alt } = attributes(tag)
      return { href, src, alt }
    }),
    structuredData,
  })).digest('hex')
}

export function pendingChanges(previous, current) {
  return [
    ...Object.entries(current).filter(([url, entry]) => previous[url]?.fingerprint !== entry.fingerprint)
      .map(([url]) => ({ url, change: previous[url] ? 'changed' : 'added' })),
    ...Object.keys(previous).filter(url => !Object.hasOwn(current, url)).map(url => ({ url, change: 'deleted' })),
  ]
}

export function defaultStateFile() {
  const common = execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], {
    cwd: fileURLToPath(new URL('..', import.meta.url)), encoding: 'utf8',
  }).trim()
  return join(common, 'kivilo-seo', 'indexnow-state.json')
}

export async function syncIndexNow({ submit = false, stateFile = defaultStateFile(), fetchImpl = fetch,
  configFile = fileURLToPath(new URL('../marketing/indexnow.json', import.meta.url)),
} = {}) {
  const config = JSON.parse(await readFile(configFile, 'utf8'))
  if (config.host !== 'kivilo.app' || !/^[a-zA-Z0-9-]{8,128}$/.test(config.key) || config.keyLocation !== `${ORIGIN}/${config.key}.txt`) {
    throw Error('Invalid Kivilo IndexNow configuration.')
  }
  const report = { mode: submit ? 'submit' : 'dry-run', checkedAt: new Date().toISOString(),
    stateFile: resolve(stateFile), sitemapUrls: 0, changes: [], received: 0, keyValidationPending: 0,
    storedPendingValidationReceipts: 0, remaining: 0 }
  let locked = false
  const lock = `${stateFile}.lock`
  try {
    if (submit) {
      await mkdir(dirname(stateFile), { recursive: true })
      try { await mkdir(lock); locked = true }
      catch (error) {
        if (error.code === 'EEXIST') throw Error(`IndexNow lock exists: ${lock}. Check for an active run before removing a stale lock.`)
        throw error
      }
    }
    let state
    try { state = JSON.parse(await readFile(stateFile, 'utf8')) }
    catch (error) {
      if (error.code !== 'ENOENT') throw error
      state = { version: 1, host: config.host, urls: {}, receipts: [] }
    }
    if (state.version !== 1 || state.host !== config.host || !state.urls || typeof state.urls !== 'object' ||
        Array.isArray(state.urls) || !Array.isArray(state.receipts)) throw Error('Invalid IndexNow state; refusing to reset submission history.')
    for (const [url, entry] of Object.entries(state.urls)) {
      publicPageUrl(url)
      if (!entry || !/^[a-f0-9]{64}$/.test(entry.fingerprint) || typeof entry.lastmod !== 'string') throw Error('Invalid IndexNow URL state.')
    }
    // IndexNow provides no receipt-status polling API. Keep historical 202
    // responses visible even when there is no new content to notify today.
    report.storedPendingValidationReceipts = state.receipts.filter(receipt => receipt.status === 202).length

    const request = async (url, init = {}, maxBytes = MAX_RESPONSE_BYTES) => {
      const response = await fetchImpl(url, { ...init, redirect: 'manual', signal: AbortSignal.timeout(20000),
        headers: { 'user-agent': USER_AGENT, ...init.headers } })
      const chunks = []
      let bytes = 0
      if (response.body) {
        for await (const chunk of response.body) {
          bytes += chunk.byteLength
          if (bytes > maxBytes) throw Error(`Response exceeds ${maxBytes} bytes: ${url}.`)
          chunks.push(chunk)
        }
      }
      return { response, text: Buffer.concat(chunks).toString('utf8') }
    }
    const key = await request(config.keyLocation, {}, 1024)
    if (key.response.status !== 200 || !/^text\/plain\b/i.test(key.response.headers.get('content-type') ?? '') || key.text.trim() !== config.key) {
      throw Error('Live IndexNow key file is missing or does not match; deploy it before submitting.')
    }
    const sitemap = await request(`${ORIGIN}/sitemap.xml`)
    if (sitemap.response.status !== 200 || !/(?:text|application)\/xml\b/i.test(sitemap.response.headers.get('content-type') ?? '')) {
      throw Error(`Sitemap returned ${sitemap.response.status} or a non-XML content type; nothing submitted.`)
    }
    const entries = parseSitemap(sitemap.text)
    report.sitemapUrls = entries.length
    const current = {}
    for (const { url, lastmod } of entries) {
      const page = await request(url)
      if (page.response.status !== 200 || !/^text\/html\b/i.test(page.response.headers.get('content-type') ?? '')) {
        throw Error(`Public page is unavailable or not HTML: ${url} (${page.response.status}).`)
      }
      current[url] = { lastmod, fingerprint: fingerprintPage(page.text, url, lastmod, page.response.headers.get('x-robots-tag') ?? '') }
    }
    const changes = pendingChanges(state.urls, current)
    for (const { url, change } of changes) {
      if (change !== 'deleted') continue
      const removed = await request(url)
      if (![404, 410].includes(removed.response.status)) {
        throw Error(`URL left the sitemap but is not 404/410: ${url}. Resolve its sitemap or redirect before submitting.`)
      }
    }
    report.changes = changes
    report.remaining = changes.length
    for (let start = 0; submit && start < Math.min(changes.length, BATCH_SIZE * MAX_BATCHES); start += BATCH_SIZE) {
      const batch = changes.slice(start, start + BATCH_SIZE)
      const urlList = batch.map(({ url }) => url)
      const body = JSON.stringify({ ...config, urlList })
      if (Buffer.byteLength(body) > 256 * 1024) throw Error('IndexNow request exceeds the local 256 KiB limit.')
      const result = await request(ENDPOINT, { method: 'POST', headers: { 'content-type': 'application/json; charset=utf-8' }, body }, 8192)
      if (![200, 202].includes(result.response.status)) {
        throw Error(`IndexNow returned ${result.response.status}; this batch remains pending. ${result.text.replace(/\s+/g, ' ').slice(0, 200)}`)
      }
      const receipt = { submittedAt: new Date().toISOString(), status: result.response.status,
        result: result.response.status === 202 ? 'key-validation-pending' : 'received', changes: batch }
      for (const { url } of batch) {
        if (Object.hasOwn(current, url)) state.urls[url] = { ...current[url], submittedAt: receipt.submittedAt, status: receipt.status }
        else delete state.urls[url]
      }
      state.receipts.push(receipt)
      const temporary = `${stateFile}.${randomUUID()}.tmp`
      try {
        await writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600, flush: true })
        await rename(temporary, stateFile)
      } finally { await rm(temporary, { force: true }) }
      if (receipt.status === 202) {
        report.keyValidationPending += batch.length
        report.storedPendingValidationReceipts += 1
      }
      else report.received += batch.length
      report.remaining -= batch.length
    }
  } catch (error) {
    report.error = error instanceof Error ? error.message : String(error)
  } finally {
    if (locked) await rm(lock, { recursive: true })
  }
  return report
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const args = process.argv.slice(2)
  let submit = false
  let stateFile
  try {
    for (let index = 0; index < args.length; index++) {
      if (args[index] === '--submit' && !submit) submit = true
      else if (args[index] === '--state-file' && !stateFile && args[index + 1] && !args[index + 1].startsWith('--')) stateFile = resolve(args[++index])
      else throw Error('Usage: pnpm marketing:indexnow [--submit] [--state-file PATH]')
    }
    const report = await syncIndexNow({ submit, stateFile })
    console.log(JSON.stringify(report, null, 2))
    if (report.error) process.exitCode = 1
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}
