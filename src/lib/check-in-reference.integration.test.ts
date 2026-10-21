import { afterAll, describe, expect, it, vi } from 'vitest'

/// A check-out inspector walking a room sees it as it was at check-in: the lines the
/// check-out was started from and the photos both parties agreed to, and beside each
/// copied row, what that row said at check-in.

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/headers', () => ({ headers: async () => new Headers() }))
vi.mock('@/lib/storage', () => ({
  createDownloadUrl: vi.fn(async (path: string) => `https://storage.test/${path}`),
}))
vi.mock('@/lib/auth', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/auth')>()
  return { ...actual, requireAgent: vi.fn() }
})

import { db } from '@/lib/db'
import { authorizeInspection, requireAgent } from '@/lib/auth'
import { addRoom, createFinding, renameRoom, startCheckOut } from '@/lib/actions'
import { checkInPhotoUrls, checkInReference, signedCheckInReference } from '@/lib/check-in-reference'

const postalCode = '998812'

async function signedCheckIn(label: string) {
  const person = (name: string) => db.stakeholder.create({ data: { name: `${name} ${label}` } })
  const agent = await person('Agent')
  const property = await db.property.create({
    data: { line1: `${label} block`, postalCode, type: 'PRIVATE_NON_LANDED' },
  })
  const tenancy = await db.tenancy.create({
    data: {
      propertyId: property.id,
      landlordId: (await person('Landlord')).id,
      tenantId: (await person('Tenant')).id,
      agentId: agent.id,
      startDate: new Date('2024-01-01'),
      endDate: new Date('2026-01-01'),
      monthlyRent: '1000',
      deposit: '2000',
    },
  })
  vi.mocked(requireAgent).mockResolvedValue(agent)
  const checkIn = await db.inspection.create({
    data: {
      tenancyId: tenancy.id,
      kind: 'CHECK_IN',
      status: 'COMPLETED',
      conductedAt: new Date('2024-01-02T03:00:00Z'),
      rooms: {
        create: [
          {
            name: 'Kitchen',
            order: 0,
            status: 'REVIEWED',
            items: {
              create: [
                { name: 'Hob', category: 'APPLIANCE', condition: 'GOOD', createdAt: new Date('2024-01-02T03:00:01Z') },
                {
                  name: 'Worktop',
                  category: 'SURFACE',
                  condition: 'FAIR',
                  notes: 'Burn mark by the sink',
                  createdAt: new Date('2024-01-02T03:00:02Z'),
                },
              ],
            },
            captures: {
              create: [
                {
                  kind: 'PHOTO',
                  storagePath: `${label}/kitchen-agreed.jpg`,
                  mimeType: 'image/jpeg',
                  sizeBytes: 1,
                  note: 'Hob and worktop',
                  processedAt: new Date('2024-01-02T04:00:00Z'),
                },
                // Landed after Send, so never part of what was agreed.
                { kind: 'PHOTO', storagePath: `${label}/kitchen-late.jpg`, mimeType: 'image/jpeg', sizeBytes: 1 },
              ],
            },
          },
          { name: 'Bathroom', order: 1, status: 'REVIEWED' },
          // Two rooms the inspector happened to give one name.
          {
            name: 'Bedroom',
            order: 2,
            status: 'REVIEWED',
            items: { create: [{ name: 'Bed', category: 'FURNITURE', condition: 'GOOD' }] },
            captures: {
              create: [{
                kind: 'PHOTO',
                storagePath: `${label}/bedroom-1.jpg`,
                mimeType: 'image/jpeg',
                sizeBytes: 1,
                processedAt: new Date('2024-01-02T04:00:00Z'),
              }],
            },
          },
          {
            name: 'Bedroom',
            order: 3,
            status: 'REVIEWED',
            items: { create: [{ name: 'Wardrobe', category: 'FURNITURE', condition: 'POOR' }] },
            captures: {
              create: [{
                kind: 'PHOTO',
                storagePath: `${label}/bedroom-2.jpg`,
                mimeType: 'image/jpeg',
                sizeBytes: 1,
                processedAt: new Date('2024-01-02T04:00:00Z'),
              }],
            },
          },
        ],
      },
    },
    include: { rooms: { include: { items: true } } },
  })
  return { ...checkIn, agentId: agent.id }
}

const checkOutRooms = (checkOutId: string) =>
  db.room.findMany({ where: { inspectionId: checkOutId }, orderBy: { order: 'asc' }, include: { items: true } })

afterAll(async () => {
  await db.property.deleteMany({ where: { postalCode } })
  await db.stakeholder.deleteMany({
    where: {
      tenanciesAsAgent: { none: {} },
      tenanciesAsLandlord: { none: {} },
      tenanciesAsTenant: { none: {} },
      authUserId: null,
      inspectionsRun: { none: {} },
    },
  })
  await db.$disconnect()
})

