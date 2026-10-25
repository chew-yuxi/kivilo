/**
 * Rebuild the public report and its previews with the production PDF component.
 * Run from the repository root:
 *   node marketing/design/report-preview.mjs
 * Requires Poppler's pdftoppm for the previews.
 *
 * All identities, dates, property details and signatures below are fictional.
 * The artwork is the existing public landing-page illustration. No database query,
 * storage request, customer data or production-issued report is used here.
 * This file never calls the production issue/store/verification pipeline.
 */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { cloneElement } from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import sharp from 'sharp'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const output = join(root, 'marketing/public/reports')
// The app loads these TSX modules through Next/Vite. Compile the same source to ESM
// for a standalone run, preserving @react-pdf's ESM-only dependency imports.
const require = createRequire(import.meta.url)
const { build } = createRequire(require.resolve('tsx'))('esbuild')
const rendererPath = join(root, `marketing/design/report-renderer-${process.pid}.mjs`)
await build({
  stdin: { contents: `export { ReportDocument } from './src/lib/report-pdf/document.tsx'; export { notedEntries } from './src/lib/report-pdf/model.ts'; export { pdfPageTexts } from './src/lib/report-pdf/pdf-text.ts'`, resolveDir: root },
  outfile: rendererPath, bundle: true, packages: 'external', platform: 'node', format: 'esm',
  tsconfig: join(root, 'tsconfig.json'),
  plugins: [{ name: 'no-customer-data', setup(builder) {
    builder.onResolve({ filter: /^@\/lib\/db$/ }, () => ({ path: 'blocked-database', namespace: 'public-report' }))
    builder.onLoad({ filter: /.*/, namespace: 'public-report' }, () => ({ contents: `export const db = new Proxy({}, { get() { throw new Error('The public report must never query a database') } })` }))
  } }],
})
let renderer
try {
  renderer = await import(pathToFileURL(rendererPath).href)
} finally {
  await rm(rendererPath)
}
const { ReportDocument, notedEntries, pdfPageTexts } = renderer
const artwork = await readFile(join(root, 'marketing/public/art/workflow-capture.webp'))
const inspectedAt = '2026-10-24T02:00:00.000Z'

// Match the living-room sideboard and mark shown in the landing-page walkthrough.
// These are presentation crops of public artwork, not altered property evidence.
const cabinet = await sharp(artwork).resize(1500, 1000).extract({ left: 730, top: 280, width: 730, height: 560 }).png().toBuffer()
const detail = await sharp(artwork).resize(1500, 1000).extract({ left: 980, top: 400, width: 470, height: 400 }).png().toBuffer()
const photos = [
  {
    ref: '1.1', anchor: 'photo-1-1', storagePath: 'public-report/sideboard.png',
    note: 'Sideboard, both doors closed.', annotations: null, shows: ['Sideboard'],
  },
  {
    ref: '1.2', anchor: 'photo-1-2', storagePath: 'public-report/sideboard-detail.png',
    note: 'Scuff on the lower-right door.', shows: ['Sideboard'],
    annotations: {
      v: 1, by: 'public-report-inspector', at: inspectedAt, w: 470, h: 400,
      marks: [{ shape: 'ring', cx: (1278 - 980) / 470, cy: (662.5 - 400) / 400, rx: 58 / 470, ry: 72.5 / 400, note: 'Existing scuff recorded at move-in.' }],
    },
  },
]
const room = {
  number: 1, name: 'Living room', anchor: 'room-1', photos,
  items: [
    { name: 'Walls & ceiling', quantity: 1, condition: 'GOOD', notes: 'White paint. No visible cracks, stains or peeling.' },
    { name: 'Floor', quantity: 1, condition: 'GOOD', notes: 'Timber finish. Clean, with no visible chips or loose boards.' },
    { name: 'Windows', quantity: 2, condition: 'GOOD', notes: 'Glass intact. Both windows open, close and lock.' },
    { name: 'Curtains', quantity: 2, condition: 'GOOD', notes: 'Full-length grey curtains. Fabric clean; tracks run smoothly.' },
    { name: 'Ceiling light', quantity: 1, condition: 'GOOD', notes: 'Switch and light working.' },
    { name: 'Sofa', quantity: 1, condition: 'GOOD', notes: 'Three-seat sofa. Upholstery clean; cushions and feet intact.' },
    { name: 'Sideboard', quantity: 1, condition: 'FAIR', notes: 'Scuff on the lower-right door. Both doors open and close smoothly.', photoRefs: photos.map(({ ref, anchor }) => ({ ref, anchor })) },
  ].map(item => ({ identifier: null, meterReading: null, photoRefs: [], ...item })),
}

