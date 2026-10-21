import { afterAll, describe, expect, it } from 'vitest'
import { db } from '@/lib/db'
import { notificationCanBeDelivered } from '@/lib/notification-recipients'
import {
  addMaintenanceVisit,
  answerResponsibility,
  authorizeMaintenanceCase,
  createMaintenanceCase,
  createPropertyAsset,
  listPropertyAssets,
  listNotifications,
  markNotificationRead,
  maintenanceCaseDetail,
  proposeResponsibility,
  updateMaintenanceCase,
  updateTenancyTerms,
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
  it('notifies current collaborators, excludes historical report-only access, and hides revoked messages', async () => {
    const record = await fixture('collaboration-notifications')
    const colleague = await db.stakeholder.create({ data: { name: 'M5 notification colleague' } })
    const historical = await db.stakeholder.create({ data: { name: 'M5 historical reporter' } })
    await db.tenancyCollaborator.create({ data: { tenancyId: record.tenancy.id, stakeholderId: colleague.id } })
    await db.inspection.create({
      data: {
        tenancyId: record.tenancy.id, kind: 'CHECK_IN', conductedById: historical.id,
        accessGrants: { create: { stakeholderId: historical.id } },
      },
    })
    await createMaintenanceCase(record.tenancy.id, record.tenant.id, {
      category: 'PLUMBING', title: 'Private leaking tap', description: 'The kitchen tap leaks.',
    })
    const notifications = await db.notification.findMany({ where: { tenancyId: record.tenancy.id } })
    expect(notifications.map((row) => row.recipientId).sort()).toEqual([
      record.landlord.id, record.agent.id, colleague.id,
    ].sort())
    const notice = notifications.find((row) => row.recipientId === colleague.id)!
    expect(await listNotifications(colleague.id)).toEqual([expect.objectContaining({ id: notice.id })])
    expect(await notificationCanBeDelivered(db, notice)).toBe(true)
    expect(await listNotifications(historical.id)).toEqual([])

    // Leave the durable row in place to prove authorization, independently of the
    // removal action's queue cleanup. Mark-read must refuse the same stale id too.
    await db.tenancyCollaborator.deleteMany({ where: { tenancyId: record.tenancy.id, stakeholderId: colleague.id } })
    expect(await db.notification.findUnique({ where: { id: notice.id } })).not.toBeNull()
    expect(await listNotifications(colleague.id)).toEqual([])
    await expect(markNotificationRead(notice.id, colleague.id)).rejects.toThrow('Notification not found')
    await expect(markNotificationRead('missing-notification', colleague.id)).rejects.toThrow('Notification not found')
    expect(await notificationCanBeDelivered(db, notice)).toBe(false)
    expect(await db.notification.findUnique({ where: { id: notice.id } })).toBeNull()
  })

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

describe('who arranges and who pays', () => {
  const shared = {
    arrangedBy: 'LANDLORD', payer: 'SHARED', tenantCap: '150',
    basis: 'MINOR_REPAIR_CLAUSE', reason: 'Minor repair clause', clauseRef: 'Clause 5(c)',
  } as const
  const tenantPays = {
    arrangedBy: 'TENANT', payer: 'TENANT', basis: 'TENANT_CAUSED', reason: 'Dropped a pan in the sink',
  } as const

  async function reported(label: string) {
    const record = await fixture(label)
    const created = await createMaintenanceCase(record.tenancy.id, record.tenant.id, {
      category: 'PLUMBING', title: 'Cracked basin', description: 'The kitchen basin is cracked.',
    })
    return { ...record, caseId: created.id }
  }

  it('records an agreement both sides reached and splits the recorded cost', async () => {
    const record = await reported('agree')
    const proposal = await proposeResponsibility(record.caseId, record.agent.id, shared)
    await expect(answerResponsibility(record.caseId, proposal.id, record.landlord.id, { decision: 'ACCEPT' }))
      .rejects.toThrow('Responsibility proposal not found')

    const notice = await db.notification.findFirstOrThrow({
      where: { recipientId: record.tenant.id, kind: 'MAINTENANCE_RESPONSIBILITY' },
    })
    expect(notice.body).toBe(
      'Landlord proposes: Tenant pays the first S$150, landlord pays the rest. Landlord arranges the repair.',
    )

    await answerResponsibility(record.caseId, proposal.id, record.tenant.id, { decision: 'ACCEPT' })
    const visit = await addMaintenanceVisit(record.caseId, record.agent.id, {
      completedAt: new Date().toISOString(), cost: '420',
    })
    const detail = await maintenanceCaseDetail(record.caseId, record.tenant.id)
    expect(detail.status).toBe('AWAITING_CONFIRMATION')
    expect(detail.responsibility).toMatchObject({
      agreement: { id: proposal.id, status: 'ACCEPTED', side: 'LANDLORD', clauseRef: 'Clause 5(c)' },
      pending: null,
      shares: { total: '420.00', tenant: '150.00', landlord: '270.00' },
    })
    expect(detail.events.map((event) => event.kind)).toEqual([
      'REPORTED', 'RESPONSIBILITY_PROPOSED', 'RESPONSIBILITY_ACCEPTED', 'STATUS_CHANGED', 'VISIT_RECORDED',
    ])
    await verifyMaintenanceVisit(record.caseId, visit.id, record.tenant.id, { outcome: 'FIXED' })
  })

  it('treats a proposal against an open one as a counter-offer and keeps one open at a time', async () => {
    const record = await reported('counter')
    const first = await proposeResponsibility(record.caseId, record.tenant.id, { ...shared, arrangedBy: 'LANDLORD', payer: 'LANDLORD', tenantCap: null, basis: 'FAIR_WEAR', reason: 'Old basin' })
    const replaced = await proposeResponsibility(record.caseId, record.tenant.id, { ...shared, basis: 'FAIR_WEAR', reason: 'I will pay the minor part' })
    const counter = await proposeResponsibility(record.caseId, record.agent.id, tenantPays)

    const rows = await db.responsibilityProposal.findMany({ where: { caseId: record.caseId }, orderBy: { createdAt: 'asc' } })
    expect(rows.map((row) => [row.id, row.status])).toEqual([
      [first.id, 'SUPERSEDED'], [replaced.id, 'REJECTED'], [counter.id, 'PENDING'],
    ])
    expect(rows[1].respondedById).toBe(record.agent.id)
    await expect(db.responsibilityProposal.create({
      data: { ...tenantPays, caseId: record.caseId, proposedById: record.tenant.id },
    })).rejects.toThrow()

    await answerResponsibility(record.caseId, counter.id, record.tenant.id, { decision: 'REJECT', note: 'Crack was there at check-in' })
    await expect(answerResponsibility(record.caseId, counter.id, record.tenant.id, { decision: 'ACCEPT' }))
      .rejects.toThrow('Maintenance responsibility conflict')
    const detail = await maintenanceCaseDetail(record.caseId, record.agent.id)
    expect(detail.responsibility).toMatchObject({ agreement: null, pending: null, canPropose: true })
    expect(detail.status).toBe('REPORTED')
  })

  it('lets only the landlord switch off the agent authority to agree costs', async () => {
    const record = await reported('authority')
    await expect(updateTenancyTerms(record.tenancy.id, record.agent.id, { agentMayAgreeCosts: false }))
      .rejects.toThrow('Tenancy not found')
    await expect(updateTenancyTerms(record.tenancy.id, record.tenant.id, { minorRepairCap: '999' }))
      .rejects.toThrow('Tenancy not found')
    await updateTenancyTerms(record.tenancy.id, record.agent.id, { minorRepairCap: '200' })
    await updateTenancyTerms(record.tenancy.id, record.landlord.id, { agentMayAgreeCosts: false })

    const proposal = await proposeResponsibility(record.caseId, record.tenant.id, tenantPays)
    const agentView = await maintenanceCaseDetail(record.caseId, record.agent.id)
    expect(agentView.responsibility).toMatchObject({ canAnswer: false, minorRepairCap: '200' })
    await expect(answerResponsibility(record.caseId, proposal.id, record.agent.id, { decision: 'ACCEPT' }))
      .rejects.toThrow('Responsibility proposal not found')
    await expect(proposeResponsibility(record.caseId, record.agent.id, shared))
      .rejects.toThrow('Maintenance case not found')
    await expect(answerResponsibility(record.caseId, proposal.id, record.agent.id, { decision: 'WITHDRAW' }))
      .rejects.toThrow('Responsibility proposal not found')
    await answerResponsibility(record.caseId, proposal.id, record.landlord.id, { decision: 'ACCEPT' })
  })

  it('hands the repair to the tenant and the confirmation to the landlord when so agreed', async () => {
    const record = await reported('tenant-arranges')
    const proposal = await proposeResponsibility(record.caseId, record.landlord.id, tenantPays)
    await answerResponsibility(record.caseId, proposal.id, record.tenant.id, { decision: 'ACCEPT' })

    await expect(addMaintenanceVisit(record.caseId, record.agent.id, { completedAt: new Date().toISOString() }))
      .rejects.toThrow('Maintenance case not found')
    const visit = await addMaintenanceVisit(record.caseId, record.tenant.id, {
      completedAt: new Date().toISOString(), cost: '95', notes: 'Replaced the basin myself',
    })
    await expect(verifyMaintenanceVisit(record.caseId, visit.id, record.tenant.id, { outcome: 'FIXED' }))
      .rejects.toThrow('Maintenance case not found')
    await verifyMaintenanceVisit(record.caseId, visit.id, record.agent.id, { outcome: 'FIXED' })
    const detail = await maintenanceCaseDetail(record.caseId, record.tenant.id)
    expect(detail).toMatchObject({
      status: 'RESOLVED', canLogVisit: true, canVerify: false,
      responsibility: { arrangedBy: 'TENANT', shares: { tenant: '95.00', landlord: '0.00' } },
    })
  })

  it('refuses outsiders as if the proposal did not exist, and closed cases take no proposals', async () => {
    const record = await reported('outsider')
    const stranger = await fixture('outsider-other')
    const proposal = await proposeResponsibility(record.caseId, record.tenant.id, tenantPays)
    const refused = await answerResponsibility(record.caseId, proposal.id, stranger.landlord.id, { decision: 'ACCEPT' })
      .catch((error: Error) => error.message)
    const missing = await answerResponsibility('not-a-case', proposal.id, stranger.landlord.id, { decision: 'ACCEPT' })
      .catch((error: Error) => error.message)
    expect(refused).toBe(missing)

    await answerResponsibility(record.caseId, proposal.id, record.tenant.id, { decision: 'WITHDRAW' })
    await updateMaintenanceCase(record.caseId, record.landlord.id, {
      status: 'CLOSED_NO_ACTION', resolutionReason: 'Reported twice',
    })
    await expect(proposeResponsibility(record.caseId, record.tenant.id, tenantPays))
      .rejects.toThrow('Invalid maintenance status transition')
  })
})