describe('check-in reference', () => {
  it('shows a check-out room its check-in lines and only the agreed photos', async () => {
    const checkIn = await signedCheckIn('REFERENCE-KITCHEN')
    const [kitchen, bathroom] = await checkOutRooms(await startCheckOut(checkIn.id))

    expect(await checkInReference(kitchen.id, checkIn.agentId)).toMatchObject({
      baselineId: checkIn.id,
      conductedAt: '2024-01-02T03:00:00.000Z',
      photos: [{ caption: 'Hob and worktop', update: false, annotations: null }],
    })
    expect(Object.values(await checkInPhotoUrls(kitchen.id, checkIn.agentId))).toEqual([
      'https://storage.test/REFERENCE-KITCHEN/kitchen-agreed.jpg',
    ])
    // The app is handed the URL on the photo itself.
    expect((await signedCheckInReference(kitchen.id, checkIn.agentId))!.photos).toMatchObject([
      { caption: 'Hob and worktop', url: 'https://storage.test/REFERENCE-KITCHEN/kitchen-agreed.jpg' },
    ])
    const { lines } = (await checkInReference(kitchen.id, checkIn.agentId))!
    expect(lines.map((line) => [line.name, line.condition, line.notes])).toEqual([
      ['Hob', 'GOOD', null],
      ['Worktop', 'FAIR', 'Burn mark by the sink'],
    ])
    expect(await checkInReference(bathroom.id, checkIn.agentId)).toMatchObject({ lines: [], photos: [] })
  })

  it('names each copied row by the check-in line it came from, which survives an edit', async () => {
    const checkIn = await signedCheckIn('REFERENCE-KEYS')
    const [kitchen] = await checkOutRooms(await startCheckOut(checkIn.id))
    const checkInKitchen = checkIn.rooms.find((room) => room.name === 'Kitchen')!

    expect(kitchen.items.map((item) => item.baselineKey).sort()).toEqual(
      checkInKitchen.items.map((item) => `item:${item.id}`).sort(),
    )

    const hob = kitchen.items.find((item) => item.name === 'Hob')!
    await db.inspectionItem.update({ where: { id: hob.id }, data: { condition: 'DAMAGED' } })
    const { lines } = (await checkInReference(kitchen.id, checkIn.agentId))!
    expect(lines.find((line) => line.key === hob.baselineKey)).toMatchObject({
      name: 'Hob',
      condition: 'GOOD',
    })
  })

  it('keeps each room its own check-in, renamed or sharing a name with another', async () => {
    const checkIn = await signedCheckIn('REFERENCE-NAMES')
    const checkOutId = await startCheckOut(checkIn.id)
    const [kitchen, , first, second] = await checkOutRooms(checkOutId)

    await renameRoom(kitchen.id, checkOutId, 'Galley')
    expect((await checkInReference(kitchen.id, checkIn.agentId))!.lines.map((line) => line.name)).toEqual(['Hob', 'Worktop'])

    expect(await checkInReference(first.id, checkIn.agentId)).toMatchObject({ lines: [{ name: 'Bed' }] })
    expect(Object.values(await checkInPhotoUrls(first.id, checkIn.agentId))).toEqual([
      'https://storage.test/REFERENCE-NAMES/bedroom-1.jpg',
    ])
    expect(await checkInReference(second.id, checkIn.agentId)).toMatchObject({ lines: [{ name: 'Wardrobe' }] })
    expect(Object.values(await checkInPhotoUrls(second.id, checkIn.agentId))).toEqual([
      'https://storage.test/REFERENCE-NAMES/bedroom-2.jpg',
    ])
  })

  it('ties a finding to the check-in item its row was copied from, renamed or sharing a name', async () => {
    const checkIn = await signedCheckIn('REFERENCE-FINDING')
    const checkOutId = await startCheckOut(checkIn.id)
    const [kitchen, , , second] = await checkOutRooms(checkOutId)
    await renameRoom(kitchen.id, checkOutId, 'Galley')
    await db.inspection.update({ where: { id: checkOutId }, data: { status: 'AWAITING_SIGNATURE' } })
    const finding = (itemId: string) =>
      createFinding(checkOutId, {
        itemId,
        baselineItemId: null,
        changeType: 'DAMAGE',
        verdict: 'TENANT_LIABLE',
        rationale: 'Cracked',
        estimatedCost: null,
      })

    const hob = kitchen.items.find((item) => item.name === 'Hob')!
    const wardrobe = second.items[0]
    const linked = await db.finding.findMany({
      where: { id: { in: [await finding(hob.id), await finding(wardrobe.id)] } },
      select: { itemId: true, baselineItemId: true },
    })
    expect(Object.fromEntries(linked.map((row) => [row.itemId, `item:${row.baselineItemId}`]))).toEqual({
      [hob.id]: hob.baselineKey,
      [wardrobe.id]: wardrobe.baselineKey,
    })
  })

  it('is what the check-out started from, whatever happens to the check-in after', async () => {
    const checkIn = await signedCheckIn('REFERENCE-FROZEN')
    const [kitchen] = await checkOutRooms(await startCheckOut(checkIn.id))
    const hob = checkIn.rooms.find((room) => room.name === 'Kitchen')!.items.find((item) => item.name === 'Hob')!
    await db.inspectionItem.update({ where: { id: hob.id }, data: { condition: 'POOR' } })

    expect((await checkInReference(kitchen.id, checkIn.agentId))!.lines[0]).toMatchObject({ name: 'Hob', condition: 'GOOD' })
  })

  it('carries an acknowledged replacement, with its photo beside the new line', async () => {
    const checkIn = await signedCheckIn('REFERENCE-ADDENDUM')
    const hob = checkIn.rooms.find((room) => room.name === 'Kitchen')!.items.find((item) => item.name === 'Hob')!
    const line = {
      key: 'entry:new-hob',
      name: 'Hob',
      category: 'APPLIANCE' as const,
      condition: 'NEW' as const,
      quantity: 1,
      identifier: 'BOSCH PKE611',
      notes: null,
      propertyAssetId: null,
    }
    await db.reportAddendum.create({
      data: {
        inspectionId: checkIn.id,
        number: 1,
        title: 'New hob',
        effectiveDate: new Date('2025-01-01'),
        createdById: checkIn.agentId,
        publishedAt: new Date('2025-01-01'),
        acknowledgedAt: new Date('2025-01-02'),
        snapshot: {
          schemaVersion: 1,
          number: 1,
          title: 'New hob',
          reason: null,
          effectiveDate: '2025-01-01',
          publishedAt: '2025-01-01T00:00:00.000Z',
          publishedBy: 'Agent',
          entries: [{
            id: 'entry-1',
            change: 'REPLACED',
            // As the agent typed it; it applies to the Kitchen all the same.
            roomName: ' kitchen ',
            notes: null,
            target: { key: `item:${hob.id}`, name: 'Hob', condition: 'GOOD', quantity: 1, identifier: null, notes: null },
            line,
            maintenanceCase: null,
            photos: [{
              id: 'addendum-photo-1',
              storagePath: 'addenda/x/new-hob.jpg',
              mimeType: 'image/jpeg',
              note: 'New hob fitted',
              label: 'After',
            }],
          }],
        },
      },
    })

    const [kitchen, bathroom] = await checkOutRooms(await startCheckOut(checkIn.id))
    const reference = (await checkInReference(kitchen.id, checkIn.agentId))!
    expect(reference.lines.map((each) => [each.key, each.identifier, each.update])).toEqual([
      ['entry:new-hob', 'BOSCH PKE611', true],
      [expect.stringMatching(/^item:/), null, false],
    ])
    const urls = await checkInPhotoUrls(kitchen.id, checkIn.agentId)
    expect(reference.photos.map((photo) => [urls[photo.id], photo.caption, photo.update])).toEqual([
      ['https://storage.test/REFERENCE-ADDENDUM/kitchen-agreed.jpg', 'Hob and worktop', false],
      ['https://storage.test/addenda/x/new-hob.jpg', 'After: New hob fitted', true],
    ])
    expect(kitchen.items.find((item) => item.identifier === 'BOSCH PKE611')!.baselineKey).toBe('entry:new-hob')
    expect(await checkInReference(bathroom.id, checkIn.agentId)).toMatchObject({ photos: [] })
  })

  it('shows nothing when access to the check-out tenancy does not include its linked check-in tenancy', async () => {
    const checkIn = await signedCheckIn('REFERENCE-CONDUCTOR')
    const checkOutId = await startCheckOut(checkIn.id)
    const [kitchen] = await checkOutRooms(checkOutId)
    const conductor = await db.stakeholder.create({ data: { name: 'Conductor REFERENCE-CONDUCTOR' } })
    const original = await db.tenancy.findUniqueOrThrow({ where: { id: checkIn.tenancyId } })
    const checkOutTenancy = await db.tenancy.create({ data: {
      propertyId: original.propertyId, landlordId: original.landlordId, tenantId: original.tenantId,
      agentId: original.agentId, startDate: original.startDate, endDate: original.endDate,
      monthlyRent: original.monthlyRent, deposit: original.deposit,
      collaborators: { create: { stakeholderId: conductor.id, grantedById: checkIn.agentId } },
    } })
    await db.inspection.update({
      where: { id: checkOutId },
      data: { tenancyId: checkOutTenancy.id, conductedById: conductor.id },
    })
    await expect(authorizeInspection(checkOutId, conductor.id)).resolves.toBeTruthy()
    await expect(authorizeInspection(checkIn.id, conductor.id)).rejects.toThrow('Inspection not found')

    expect(await checkInReference(kitchen.id, conductor.id)).toBeNull()
    expect(await checkInPhotoUrls(kitchen.id, conductor.id)).toEqual({})
    expect(await signedCheckInReference(kitchen.id, conductor.id)).toBeNull()
    expect(await checkInReference(kitchen.id, checkIn.agentId)).not.toBeNull()
  })

  it('has nothing to show on a check-in, or on a room the check-in never had', async () => {
    const checkIn = await signedCheckIn('REFERENCE-NONE')
    const kitchen = checkIn.rooms.find((room) => room.name === 'Kitchen')!
    expect(await checkInReference(kitchen.id, checkIn.agentId)).toBeNull()

    const checkOutId = await startCheckOut(checkIn.id)
    expect(await checkInReference(await addRoom(checkOutId, 'Study'), checkIn.agentId)).toBeNull()
  })
})
