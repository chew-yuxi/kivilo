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
    addenda: [],
  }
}

async function render(report: ReportModel) {
  const jpeg = await sharp({ create: { width: 600, height: 800, channels: 3, background: '#9ca3af' } }).jpeg().toBuffer()
  const bitmap = { data: jpeg, width: 600, height: 800, format: 'jpg' as const }
  const assets: ReportAssets = {
    photos: new Map(report.rooms.flatMap((each) => each.photos.map((p) => [p.storagePath, bitmap]))),
    logo: null,
    signatures: [],
    evidence: new Map([
      ...report.addenda.flatMap((each) => each.entries.flatMap((entry) => entry.photos.map((p) => [p.storagePath, bitmap] as const))),
      ...(report.assessment?.findings ?? []).flatMap((finding) => (finding.photos ?? []).map((photo) => [photo.storagePath, bitmap] as const)),
    ]),
  }
  return pdfPageTexts(await renderToBuffer(<ReportDocument model={report} assets={assets} />))
}

describe('report PDF', () => {
  it('renders the assessment version\'s marked finding photos beside its finding across pages', async () => {
    const report = model([room(1, 'Kitchen', 0)])
    report.kind = 'CHECK_OUT'
    report.assessment = {
      schemaVersion: 1, version: 1, publishedAt: '2026-10-21T02:00:00.000Z',
      summary: null, deposit: '14400', responses: [],
      findings: [{
        id: 'burn', itemLabel: 'Kitchen, Worktop', changeType: 'DAMAGE', verdict: 'TENANT_LIABLE',
        rationale: 'Burn beside the hob.', estimatedCost: '180', confidence: null, editedByHuman: true,
        photos: Array.from({ length: 12 }, (_, index) => ({
          id: `finding-photo-${index}`, storagePath: `finding-evidence/private-path-${index}.jpg`, mimeType: 'image/jpeg' as const,
          note: `Finding evidence caption ${index + 1}`, createdAt: '2026-10-21T01:00:00.000Z',
          annotations: {
            v: 1 as const, by: 'inspector', at: '2026-10-21T01:00:00.000Z', w: 1200, h: 1600,
            marks: [{ shape: 'ring' as const, cx: .5, cy: .5, rx: .15, ry: .1, note: `Burn detail ${index + 1}` }],
          },
        })),
      }],
    }
    const pages = await render(report)
    const text = pages.join(' ')
    expect(text).toContain('Kitchen, Worktop')
    expect(text).toContain('Finding photos')
    for (let index = 1; index <= 12; index++) {
      expect(text).toContain(`F1.${index}`)
      expect(text).toContain(`Finding evidence caption ${index}`)
      expect(text).toContain(`1. Burn detail ${index}`)
    }
    expect(text).not.toContain('Photo unavailable')
    expect(text).not.toContain('finding-evidence/')
    expect(text).not.toContain('private-path')
    const assessmentPages = pages.filter((page) => page.includes('Finding evidence caption'))
    expect(assessmentPages.length).toBeGreaterThan(1)
    pages.forEach((page, index) => expect(page).toContain(`Page ${index + 1} of ${pages.length}`))
  })

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

  it('says so when the inspector confirmed a room had nothing to record', async () => {
    const pages = await render(model([room(1, 'Store room', 0)]))

    expect(pages.join(' ')).toContain('Nothing recorded in this room.')
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

  it('prints the content fingerprint beside each signature that recorded one', async () => {
    const report = model([room(1, 'Entrance', 0)])
    report.signatures = [
      { name: 'Tan Wei Ming', role: 'Landlord', signedAt: '2025-08-22T02:00:00.000Z', imageData: '', contentHash: 'ab12cd34ef567890'.repeat(4) },
      // Signed before fingerprints existed.
      { name: 'Priya Raman', role: 'Tenant', signedAt: '2025-08-22T02:05:00.000Z', imageData: '', contentHash: null },
    ]
    const text = (await render(report)).join(' ')

    expect(text).toContain('Content fingerprint AB12 CD34 EF56 7890')
    expect(text.match(/Content fingerprint/g)).toHaveLength(1)
  })

  it('draws each update after the signatures with its date, and says who has not acknowledged it and who did so in person', async () => {
    const report = model([room(1, 'Kitchen', 1)])
    report.addenda = [{
      id: 'addendum-1',
      schemaVersion: 1,
      number: 1,
      title: 'New dishwasher',
      reason: 'The old one failed',
      // 16:30 UTC is half past midnight the next day in Singapore.
      effectiveDate: '2025-09-10T16:30:00.000Z',
      publishedAt: '2025-09-11T02:00:00.000Z',
      publishedBy: 'Alaric Yeo',
      contentHash: 'hash',
      acknowledgedAt: null,
      source: 'AGENT_UPDATE',
      moveInDefect: null,
      dispute: null,
      acknowledgements: [
        { role: 'Landlord', name: 'Tan Wei Ming', stakeholderId: 'landlord-1', acknowledgedAt: '2025-09-11T03:00:00.000Z', inPerson: true },
        { role: 'Tenant', name: 'Priya Raman', stakeholderId: 'tenant-1', acknowledgedAt: null, inPerson: false },
      ],
      entries: [{
        id: 'entry-1',
        change: 'REPLACED',
        roomName: 'Kitchen',
        notes: 'Installed by the landlord',
        target: { key: 'item:old', name: 'Dishwasher', condition: 'POOR', quantity: 1, identifier: 'Bosch SMS2', notes: null },
        line: {
          key: 'entry:entry-1', name: 'Dishwasher', category: 'APPLIANCE', condition: 'NEW', quantity: 1,
          identifier: 'Miele G7100 SN 123', notes: 'Installed by the landlord', propertyAssetId: null,
        },
        maintenanceCase: null,
        photos: [{ id: 'photo-1', storagePath: 'addenda/addendum-1/a.jpg', mimeType: 'image/jpeg', note: 'Rating plate', label: null }],
      }],
    }]

    const pages = await render(report)
    const update = pages.at(-1)!

    expect(pages[0]).toContain('Updated 11 September 2025')
    expect(update).toContain('Updated 11 September 2025')
    expect(update).toContain('Replaced: Dishwasher with Dishwasher')
    expect(update).toContain('Miele G7100 SN 123')
    expect(update).toContain('Rating plate')
    expect(update).toContain('Pending acknowledgement')
    expect(update).toContain('Landlord, acknowledged in person')
    expect(update).toContain('Tenant, pending acknowledgement')
    expect(update).toContain(`Page ${pages.length} of ${pages.length}`)
    expect(pages.findIndex((text) => text.includes('Agreement') && text.includes('signed by the'))).toBeLessThan(pages.length - 1)
  })

  it('keeps a disputed move-in claim visible with its dates without presenting it as an agreed replacement', async () => {
    const report = model([room(1, 'Kitchen', 0)])
    report.addenda = [{
      id: 'move-in-claim', schemaVersion: 1, number: 1,
      title: 'Move-in defect: chipped hob', reason: 'The tenant reported a chip present at move-in.',
      effectiveDate: '2026-10-18T02:00:00.000Z', publishedAt: '2026-10-18T03:00:00.000Z',
      publishedBy: 'Priya Raman', contentHash: 'claim-hash', acknowledgedAt: null,
      source: 'MOVE_IN_DEFECT',
      moveInDefect: { caseId: 'repair', reportedAt: '2026-10-18T02:00:00.000Z', deadline: '2026-10-30' },
      dispute: {
        disputedAt: '2026-10-19T02:00:00.000Z', disputedById: 'landlord',
        disputedBy: 'Tan Wei Ming', reason: 'The handover photo shows no chip.',
      },
      acknowledgements: [
        { role: 'Landlord', name: 'Tan Wei Ming', stakeholderId: 'landlord', acknowledgedAt: null, inPerson: false },
        { role: 'Tenant', name: 'Priya Raman', stakeholderId: 'tenant', acknowledgedAt: '2026-10-18T03:00:00.000Z', inPerson: false },
      ],
      entries: [{
        id: 'claim-entry', change: 'REPLACED', roomName: 'Kitchen', notes: 'Chip on the left corner.',
        target: { key: 'item:hob', name: 'Hob', condition: 'GOOD', quantity: 1, identifier: 'HOB123', notes: null },
        line: { key: 'entry:claim-entry', name: 'Hob', category: 'APPLIANCE', condition: 'DAMAGED', quantity: 1, identifier: 'HOB123', notes: 'Chip on the left corner.', propertyAssetId: null },
        maintenanceCase: { id: 'repair', title: 'Chipped hob' }, photos: [],
      }],
    }]
    const text = (await render(report)).join(' ')
    expect(text).toContain('Condition reported: Hob')
    expect(text).not.toContain('Replaced: Hob with Hob')
    expect(text).toContain('Reported by the tenant')
    expect(text).toContain('30 October 2026')
    expect(text).toContain('Disputed by Tan Wei Ming')
    expect(text).toContain('The handover photo shows no chip.')
    expect(text).toContain('not part of the agreed check-in')
    expect(text).toContain('Landlord, disputed')
  })
})
