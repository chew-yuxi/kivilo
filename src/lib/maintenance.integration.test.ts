import { afterAll, describe, expect, it } from 'vitest'
import { db } from '@/lib/db'
import {
  addMaintenanceVisit,
  authorizeMaintenanceCase,
  createMaintenanceCase,
  createPropertyAsset,
  listPropertyAssets,
  updateMaintenanceCase,
  verifyMaintenanceVisit,
} from '@/lib/maintenance'

async function fixture(label: string) {
  const landlord = await db.stakeholder.create({ data: { name: `M5 landlord ${label}` } })
  const tenant = await db.stakeholder.create({ data: { name: `M5 tenant ${label}` } })
  const agent = await db.stakeholder.create({ data: { name: `M5 agent ${label}` } })
  const property = await db.property.create({
    data: { line1: `M5 ${label}`, postalCode: '995555', type: 'PRIVATE_NON_LANDED' },
  })
  const tenancy = await db.tenancy.create({
    data: {
      propertyId: property.id,
      landlordId: landlord.id,
      tenantId: tenant.id,
      agentId: agent.id,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2099-12-31'),
      monthlyRent: '3000',
      deposit: '6000',
    },
  })
  const asset = await db.propertyAsset.create({
    data: { propertyId: property.id, name: 'Washing machine', category: 'APPLIANCE', identifier: `WM-${label}` },
  })
  return { landlord, tenant, agent, property, tenancy, asset }
}

afterAll(async () => {
  await db.property.deleteMany({ where: { postalCode: '995555' } })
  await db.stakeholder.deleteMany({ where: { name: { startsWith: 'M5 ' } } })
  await db.$disconnect()
})

