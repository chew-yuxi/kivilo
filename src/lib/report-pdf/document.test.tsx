import { renderToBuffer } from '@react-pdf/renderer'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { ReportDocument, type ReportAssets } from './document'
import type { ReportModel, ReportPhoto, ReportRoom } from './model'
import { notedEntries } from './model'
import { pdfPageTexts } from './pdf-text'

function photo(room: number, index: number, extra: Partial<ReportPhoto> = {}): ReportPhoto {
  return {
    ref: `${room}.${index}`,
    anchor: `photo-${room}-${index}`,
    storagePath: `room-${room}/${index}.jpg`,
    note: null,
    annotations: null,
    shows: [],
    ...extra,
  }
}

function room(number: number, name: string, photos: number, items: ReportRoom['items'] = []): ReportRoom {
  return {
    number,
    name,
    anchor: `room-${number}`,
    items,
    photos: Array.from({ length: photos }, (_, index) => photo(number, index + 1)),
  }
}

function model(rooms: ReportRoom[]): ReportModel {
  return {
    inspectionId: 'inspection',
    reference: 'ABCD1234',
    kind: 'CHECK_IN',
    address: '#02-05, 27 Jalan Merah Saga, Singapore 278106',
    unit: '#02-05',
    line1: '27 Jalan Merah Saga',
    // 23:30 UTC is 7:30am the next day in Singapore.
    conductedAt: '2025-08-21T23:30:00.000Z',
    inspector: 'Alaric Yeo',
    landlord: 'Tan Wei Ming',
    tenant: 'Priya Raman',
    tenancyStart: '2025-08-22T00:00:00.000Z',
    tenancyEnd: '2027-08-21T00:00:00.000Z',
    deposit: '14400',
    preparer: { name: 'Alaric Yeo', email: 'alaric@example.com' },
    branding: {
      agencyName: 'Example Realty',
      agencyLicence: 'L1234567A',
      ceaRegistration: 'R123456B',
      phone: '+65 6000 0000',
      logoPath: null,
      updatedAt: '2026-10-13T00:00:00.000Z',
    },
    rooms,
    noted: rooms.map((each) => ({ room: each, entries: notedEntries(each) })).filter(({ entries }) => entries.length > 0),
    signatures: [],
    assessment: null,
  }
}

async function render(report: ReportModel) {
  const jpeg = await sharp({ create: { width: 600, height: 800, channels: 3, background: '#9ca3af' } }).jpeg().toBuffer()
  const bitmap = { data: jpeg, width: 600, height: 800, format: 'jpg' as const }
  const assets: ReportAssets = {
    photos: new Map(report.rooms.flatMap((each) => each.photos.map((p) => [p.storagePath, bitmap]))),
    logo: null,
    signatures: [],
    evidence: new Map(),
  }
  return pdfPageTexts(await renderToBuffer(<ReportDocument model={report} assets={assets} />))
}

describe('report PDF', () => {
  it('heads and numbers every page, and dates it in Singapore time', async () => {
    const pages = await render(model([room(1, 'Entrance', 4), room(2, 'Kitchen', 30)]))

    expect(pages.length).toBeGreaterThan(3)
    pages.forEach((text, index) => {
      expect(text).toContain(`Page ${index + 1} of ${pages.length}`)
      expect(text).toContain('Report ABCD1234')
    })
    for (const text of pages.slice(1)) {
      expect(text).toContain('Check-in condition report')
      expect(text).toContain('27 Jalan Merah Saga')
      expect(text).toContain('Friday, 22 August 2025')
    }
  })

  it('starts each room on its own page and repeats its heading when it runs over', async () => {
    const pages = await render(model([room(1, 'Entrance', 2), room(2, 'Kitchen', 30)]))
    // The cover's contents list names every room too, so start after it.
    const kitchen = pages.slice(1).filter((text) => text.includes('2. Kitchen'))

    expect(pages.find((text) => text.includes('1. Entrance') && text.includes('2 photos'))).toBeDefined()
    expect(kitchen.length).toBeGreaterThan(1)
    expect(kitchen[0]).toContain('30 photos')
    for (const text of kitchen.slice(1)) expect(text).toContain('continued')
    expect(pages.slice(1).some((text) => text.includes('1. Entrance') && text.includes('2. Kitchen'))).toBe(false)
  })

  it('lists noted condition with photo references, and captions in place', async () => {
    const bedroom = room(1, 'Master bedroom', 3, [{
      name: 'Wardrobe',
      quantity: 1,
      condition: 'POOR',
      identifier: null,
      meterReading: null,
      notes: 'Laminate peeling at the base',
      photoRefs: [{ ref: '1.2', anchor: 'photo-1-2' }],
    }])
    bedroom.photos[1].note = 'Laminate peels off'
    bedroom.photos[2].note = 'Scratch on door'

    const pages = await render(model([bedroom]))
    const noted = pages.find((text) => text.includes('Noted condition') && text.includes('Wardrobe'))

    expect(noted).toContain('Poor')
    expect(noted).toContain('Laminate peeling at the base')
    // Photo 1.2 is cited by the wardrobe's row, so it is not listed again on its own;
    // 1.3 is cited by nothing and is.
    expect(noted).toContain('Photo 1.3 Scratch on door')
    expect(noted!.match(/Photo 1\.2/g)).toHaveLength(1)
    expect(pages.join(' ')).toContain('Laminate peels off')
  })
})