// The same invented ink drawings used in the landing page, never a real signature.
const signaturePaths = [
  [
    'M13 49C25 32 32 13 39 14C46 16 37 43 34 51M20 38C31 33 44 31 53 33M43 44C56 29 64 12 58 13C51 15 45 41 50 46C54 50 64 40 67 35C68 31 62 32 60 38C57 47 66 49 75 40M74 34L84 45M87 32L74 47M96 46C114 30 125 9 117 10C108 12 99 39 102 47C105 54 120 44 127 39M128 33C124 39 123 45 128 45C133 45 138 36 140 32L135 45C143 31 150 30 146 41L144 45C152 31 160 29 156 40C152 51 165 44 173 38C185 29 197 30 206 27',
    'M130 24L131 23M25 60C75 52 138 56 195 48',
  ],
  [
    'M18 23C37 15 61 14 76 17M58 17C49 34 43 58 28 59C18 60 13 51 23 45C29 42 36 45 38 48M51 44L62 31L58 44L72 30L66 44L80 29C75 41 76 48 89 35M94 24L123 18M111 14L98 43C95 52 107 42 114 34C119 28 123 33 119 39C113 48 108 43 115 36C122 29 126 30 123 40C121 46 128 42 135 32L130 44C142 28 149 28 145 39C141 49 153 41 161 34L158 42C169 30 177 32 173 38C171 43 181 40 190 34L205 30',
    'M73 57L195 49L180 55',
  ],
]
const signatures = await Promise.all(signaturePaths.map(paths => sharp(Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="880" height="288" viewBox="0 0 220 72"><g fill="none" stroke="#172033" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths.map(d => `<path d="${d}"/>`).join('')}</g></svg>`,
)).png().toBuffer()))

const report = {
  inspectionId: 'public-report-ET102426', reference: 'ET102426', kind: 'CHECK_IN',
  address: 'Apartment 08-12, Linden Court', unit: '08-12', line1: 'Linden Court',
  conductedAt: inspectedAt, inspector: 'Morgan Lee', landlord: 'Alex Lim', tenant: 'Jim Tan',
  tenancyStart: '2026-10-24T00:00:00.000Z', tenancyEnd: '2027-10-23T00:00:00.000Z', deposit: '3000',
  preparer: { name: 'Morgan Lee', email: 'morgan@example.com' },
  branding: {
    agencyName: 'Elm & Tide', agencyLicence: null, ceaRegistration: null, phone: null,
    logoPath: null, updatedAt: inspectedAt,
  },
  rooms: [room], noted: [{ room, entries: notedEntries(room) }],
  assessment: null, addenda: [], signatures: [],
}
// One deterministic fictional fingerprint for both signatures. This public document
// is not registered with /verify and never claims to be a real signed tenancy.
const contentHash = createHash('sha256').update(JSON.stringify(report)).digest('hex')
report.signatures = [
  { name: report.landlord, role: 'Landlord', signedAt: '2026-10-24T03:05:00.000Z' },
  { name: report.tenant, role: 'Tenant', signedAt: '2026-10-24T03:08:00.000Z' },
].map((signature, index) => ({ ...signature, contentHash, imageData: 'data:image/png;base64,' + signatures[index].toString('base64') }))

const assets = {
  photos: new Map([
    [photos[0].storagePath, { data: cabinet, width: 730, height: 560, format: 'png' }],
    [photos[1].storagePath, { data: detail, width: 470, height: 400, format: 'png' }],
  ]),
  logo: null, evidence: new Map(),
  signatures: signatures.map(data => ({ data, width: 880, height: 288, format: 'png' })),
}
const document = cloneElement(ReportDocument({ model: report, assets }), {
  subject: 'Fictional property report demonstrating Kivilo. All identities, property details and signatures are invented; no customer information is included.',
  creationDate: new Date(inspectedAt), modificationDate: new Date(inspectedAt),
})
const pdf = await renderToBuffer(document)
const pageTexts = await pdfPageTexts(pdf)
assert.equal(pageTexts.length, 4, 'Expected cover, noted condition, living room and agreement pages')
assert.match(pageTexts[0], /Elm & Tide.*Condition report.*Apartment 08-12, Linden Court/)
assert.match(pageTexts[2], /Living room.*Sideboard.*Scuff on the lower-right door/)
assert.match(pageTexts[3], /Alex Lim.*Jim Tan/)
assert.ok(pageTexts.every((text, index) => text.includes(`Page ${index + 1} of 4`)))
assert.ok(!pageTexts.join(' ').includes('Photo unavailable'))
assert.ok(!pageTexts.join(' ').includes('CEA registration'))
await mkdir(output, { recursive: true })
const pdfPath = join(output, 'property-condition-report.pdf')
await writeFile(pdfPath, pdf)

const temporary = await mkdtemp(join(tmpdir(), 'kivilo-report-preview-'))
try {
  for (const [page, name] of [[1, 'report-cover'], [3, 'report-inventory']]) {
    const prefix = join(temporary, name)
    execFileSync('pdftoppm', ['-f', String(page), '-l', String(page), '-singlefile', '-scale-to', '1684', '-png', pdfPath, prefix])
    await sharp(prefix + '.png').webp({ quality: 92 }).toFile(join(output, name + '.webp'))
  }
} finally {
  await rm(temporary, { recursive: true, force: true })
}
console.log(`Wrote ${pdfPath} (${pdf.length} bytes, ${pageTexts.length} pages) and two page previews.`)
