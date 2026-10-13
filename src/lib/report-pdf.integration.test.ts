import { randomUUID } from 'node:crypto'
import sharp from 'sharp'
import { afterAll, describe, expect, it, vi } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/auth', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/auth')>()
  return { ...actual, requireAgent: vi.fn() }
})

import { db } from '@/lib/db'
import { requireAgent } from '@/lib/auth'
import { revokeReportLink, shareReport } from '@/lib/actions'
import { saveBranding, saveBrandingLogo } from '@/lib/branding'
import { CAPTURE_BUCKET, serviceClient, uploadBytes } from '@/lib/storage'
import { reportPrefix } from '@/lib/report-pdf/model'
import { reportPdfUrl } from '@/lib/report-pdf/render'
import { pdfPageTexts } from '@/lib/report-pdf/pdf-text'

const POSTAL = '991577'
const written: string[] = []

afterAll(async () => {
  const storage = serviceClient().storage.from(CAPTURE_BUCKET)
  for (const prefix of written) {
    const { data } = await storage.list(prefix)
    if (data?.length) await storage.remove(data.map((object) => `${prefix}/${object.name}`))
  }
  await db.property.deleteMany({ where: { postalCode: POSTAL } })
  await db.stakeholder.deleteMany({ where: { email: { endsWith: '@report-pdf.test' } } })
  await db.$disconnect()
})

async function signedReport(status: 'COMPLETED' | 'AWAITING_SIGNATURE' = 'COMPLETED') {
  const run = randomUUID().slice(0, 8)
  const [agent, landlord, tenant] = await Promise.all(['agent', 'landlord', 'tenant'].map((role) =>
    db.stakeholder.create({ data: { name: `PDF ${role}`, email: `${role}-${run}@report-pdf.test` } })))
  vi.mocked(requireAgent).mockResolvedValue(agent)
  const property = await db.property.create({
    data: { line1: '27 Jalan Merah Saga', unit: '#02-05', postalCode: POSTAL, type: 'PRIVATE_NON_LANDED' },
  })
  const tenancy = await db.tenancy.create({
    data: {
      propertyId: property.id, landlordId: landlord.id, tenantId: tenant.id, agentId: agent.id,
      startDate: new Date('2025-08-22'), endDate: new Date('2027-08-21'), monthlyRent: '7200', deposit: '14400',
    },
  })
  const inspection = await db.inspection.create({
    data: { tenancyId: tenancy.id, kind: 'CHECK_IN', status, conductedAt: new Date('2025-08-22T02:30:00Z'), conductedById: agent.id },
  })
  const room = await db.room.create({ data: { inspectionId: inspection.id, name: 'Master bedroom', order: 0, status: 'REVIEWED' } })
  written.push(room.id, reportPrefix(inspection.id), `branding/${agent.id}`)

  const photo = await sharp({ create: { width: 480, height: 640, channels: 3, background: '#a8a29e' } }).jpeg().toBuffer()
  const captures = []
  for (const note of [null, 'Laminate peels off']) {
    const storagePath = await uploadBytes(`${room.id}/${randomUUID()}.jpg`, photo, 'image/jpeg')
    captures.push(await db.capture.create({
      data: { roomId: room.id, kind: 'PHOTO', storagePath, mimeType: 'image/jpeg', sizeBytes: photo.length, note, processedAt: new Date() },
    }))
  }
  await db.inspectionItem.create({
    data: {
      roomId: room.id, name: 'Wardrobe', category: 'FURNITURE', condition: 'POOR', notes: 'Laminate peeling at the base',
      editedByHuman: true, evidence: { create: [{ captureId: captures[1].id }] },
    },
  })
  return { agent, inspection }
}

async function storedReports(inspectionId: string) {
  const { data, error } = await serviceClient().storage.from(CAPTURE_BUCKET).list(reportPrefix(inspectionId))
  if (error) throw error
  return data.map((object) => object.name)
}

async function fetchPdf(url: string) {
  const response = await fetch(url)
  expect(response.status).toBe(200)
  return new Uint8Array(await response.arrayBuffer())
}

describe('report PDF', () => {
  it('draws a countersigned report once, and again only when something on it changes', async () => {
    const { agent, inspection } = await signedReport()
    await saveBranding(agent.id, { agentName: 'Alaric Yeo', agencyName: 'Example Realty', ceaRegistration: 'R123456B' })

    const first = await reportPdfUrl(inspection.id)
    const pages = await pdfPageTexts(await fetchPdf(first!))
    const text = pages.join(' ')
    expect(text).toContain('Example Realty')
    expect(text).toContain('Alaric Yeo')
    expect(text).toContain('CEA registration R123456B')
    expect(text).toContain('1. Master bedroom')
    expect(text).toContain('Laminate peels off')
    expect(pages.at(-1)).toContain(`Page ${pages.length} of ${pages.length}`)
    const download = await fetch(first!)
    expect(download.headers.get('content-disposition')).toContain('filename=Check-in%20report%2002-05%2027%20Jalan%20Merah%20Saga.pdf')
    await download.arrayBuffer()
    const [stored] = await storedReports(inspection.id)

    // Unchanged inputs: the stored copy is served, nothing is drawn again.
    await reportPdfUrl(inspection.id)
    expect(await storedReports(inspection.id)).toEqual([stored])

    // A new logo lands at the same storage path, so only the branding row's timestamp
    // can tell the cache. One copy remains: the new one.
    const logo = await sharp({ create: { width: 300, height: 80, channels: 4, background: '#1d4ed8' } }).png().toBuffer()
    await saveBrandingLogo(agent.id, logo)
    await reportPdfUrl(inspection.id)
    const after = await storedReports(inspection.id)
    expect(after).toHaveLength(1)
    expect(after[0]).not.toBe(stored)
  })

  it('makes no document of a report that is not countersigned', async () => {
    const { inspection } = await signedReport('AWAITING_SIGNATURE')
    expect(await reportPdfUrl(inspection.id)).toBeNull()
    expect(await storedReports(inspection.id)).toEqual([])
  })

  it('withdraws generated copies when the share link is revoked', async () => {
    const { inspection } = await signedReport()
    await shareReport(inspection.id)
    await reportPdfUrl(inspection.id)
    expect(await storedReports(inspection.id)).toHaveLength(1)

    await revokeReportLink(inspection.id)
    expect(await storedReports(inspection.id)).toEqual([])
  })
})
