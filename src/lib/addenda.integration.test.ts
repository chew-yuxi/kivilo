import { afterAll, describe, expect, it, vi } from 'vitest'
import { randomUUID } from 'node:crypto'

/// Updates to a signed check-in. The agent drafts and publishes, both parties
/// acknowledge as themselves, and only an acknowledged update reaches the check-out. The
/// signed rows never move. Server actions are public endpoints, so every refusal here is
/// asserted to read exactly like an id that does not exist.

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/headers', () => ({ headers: async () => new Headers({ 'x-forwarded-for': '203.0.113.9' }) }))
vi.mock('@/lib/storage', () => ({
  createUploadUrl: vi.fn(async () => ({ signedUrl: 'https://storage.test/upload', token: 'tok' })),
  captureExists: vi.fn(async () => true),
  createDownloadUrl: vi.fn(async (path: string) => `https://storage.test/${path}`),
}))
vi.mock('@/lib/auth', async (importActual) => {
  // Only the session lookup is faked; the authorization boundary is the real one.
  const actual = await importActual<typeof import('@/lib/auth')>()
  return { ...actual, requireAgent: vi.fn(), requireStakeholder: vi.fn() }
})

import { db } from '@/lib/db'
import { requireAgent, requireStakeholder } from '@/lib/auth'
import { captureExists } from '@/lib/storage'
import {
  acknowledgeAddendum,
  addAddendumEntry,
  addendumFromMaintenanceCase,
  deleteAddendumEntry,
  deleteAddendumPhoto,
  publishAddendum,
  registerAddendumPhoto,
  requestAddendumPhotoUpload,
  startAddendum,
  updateAddendum,
  updateAddendumEntry,
} from '@/lib/addendum-actions'
import { startCheckOut } from '@/lib/actions'
import { signedReport } from '@/lib/report'
import { propertyTimeline } from '@/lib/property-timeline'
import { addendumHash, addendumSnapshotSchema } from '@/lib/addenda'
import type { InspectionStatus, Stakeholder } from '@/generated/prisma'

const postalCode = '997701'
const tag = randomUUID().slice(0, 8)
const people: string[] = []
const teams: string[] = []
const FROZEN = 'This update has been published and can no longer be changed'

async function person(name: string, teamId?: string) {
  const row = await db.stakeholder.create({ data: { name: `Addenda ${name} ${tag}`, teamId } })
  people.push(row.id)
  return row
}

/// A countersigned check-in: a kitchen with a registered dishwasher and a hob, and a
/// utility room with a dryer.
async function deal(status: InspectionStatus = 'COMPLETED') {
  const team = await db.team.create({ data: { name: `Addenda team ${randomUUID()}` } })
  teams.push(team.id)
  const [landlord, tenant, agent, teammate, stranger] = [
    await person('Landlord'), await person('Tenant'), await person('Agent', team.id),
    await person('Teammate', team.id), await person('Stranger'),
  ]
  const property = await db.property.create({ data: { line1: `${tag} Addenda Road`, postalCode, type: 'HDB' } })
  const tenancy = await db.tenancy.create({
    data: {
      propertyId: property.id, landlordId: landlord.id, tenantId: tenant.id, agentId: agent.id,
      startDate: new Date('2026-01-01'), endDate: new Date('2099-01-01'), monthlyRent: '3000', deposit: '6000',
    },
  })
  const asset = await db.propertyAsset.create({
    data: { propertyId: property.id, name: 'Dishwasher', category: 'APPLIANCE', roomLabel: 'Kitchen', identifier: 'Bosch SMS2' },
  })
  const inspection = await db.inspection.create({ data: { tenancyId: tenancy.id, kind: 'CHECK_IN', status, conductedById: agent.id } })
  const kitchen = await db.room.create({ data: { inspectionId: inspection.id, name: 'Kitchen', order: 0, status: 'REVIEWED' } })
  const utility = await db.room.create({ data: { inspectionId: inspection.id, name: 'Utility', order: 1, status: 'REVIEWED' } })
  const dishwasher = await db.inspectionItem.create({
    data: {
      roomId: kitchen.id, name: 'Dishwasher', category: 'APPLIANCE', condition: 'POOR', identifier: 'Bosch SMS2',
      propertyAssetId: asset.id, editedByHuman: true, createdAt: new Date('2026-01-01T00:00:00Z'),
    },
  })
  const hob = await db.inspectionItem.create({
    data: { roomId: kitchen.id, name: 'Hob', category: 'APPLIANCE', condition: 'GOOD', editedByHuman: true, createdAt: new Date('2026-01-01T00:00:01Z') },
  })
  const dryer = await db.inspectionItem.create({
    data: { roomId: utility.id, name: 'Dryer', category: 'APPLIANCE', condition: 'GOOD', editedByHuman: true },
  })
  await db.signature.createMany({
    data: [landlord, tenant].map((party) => ({ inspectionId: inspection.id, stakeholderId: party.id, imageData: 'data:,' })),
  })
  return { landlord, tenant, agent, teammate, stranger, property, tenancy, asset, inspection, dishwasher, hob, dryer }
}

