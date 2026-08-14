import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

/// The model is the one thing not exercised here. Extraction quality is judged by
/// running real captures through it; what this file pins is the persistence contract
/// around it, which is where a silent regression would actually cost someone their
/// reviewed work.
vi.mock('./extract', () => ({
  extractRoom: vi.fn(),
}))
vi.mock('@/lib/storage', () => ({
  downloadCapture: vi.fn(async () => new Uint8Array([1, 2, 3])),
}))

import { db } from '@/lib/db'
import { extractRoom } from './extract'
import { processRoom } from './process'

const extracted = (name: string, captureRef: string) => ({
  summary: `${name} summary`,
  transcript: '',
  items: [
    {
      name,
      category: 'FIXTURE' as const,
      condition: 'GOOD' as const,
      quantity: 1,
      notes: '',
      identifier: null,
      meterReading: null,
      sourceCaptureRef: captureRef,
      sourceTimestampSec: 3,
      confidence: 0.9,
    },
  ],
})

async function fixture() {
  const person = () => db.stakeholder.create({ data: { name: `P${Math.random()}` } })
  const [landlord, tenant] = [await person(), await person()]
  const property = await db.property.create({
    data: { line1: 'Test block', postalCode: '000000', type: 'PRIVATE_NON_LANDED' },
  })
  const tenancy = await db.tenancy.create({
    data: {
      propertyId: property.id,
      landlordId: landlord.id,
      tenantId: tenant.id,
      startDate: new Date('2024-01-01'),
      endDate: new Date('2026-01-01'),
      monthlyRent: '1000',
      deposit: '2000',
    },
  })
  const inspection = await db.inspection.create({
    data: { tenancyId: tenancy.id, kind: 'CHECK_IN' },
  })

  const makeRoom = async (name: string, order: number) => {
    const room = await db.room.create({ data: { inspectionId: inspection.id, name, order } })
    const capture = await db.capture.create({
      data: {
        roomId: room.id,
        kind: 'VIDEO',
        storagePath: `${room.id}/x.mp4`,
        mimeType: 'video/mp4',
        sizeBytes: 10,
      },
    })
    return { room, capture }
  }

  return {
    inspection,
    kitchen: await makeRoom('Kitchen', 0),
    bedroom: await makeRoom('Bedroom', 1),
  }
}

describe('processRoom', () => {
  beforeEach(() => vi.mocked(extractRoom).mockReset())

  afterAll(async () => {
    await db.$disconnect()
  })

  it('writes the extracted items into the room and marks it for review', async () => {
    const { kitchen } = await fixture()
    vi.mocked(extractRoom).mockResolvedValue(extracted('Oven', kitchen.capture.id))

    await processRoom(kitchen.room.id)

    const room = await db.room.findUniqueOrThrow({
      where: { id: kitchen.room.id },
      include: { items: true },
    })
    expect(room.status).toBe('REVIEW')
    expect(room.items.map((i) => i.name)).toEqual(['Oven'])
    expect(room.items[0].sourceCaptureId).toBe(kitchen.capture.id)
  })

  /// The regression this file exists for. An inspector re-shooting one room must not
  /// lose a room somebody already reviewed and corrected.
  it('leaves a sibling room untouched, including its item IDs and human edits', async () => {
    const { kitchen, bedroom } = await fixture()

    vi.mocked(extractRoom).mockResolvedValue(extracted('Wardrobe', bedroom.capture.id))
    await processRoom(bedroom.room.id)
    await db.inspectionItem.updateMany({
      where: { roomId: bedroom.room.id },
      data: { editedByHuman: true, notes: 'Checked on site' },
    })
    await db.room.update({ where: { id: bedroom.room.id }, data: { status: 'REVIEWED' } })

    const before = await db.inspectionItem.findMany({
      where: { roomId: bedroom.room.id },
      orderBy: { createdAt: 'asc' },
    })

    vi.mocked(extractRoom).mockResolvedValue(extracted('Oven', kitchen.capture.id))
    await processRoom(kitchen.room.id)

    const after = await db.inspectionItem.findMany({
      where: { roomId: bedroom.room.id },
      orderBy: { createdAt: 'asc' },
    })
    const room = await db.room.findUniqueOrThrow({ where: { id: bedroom.room.id } })

    expect(after.map((i) => i.id)).toEqual(before.map((i) => i.id))
    expect(after.map((i) => i.notes)).toEqual(['Checked on site'])
    expect(after.every((i) => i.editedByHuman)).toBe(true)
    expect(room.status).toBe('REVIEWED')
  })

  it('replaces its own items on a re-read rather than appending duplicates', async () => {
    const { kitchen } = await fixture()

    vi.mocked(extractRoom).mockResolvedValue(extracted('Oven', kitchen.capture.id))
    await processRoom(kitchen.room.id)
    vi.mocked(extractRoom).mockResolvedValue(extracted('Hob', kitchen.capture.id))
    await processRoom(kitchen.room.id)

    const items = await db.inspectionItem.findMany({ where: { roomId: kitchen.room.id } })
    expect(items.map((i) => i.name)).toEqual(['Hob'])
  })

  it('parks the room as FAILED with the reason when extraction throws', async () => {
    const { kitchen } = await fixture()
    // Once, not persistent. A throwing implementation left in place is reported by
    // Vitest as a test failure even though processRoom catches it; scoping the throw
    // to the single call it is meant for avoids that.
    vi.mocked(extractRoom).mockImplementationOnce(() => {
      throw new Error('model unavailable')
    })

    await expect(processRoom(kitchen.room.id)).rejects.toThrow('model unavailable')

    const room = await db.room.findUniqueOrThrow({ where: { id: kitchen.room.id } })
    expect(room.status).toBe('FAILED')
    expect(room.processingError).toBe('model unavailable')
  })

  it('drops a capture ref the model invented instead of failing the whole room', async () => {
    const { kitchen } = await fixture()
    vi.mocked(extractRoom).mockResolvedValue(extracted('Oven', 'cap_does_not_exist'))

    await processRoom(kitchen.room.id)

    const items = await db.inspectionItem.findMany({ where: { roomId: kitchen.room.id } })
    expect(items[0].sourceCaptureId).toBeNull()
    expect(items[0].name).toBe('Oven')
  })
})