describe('maintenance history', () => {
  it('does not recreate notifications for a deleted account retained on a shared tenancy', async () => {
    const record = await fixture('deleted-recipient')
    await db.accountDeletionRequest.create({
      data: {
        stakeholderId: record.landlord.id,
        status: 'COMPLETED',
        dueAt: new Date('2099-01-01'),
      },
    })
    try {
      await createMaintenanceCase(record.tenancy.id, record.tenant.id, {
        category: 'PLUMBING',
        title: 'Dripping tap',
        description: 'The bathroom tap drips.',
      })
      const recipients = await db.notification.findMany({
        where: { recipientId: { in: [record.landlord.id, record.agent.id] } },
        select: { recipientId: true },
      })
      expect(recipients.map((row) => row.recipientId)).toEqual([record.agent.id])
    } finally {
      await db.accountDeletionRequest.delete({ where: { stakeholderId: record.landlord.id } })
    }
  })

  it('keeps refusals indistinguishable from missing cases', async () => {
    const mine = await fixture('auth-a')
    const theirs = await fixture('auth-b')
    const created = await createMaintenanceCase(theirs.tenancy.id, theirs.tenant.id, {
      propertyAssetId: theirs.asset.id,
      category: 'APPLIANCE',
      title: 'Drum will not turn',
      description: 'The cycle stops after filling.',
    })
    const forbidden = await authorizeMaintenanceCase(created.id, mine.tenant.id)
      .catch((error: Error) => error.message)
    const missing = await authorizeMaintenanceCase('not-a-case', mine.tenant.id)
      .catch((error: Error) => error.message)
    expect(forbidden).toBe(missing)
  })

  it('reopens a failed repair and alerts once at four visits in 365 days', async () => {
    const record = await fixture('repeat')
    const created = await createMaintenanceCase(record.tenancy.id, record.tenant.id, {
      clientId: 'a18db5f2-05a4-4e14-a9bb-4756f8fef312',
      propertyAssetId: record.asset.id,
      category: 'APPLIANCE',
      priority: 'URGENT',
      title: 'Washing machine stops mid-cycle',
      description: 'It has stopped with water in the drum.',
    })
    await updateMaintenanceCase(created.id, record.landlord.id, { status: 'ACKNOWLEDGED' })

    for (let attempt = 1; attempt <= 4; attempt += 1) {
      const visit = await addMaintenanceVisit(created.id, record.landlord.id, {
        completedAt: new Date().toISOString(),
        notes: `Repair attempt ${attempt}`,
      })
      await verifyMaintenanceVisit(created.id, visit.id, record.tenant.id, {
        outcome: attempt === 4 ? 'FIXED' : 'NOT_FIXED',
        note: attempt === 4 ? 'Cycle completed' : 'Stopped again',
      })
      const state = await authorizeMaintenanceCase(created.id, record.tenant.id)
      expect(state.maintenanceCase.status).toBe(attempt === 4 ? 'RESOLVED' : 'ACKNOWLEDGED')
    }

    const alerts = await db.notification.findMany({
      where: { kind: 'REPEAT_REPAIR', recipientId: { in: [record.landlord.id, record.agent.id] } },
    })
    expect(alerts).toHaveLength(2)
    const assets = await listPropertyAssets(record.property.id, record.landlord.id)
    expect(assets).toMatchObject([{ name: 'Washing machine', repairVisitsLast365Days: 4 }])
  })

  it('requires a reason to close without action and never grants the tenant manager powers', async () => {
    const record = await fixture('state')
    const created = await createMaintenanceCase(record.tenancy.id, record.tenant.id, {
      propertyAssetId: null,
      category: 'PLUMBING',
      title: 'Tap drips',
      description: 'The kitchen tap drips overnight.',
    })
    await expect(updateMaintenanceCase(created.id, record.tenant.id, {
      status: 'ACKNOWLEDGED',
    })).rejects.toThrow('Maintenance case not found')
    await expect(updateMaintenanceCase(created.id, record.landlord.id, {
      status: 'CLOSED_NO_ACTION',
    })).rejects.toThrow('requires a reason')
    await updateMaintenanceCase(created.id, record.landlord.id, {
      status: 'CLOSED_NO_ACTION',
      resolutionReason: 'Duplicate of the building-wide water shutdown notice.',
    })
    const state = await authorizeMaintenanceCase(created.id, record.landlord.id)
    expect(state.maintenanceCase).toMatchObject({
      status: 'CLOSED_NO_ACTION',
      resolutionReason: 'Duplicate of the building-wide water shutdown notice.',
    })
  })

  it('requires a completed visit before a case awaits tenant confirmation', async () => {
    const record = await fixture('visit-required')
    const created = await createMaintenanceCase(record.tenancy.id, record.tenant.id, {
      category: 'PLUMBING', title: 'Leaking tap', description: 'Water drips overnight.',
    })
    await updateMaintenanceCase(created.id, record.landlord.id, { status: 'ACKNOWLEDGED' })
    const visit = await addMaintenanceVisit(created.id, record.landlord.id, {
      scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })
    await expect(updateMaintenanceCase(created.id, record.landlord.id, {
      status: 'AWAITING_CONFIRMATION',
    })).rejects.toThrow('Invalid maintenance status transition')
    await expect(verifyMaintenanceVisit(created.id, visit.id, record.tenant.id, {
      outcome: 'FIXED',
    })).rejects.toThrow('Only a completed visit can be verified')
    expect((await authorizeMaintenanceCase(created.id, record.tenant.id)).maintenanceCase.status)
      .toBe('SCHEDULED')
  })

  it('limits asset links to authorized, open, human-reviewed inspection items', async () => {
    const record = await fixture('asset-scope')
    const otherAgent = await db.stakeholder.create({ data: { name: 'M5 agent asset-other' } })
    const otherTenant = await db.stakeholder.create({ data: { name: 'M5 tenant asset-other' } })
    const otherTenancy = await db.tenancy.create({
      data: {
        propertyId: record.property.id,
        landlordId: record.landlord.id,
        tenantId: otherTenant.id,
        agentId: otherAgent.id,
        startDate: new Date('2026-01-01'),
        endDate: new Date('2099-12-31'),
        monthlyRent: '3000', deposit: '6000',
      },
    })
    const ownInspection = await db.inspection.create({
      data: { tenancyId: record.tenancy.id, kind: 'CHECK_IN', conductedById: record.agent.id },
    })
    const otherInspection = await db.inspection.create({
      data: { tenancyId: otherTenancy.id, kind: 'CHECK_IN', conductedById: otherAgent.id },
    })
    async function item(inspectionId: string) {
      const room = await db.room.create({ data: { inspectionId, name: 'Kitchen', order: 0 } })
      return db.inspectionItem.create({
        data: {
          roomId: room.id, name: 'Washing machine', category: 'APPLIANCE',
          condition: 'GOOD', editedByHuman: true,
        },
      })
    }
    const ownItem = await item(ownInspection.id)
    const otherItem = await item(otherInspection.id)
    const assetInput = { name: 'Washing machine', category: 'APPLIANCE', inspectionItemId: otherItem.id }
    await expect(createPropertyAsset(record.property.id, record.agent.id, assetInput))
      .rejects.toThrow('Inspection item not found')
    expect(await db.propertyAsset.count({ where: { propertyId: record.property.id } })).toBe(1)

    await createPropertyAsset(record.property.id, record.agent.id, {
      ...assetInput, inspectionItemId: ownItem.id,
    })
    expect((await db.inspectionItem.findUniqueOrThrow({ where: { id: ownItem.id } })).propertyAssetId)
      .not.toBeNull()

    await db.inspection.update({
      where: { id: ownInspection.id }, data: { status: 'AWAITING_SIGNATURE' },
    })
    await expect(createPropertyAsset(record.property.id, record.agent.id, {
      ...assetInput, inspectionItemId: ownItem.id,
    })).rejects.toThrow('no longer be changed')
  })
})