function as(stakeholder: Stakeholder) {
  vi.mocked(requireAgent).mockResolvedValue(stakeholder)
  vi.mocked(requireStakeholder).mockResolvedValue(stakeholder)
}

const replacement = (targetKey: string) => ({
  change: 'REPLACED', targetKey, name: 'Dishwasher', category: 'APPLIANCE', condition: 'NEW', identifier: 'Miele G7100 SN 4471',
  notes: 'Old one failed; landlord replaced it',
})

async function published(agent: Stakeholder, inspectionId: string, title: string, entries: object[]) {
  as(agent)
  const id = await startAddendum(inspectionId)
  await updateAddendum(id, { title, reason: null, effectiveDate: '2026-03-02' })
  for (const entry of entries) await addAddendumEntry(id, entry)
  await publishAddendum(id)
  return id
}

async function acknowledgedBy(addendumId: string, ...parties: Stakeholder[]) {
  for (const party of parties) {
    as(party)
    await acknowledgeAddendum(addendumId)
  }
}

afterAll(async () => {
  await db.property.deleteMany({ where: { postalCode } })
  await db.stakeholder.deleteMany({ where: { id: { in: people } } })
  await db.team.deleteMany({ where: { id: { in: teams } } })
  await db.$disconnect()
})

describe('report addenda', () => {
  it('publishes a numbered, hashed snapshot that nothing can change, and leaves the signed report as it was', async () => {
    const { agent, landlord, tenant, inspection, dishwasher, asset, property } = await deal()
    const signedItems = await db.inspectionItem.findMany({ where: { room: { inspectionId: inspection.id } }, orderBy: { id: 'asc' } })

    as(agent)
    const id = await startAddendum(inspection.id)
    expect(await startAddendum(inspection.id)).toBe(id)
    await updateAddendum(id, { title: 'New dishwasher', reason: 'The old one failed', effectiveDate: '2026-03-02' })
    const entryId = await addAddendumEntry(id, replacement(`item:${dishwasher.id}`))
    await addAddendumEntry(id, { change: 'ADDED', roomName: 'Helper room', name: 'Ceiling fan', category: 'FIXTURE', condition: 'NEW' })
    const clientId = randomUUID()
    const upload = await requestAddendumPhotoUpload(entryId, id, { clientId, mimeType: 'image/jpeg' })
    expect(upload.storagePath).toBe(`addenda/${id}/${clientId}.jpg`)
    const photoId = await registerAddendumPhoto(entryId, id, {
      clientId, mimeType: 'image/jpeg', storagePath: upload.storagePath, sizeBytes: 1200, note: 'Rating plate',
    })

    expect(await publishAddendum(id)).toMatchObject({ number: 1 })

    const row = await db.reportAddendum.findUniqueOrThrow({ where: { id } })
    const snapshot = addendumSnapshotSchema.parse(row.snapshot)
    // Recomputable from the stored row, whatever key order Postgres keeps it in.
    expect(row.contentHash).toBe(addendumHash(row.snapshot))
    expect(snapshot).toMatchObject({
      number: 1,
      title: 'New dishwasher',
      entries: [
        {
          change: 'REPLACED',
          roomName: 'Kitchen',
          target: { key: `item:${dishwasher.id}`, name: 'Dishwasher', identifier: 'Bosch SMS2', condition: 'POOR' },
          line: { key: `entry:${entryId}`, identifier: 'Miele G7100 SN 4471', condition: 'NEW' },
          photos: [{ storagePath: upload.storagePath, note: 'Rating plate' }],
        },
        { change: 'ADDED', roomName: 'Helper room', target: null, line: { name: 'Ceiling fan' } },
      ],
    })

    // Frozen: every draft action refuses, through the same lock as publishing.
    await expect(updateAddendum(id, { title: 'x', reason: null, effectiveDate: '2026-03-02' })).rejects.toThrow(FROZEN)
    await expect(addAddendumEntry(id, { change: 'ADDED', roomName: 'Kitchen', name: 'Oven', category: 'APPLIANCE', condition: 'NEW' })).rejects.toThrow(FROZEN)
    await expect(updateAddendumEntry(entryId, id, replacement(`item:${dishwasher.id}`))).rejects.toThrow(FROZEN)
    await expect(deleteAddendumEntry(entryId, id)).rejects.toThrow(FROZEN)
    await expect(requestAddendumPhotoUpload(entryId, id, { clientId: randomUUID(), mimeType: 'image/png' })).rejects.toThrow(FROZEN)
    await expect(deleteAddendumPhoto(photoId, id)).rejects.toThrow(FROZEN)
    await expect(publishAddendum(id)).rejects.toThrow(FROZEN)
    expect((await db.reportAddendum.findUniqueOrThrow({ where: { id } })).contentHash).toBe(row.contentHash)

    // The signed check-in did not move.
    expect(await db.inspectionItem.findMany({ where: { room: { inspectionId: inspection.id } }, orderBy: { id: 'asc' } })).toEqual(signedItems)
    expect(await db.signature.count({ where: { inspectionId: inspection.id } })).toBe(2)
    expect((await db.inspection.findUniqueOrThrow({ where: { id: inspection.id } })).status).toBe('COMPLETED')

    // The asset register follows: the old dishwasher retired, the new one registered.
    expect((await db.propertyAsset.findUniqueOrThrow({ where: { id: asset.id } })).active).toBe(false)
    const registered = await db.propertyAsset.findFirstOrThrow({ where: { propertyId: property.id, identifier: 'Miele G7100 SN 4471' } })
    expect(registered).toMatchObject({ active: true, roomLabel: 'Kitchen', category: 'APPLIANCE' })
    expect(snapshot.entries[0].line?.propertyAssetId).toBe(registered.id)

    // Both parties are asked, and the link is the update page.
    const notices = await db.notification.findMany({ where: { href: `/updates/${id}` } })
    expect(notices.map((notice) => notice.recipientId).sort()).toEqual([landlord.id, tenant.id].sort())
    expect(notices[0]).toMatchObject({ kind: 'REPORT_UPDATED', title: expect.stringContaining('was updated') })

    // The next one is number 2, and pending until acknowledged.
    const second = await published(agent, inspection.id, 'Fan removed', [{ change: 'REMOVED', targetKey: `entry:${snapshot.entries[1].id}` }])
    expect((await db.reportAddendum.findUniqueOrThrow({ where: { id: second } })).number).toBe(2)
    expect((await signedReport(inspection.id, landlord.id)).addenda.map((each) => each.title)).toEqual(['New dishwasher', 'Fan removed'])
  })

  it('is written only by the agent or a teammate, and a refusal reads like a missing id', async () => {
    const { agent, teammate, landlord, tenant, stranger, inspection, dishwasher } = await deal()
    as(agent)
    const id = await startAddendum(inspection.id)
    await updateAddendum(id, { title: 'Hob replaced', reason: null, effectiveDate: '2026-03-02' })
    const entryId = await addAddendumEntry(id, replacement(`item:${dishwasher.id}`))
    const missing = randomUUID()

    for (const outsider of [landlord, tenant, stranger]) {
      as(outsider)
      await expect(startAddendum(inspection.id)).rejects.toThrow('Inspection not found')
      await expect(publishAddendum(id)).rejects.toThrow('Addendum not found')
      await expect(updateAddendum(id, { title: 'x', reason: null, effectiveDate: '2026-03-02' })).rejects.toThrow('Addendum not found')
      await expect(updateAddendumEntry(entryId, id, replacement(`item:${dishwasher.id}`))).rejects.toThrow('Addendum not found')
    }
    await expect(publishAddendum(missing)).rejects.toThrow('Addendum not found')
    await expect(updateAddendumEntry(missing, id, {})).rejects.toThrow('Entry not found')
    // A real entry paired with an addendum it is not on is the same miss.
    as(agent)
    const other = await deal()
    as(other.agent)
    const otherId = await startAddendum(other.inspection.id)
    await expect(deleteAddendumEntry(entryId, otherId)).rejects.toThrow('Entry not found')
    // A key that is not in the report cannot be named.
    await expect(addAddendumEntry(otherId, replacement(`item:${dishwasher.id}`))).rejects.toThrow('Item not found')

    // Neither landlord nor tenant can publish. A teammate covering the deal can.
    as(teammate)
    expect(await publishAddendum(id)).toMatchObject({ number: 1 })

    // Only a countersigned check-in takes updates.
    const unsigned = await deal('AWAITING_SIGNATURE')
    as(unsigned.agent)
    await expect(startAddendum(unsigned.inspection.id)).rejects.toThrow('Only a countersigned check-in can be updated')
  })

  it('is acknowledged only by the landlord and tenant, as themselves, against the hash they saw', async () => {
    const { agent, landlord, tenant, stranger, inspection, dishwasher, property } = await deal()
    as(agent)
    const draft = await startAddendum(inspection.id)
    await updateAddendum(draft, { title: 'New dishwasher', reason: null, effectiveDate: '2026-03-02' })
    await addAddendumEntry(draft, replacement(`item:${dishwasher.id}`))

    // A draft is nobody's to acknowledge.
    as(landlord)
    await expect(acknowledgeAddendum(draft)).rejects.toThrow('Addendum not found')

    as(agent)
    await publishAddendum(draft)
    const { contentHash } = await db.reportAddendum.findUniqueOrThrow({ where: { id: draft } })
    for (const outsider of [agent, stranger]) {
      as(outsider)
      await expect(acknowledgeAddendum(draft)).rejects.toThrow('Addendum not found')
    }
    as(landlord)
    await expect(acknowledgeAddendum(randomUUID())).rejects.toThrow('Addendum not found')

    expect((await signedReport(inspection.id, tenant.id)).addenda[0].acknowledgeAs).toBe('TENANT')
    await acknowledgedBy(draft, landlord, landlord)
    const acks = await db.addendumAcknowledgement.findMany({ where: { addendumId: draft } })
    expect(acks).toHaveLength(1)
    expect(acks[0]).toMatchObject({ stakeholderId: landlord.id, ipAddress: '203.0.113.9', contentHash })
    expect((await db.reportAddendum.findUniqueOrThrow({ where: { id: draft } })).acknowledgedAt).toBeNull()
    const pending = (await signedReport(inspection.id, landlord.id)).addenda[0]
    expect(pending.acknowledgeAs).toBeNull()
    expect(pending.acknowledgements.map((ack) => [ack.role, Boolean(ack.acknowledgedAt)])).toEqual([['Landlord', true], ['Tenant', false]])
    expect((await propertyTimeline(property.id, landlord.id)).events.map((event) => event.kind)).not.toContain('REPORT_UPDATED')

    await acknowledgedBy(draft, tenant)
    expect((await db.reportAddendum.findUniqueOrThrow({ where: { id: draft } })).acknowledgedAt).not.toBeNull()
    expect((await signedReport(inspection.id, tenant.id)).addenda[0].acknowledgeAs).toBeNull()
    const events = (await propertyTimeline(property.id, tenant.id)).events
    expect(events.find((event) => event.kind === 'REPORT_UPDATED')).toMatchObject({
      title: 'Check-in report updated: New dishwasher', reportId: inspection.id,
    })
  })

  it('starts the check-out from the signed check-in and only the fully acknowledged updates, in order', async () => {
    const { agent, landlord, tenant, inspection, dishwasher, dryer } = await deal()
    const first = await published(agent, inspection.id, 'New dishwasher', [replacement(`item:${dishwasher.id}`)])
    await acknowledgedBy(first, landlord, tenant)
    const firstEntry = addendumSnapshotSchema.parse((await db.reportAddendum.findUniqueOrThrow({ where: { id: first } })).snapshot).entries[0]

    // Pending: only the landlord has acknowledged the dryer going.
    const second = await published(agent, inspection.id, 'Dryer taken away', [{ change: 'REMOVED', targetKey: `item:${dryer.id}` }])
    await acknowledgedBy(second, landlord)

    // Builds on the first: the new dishwasher goes, and an oven arrives.
    const third = await published(agent, inspection.id, 'Dishwasher out, oven in', [
      { change: 'REMOVED', targetKey: `entry:${firstEntry.id}`, notes: 'Taken by the landlord' },
      { change: 'ADDED', roomName: 'kitchen', name: 'Oven', category: 'APPLIANCE', condition: 'NEW', identifier: 'Bosch HBF1' },
    ])
    await acknowledgedBy(third, tenant, landlord)

    as(agent)
    const checkOut = await startCheckOut(inspection.id)
    const rooms = await db.room.findMany({
      where: { inspectionId: checkOut },
      orderBy: { order: 'asc' },
      include: { items: { orderBy: { createdAt: 'asc' } } },
    })
    expect(rooms.map((room) => [room.name, room.items.map((item) => item.name)])).toEqual([
      ['Kitchen', ['Hob', 'Oven']],
      ['Utility', ['Dryer']],
    ])
    const oven = rooms[0].items[1]
    expect(oven).toMatchObject({ identifier: 'Bosch HBF1', condition: 'NEW', editedByHuman: true })
    expect(oven.propertyAssetId).not.toBeNull()
  })

  it('prefills an update from a resolved repair, reusing its before and after photos', async () => {
    const { agent, landlord, tenant, inspection, dishwasher, asset, tenancy } = await deal()
    const repair = await db.maintenanceCase.create({
      data: {
        tenancyId: tenancy.id, propertyAssetId: asset.id, reportedById: tenant.id, category: 'APPLIANCE',
        title: 'Dishwasher leaking', description: 'Water on the floor', status: 'RESOLVED', resolvedAt: new Date('2026-03-01'),
      },
    })
    const evidence = await Promise.all((['BEFORE', 'AFTER', 'RECEIPT'] as const).map((purpose, index) =>
      db.maintenanceEvidence.create({
        data: {
          clientId: randomUUID(), caseId: repair.id, uploadedById: landlord.id, purpose,
          storagePath: `maintenance/${repair.id}/${purpose}.${purpose === 'RECEIPT' ? 'pdf' : 'jpg'}`,
          mimeType: purpose === 'RECEIPT' ? 'application/pdf' : 'image/jpeg', sizeBytes: 100,
          createdAt: new Date(Date.UTC(2026, 2, 1, index)),
        },
      })))
    const open = await db.maintenanceCase.create({
      data: { tenancyId: tenancy.id, reportedById: tenant.id, category: 'PLUMBING', title: 'Tap drips', description: 'Drips' },
    })

    as(agent)
    const { addendumId, inspectionId } = await addendumFromMaintenanceCase(repair.id)
    expect(inspectionId).toBe(inspection.id)
    expect((await addendumFromMaintenanceCase(repair.id)).addendumId).toBe(addendumId)
    const addendum = await db.reportAddendum.findUniqueOrThrow({
      where: { id: addendumId },
      include: { entries: { include: { photos: { orderBy: { createdAt: 'asc' } } } } },
    })
    expect(addendum.title).toBe('Dishwasher leaking')
    expect(addendum.entries).toHaveLength(1)
    expect(addendum.entries[0]).toMatchObject({
      change: 'REPLACED', targetKey: `item:${dishwasher.id}`, roomName: 'Kitchen', name: 'Dishwasher',
      maintenanceCaseId: repair.id, notes: expect.stringContaining('Dishwasher leaking'),
    })
    expect(addendum.entries[0].photos.map((photo) => [photo.label, photo.storagePath, photo.maintenanceEvidenceId])).toEqual([
      ['Before', evidence[0].storagePath, evidence[0].id],
      ['After', evidence[1].storagePath, evidence[1].id],
    ])

    await expect(addendumFromMaintenanceCase(open.id)).rejects.toThrow('Only a resolved repair can be added to the report')
    for (const party of [landlord, tenant]) {
      as(party)
      await expect(addendumFromMaintenanceCase(repair.id)).rejects.toThrow('Maintenance case not found')
    }

    // Dropping the entry never queues the repair's own evidence for deletion.
    as(agent)
    await deleteAddendumEntry(addendum.entries[0].id, addendumId)
    expect(await db.storagePurge.count({ where: { path: { startsWith: `maintenance/${repair.id}/` } } })).toBe(0)
  })

  it('will not register a photo that has not reached storage, or one outside the addendum', async () => {
    const { agent, inspection } = await deal()
    as(agent)
    const id = await startAddendum(inspection.id)
    const entryId = await addAddendumEntry(id, { change: 'ADDED', roomName: 'Kitchen', name: 'Oven', category: 'APPLIANCE', condition: 'NEW' })
    const clientId = randomUUID()
    await expect(registerAddendumPhoto(entryId, id, {
      clientId, mimeType: 'image/jpeg', storagePath: `addenda/elsewhere/${clientId}.jpg`, sizeBytes: 10,
    })).rejects.toThrow('Photo path is invalid')
    vi.mocked(captureExists).mockResolvedValueOnce(false)
    await expect(registerAddendumPhoto(entryId, id, {
      clientId, mimeType: 'image/jpeg', storagePath: `addenda/${id}/${clientId}.jpg`, sizeBytes: 10,
    })).rejects.toThrow('Photo has not reached storage')
  })
})
