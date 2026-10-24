import { randomUUID } from 'node:crypto'
import { afterAll, describe, expect, it, vi } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/headers', () => ({ headers: async () => new Headers() }))
vi.mock('@/lib/auth', async (original) => {
  const actual = await original<typeof import('@/lib/auth')>()
  return { ...actual, requireAgent: vi.fn(), currentStakeholder: vi.fn(), authorizeRoom: vi.fn(actual.authorizeRoom) }
})
vi.mock('@/lib/storage', async (original) => ({
  ...await original<typeof import('@/lib/storage')>(),
  captureExists: vi.fn(async () => true), createUploadUrl: vi.fn(async () => ({ signedUrl: 'https://storage.test/upload', token: 'example' })),
}))

import { db } from '@/lib/db'
import { authorizeInspection, authorizeRoom, authorizeTenancy, currentStakeholder, requireAgent } from '@/lib/auth'
import { agencyDetail, agencyList } from '@/lib/agency'
import { assignTenancy, changeAgencyMember, createAgency, inviteAgencyMember, respondAgencyInvitation } from '@/lib/agency-actions'
import { addTenancyCollaborator, removeTenancyCollaborator } from '@/lib/tenancy-access-actions'
import { tenancyAccess } from '@/lib/tenancy-access'
import { notificationCanBeDelivered } from '@/lib/notification-recipients'
import { requestAccountDeletion } from '@/lib/account-actions'
import { completeReview, createInspection, registerCapture, renameRoom, requestUploadUrl, signInspection } from '@/lib/actions'
import { captureExists, createUploadUrl } from '@/lib/storage'
import { reportFingerprint } from '@/lib/report-fingerprint'
import { buildReportModel, loadReportRow, reportHash } from '@/lib/report-pdf/model'
import { signedReport } from '@/lib/report'
import { createRenewal } from '@/lib/renewal-actions'
import { GET } from '@/app/api/v1/agencies/[id]/route'
import type { AgencyRole, Stakeholder } from '@/generated/prisma'

const tag = randomUUID()
const people: string[] = []
const properties: string[] = []
const agencies: string[] = []

async function person(name: string) {
  const value = await db.stakeholder.create({ data: { name: `${name} ${tag}`, email: `${randomUUID()}@example.test` } })
  people.push(value.id)
  return value
}

function as(actor: Stakeholder) {
  vi.mocked(requireAgent).mockResolvedValue(actor)
  vi.mocked(currentStakeholder).mockResolvedValue(actor)
}

async function team() {
  const owner = await person('Owner')
  as(owner)
  const agency = await createAgency(`Agency ${tag}`)
  agencies.push(agency.id)
  return { owner, agency }
}

async function member(agencyId: string, role: AgencyRole = 'AGENT') {
  const actor = await person(role)
  const membership = await db.agencyMembership.create({ data: { agencyId, stakeholderId: actor.id, role, status: 'ACTIVE', acceptedAt: new Date() } })
  return { actor, membership }
}

async function deal(lead: Stakeholder, agencyId?: string) {
  const landlord = await person('Landlord')
  const tenant = await person('Tenant')
  const property = await db.property.create({ data: { line1: `Team property ${tag}`, postalCode: '998872', type: 'HDB' } })
  properties.push(property.id)
  const tenancy = await db.tenancy.create({ data: {
    propertyId: property.id, landlordId: landlord.id, tenantId: tenant.id, agentId: lead.id, agencyId,
    startDate: new Date('2026-01-01'), endDate: new Date('2099-01-01'), monthlyRent: '3000', deposit: '6000',
    inspections: { create: { kind: 'CHECK_IN', conductedById: lead.id } },
  }, include: { inspections: true } })
  return { property, tenancy, inspection: tenancy.inspections[0], landlord, tenant }
}

afterAll(async () => {
  await db.property.deleteMany({ where: { id: { in: properties } } })
  await db.agency.deleteMany({ where: { id: { in: agencies } } })
  await db.stakeholder.deleteMany({ where: { id: { in: people } } })
  await db.$disconnect()
})

describe('persistent agency membership and assignment', () => {
  it('creates an owned operational workspace without changing billing or personal access', async () => {
    const { owner, agency } = await team()
    expect(agency).toMatchObject({ role: 'OWNER', canManage: true, members: [{ stakeholderId: owner.id, status: 'ACTIVE' }] })
    expect((await db.stakeholder.findUniqueOrThrow({ where: { id: owner.id } })).teamId).toBeNull()
    const other = await person('Unrelated')
    const privateDeal = await deal(other)
    await expect(authorizeInspection(privateDeal.inspection.id, owner.id)).rejects.toThrow('Inspection not found')
    expect((await agencyList(owner.id)).agencies).toMatchObject([{ id: agency.id, memberCount: 1 }])
    expect(agency.activity[0].action).toBe('Created team')
  })

  it('requires the invited account to accept before granting manager access and leaves personal work private', async () => {
    const { owner, agency } = await team()
    const invitee = await person('Invitee')
    const agencyDeal = await deal(owner, agency.id)
    const ownDeal = await deal(owner)
    const inviteesPrivate = await deal(invitee)
    as(owner)
    const invited = await inviteAgencyMember(agency.id, { email: ` ${invitee.email!.toUpperCase()} `, role: 'MANAGER' })
    const invitation = invited.members.find((value) => value.stakeholderId === invitee.id)!
    await expect(authorizeInspection(agencyDeal.inspection.id, invitee.id)).rejects.toThrow('Inspection not found')
    await expect(respondAgencyInvitation(agency.id, invitation.id, 'accept')).rejects.toThrow('Invitation not found')
    as(invitee)
    expect((await agencyList(invitee.id)).invitations).toMatchObject([{ id: invitation.id }])
    await respondAgencyInvitation(agency.id, invitation.id, 'accept')
    await expect(authorizeInspection(agencyDeal.inspection.id, invitee.id)).resolves.toBeTruthy()
    await expect(authorizeInspection(ownDeal.inspection.id, invitee.id)).rejects.toThrow('Inspection not found')
    await expect(authorizeInspection(inviteesPrivate.inspection.id, owner.id)).rejects.toThrow('Inspection not found')
    expect(await db.notification.count({ where: { agencyMembershipId: invitation.id } })).toBe(0)
  })

  it('gives agents only assigned work, keeps the directory persistent, and rejects managerial actions', async () => {
    const { owner, agency } = await team()
    const { actor: agent } = await member(agency.id)
    const assigned = await deal(owner, agency.id)
    const hidden = await deal(owner, agency.id)
    as(owner)
    await assignTenancy(assigned.tenancy.id, { memberIds: [agent.id] })
    const notification = await db.notification.findFirstOrThrow({ where: { tenancyId: assigned.tenancy.id, recipientId: agent.id, kind: 'PROPERTY_SHARED' } })
    expect(await notificationCanBeDelivered(db, notification)).toBe(true)
    await assignTenancy(assigned.tenancy.id, { memberIds: [agent.id] })
    expect(await db.notification.count({ where: { tenancyId: assigned.tenancy.id, recipientId: agent.id } })).toBe(1)
    await expect(authorizeInspection(assigned.inspection.id, agent.id)).resolves.toBeTruthy()
    await expect(authorizeTenancy(assigned.tenancy.id, agent.id)).resolves.toMatchObject({ role: 'AGENT' })
    await expect(authorizeInspection(hidden.inspection.id, agent.id)).rejects.toThrow('Inspection not found')
    const view = await agencyDetail(agency.id, agent.id)
    expect(view.members).toHaveLength(2)
    expect(view.tenancies.map((value) => value.id)).toEqual([assigned.tenancy.id])
    as(agent)
    await expect(inviteAgencyMember(agency.id, { email: 'nope@example.test' })).rejects.toThrow('Team not found')
    await expect(assignTenancy(hidden.tenancy.id, { leadAgentId: agent.id })).rejects.toThrow('Tenancy not found')
    as(owner)
    await assignTenancy(assigned.tenancy.id, { memberIds: [] })
    expect(await notificationCanBeDelivered(db, notification)).toBe(false)
  })

  it('moves a private tenancy only at its lead’s explicit choice and validates every named assignee', async () => {
    const { owner, agency } = await team()
    const { actor: agent } = await member(agency.id)
    const own = await deal(agent)
    const sibling = await deal(agent)
    as(owner)
    await expect(assignTenancy(own.tenancy.id, { agencyId: agency.id })).rejects.toThrow('Tenancy not found')
    as(agent)
    const view = await assignTenancy(own.tenancy.id, { agencyId: agency.id })
    expect(view).toMatchObject({ agency: { id: agency.id }, canManageAssignment: true })
    await expect(authorizeInspection(own.inspection.id, owner.id)).resolves.toBeTruthy()
    await expect(authorizeInspection(sibling.inspection.id, owner.id)).rejects.toThrow('Inspection not found')
    const stranger = await person('Stranger')
    await expect(assignTenancy(own.tenancy.id, { memberIds: [stranger.id] })).rejects.toThrow('Choose active members')
    await expect(assignTenancy(own.tenancy.id, { leadAgentId: own.tenant.id })).rejects.toThrow()
  })

  it('transfers responsibility without rewriting the conductor or signed report evidence', async () => {
    const { owner, agency } = await team()
    const { actor: first } = await member(agency.id)
    const { actor: next } = await member(agency.id)
    const existing = await deal(first, agency.id)
    await db.inspection.update({ where: { id: existing.inspection.id }, data: { status: 'COMPLETED' } })
    const signature = await db.signature.create({ data: { inspectionId: existing.inspection.id, stakeholderId: existing.landlord.id, imageData: 'data:image/png;base64,AA==', contentHash: 'frozen-hash' } })
    const previousModel = buildReportModel((await loadReportRow(existing.inspection.id))!)
    as(first)
    expect(await assignTenancy(existing.tenancy.id, { leadAgentId: next.id, memberIds: [] })).toEqual({ accessRemoved: true })
    await expect(authorizeInspection(existing.inspection.id, first.id)).rejects.toThrow('Inspection not found')
    await expect(authorizeInspection(existing.inspection.id, next.id)).resolves.toBeTruthy()
    expect((await db.inspection.findUniqueOrThrow({ where: { id: existing.inspection.id } })).conductedById).toBe(first.id)
    expect(await db.signature.findUnique({ where: { id: signature.id } })).toEqual(signature)
    const model = buildReportModel((await loadReportRow(existing.inspection.id))!)
    expect(model.preparer).toEqual({ name: first.name, email: first.email })
    expect(reportHash(model)).toBe(reportHash(previousModel))
    expect((await signedReport(existing.inspection.id, owner.id)).agent).toBe(first.name)
    expect((await tenancyAccess(existing.tenancy.id, owner.id)).canManageAccess).toBe(true)
    expect(await db.inspection.findUnique({ where: { id: existing.inspection.id } })).toMatchObject({ reportAgentId: first.id, reportAgencyId: agency.id, reportAgentFrozen: true })
  })

  it('freezes the report lead at Send so handover between signatures keeps both fingerprints equal', async () => {
    const { owner, agency } = await team()
    const { actor: next } = await member(agency.id)
    const existing = await deal(owner, agency.id)
    await db.room.create({ data: { inspectionId: existing.inspection.id, name: 'Kitchen', order: 0, status: 'REVIEWED' } })
    as(owner)
    await completeReview(existing.inspection.id)
    expect(await db.inspection.findUnique({ where: { id: existing.inspection.id } })).toMatchObject({
      reportAgentId: owner.id,
      reportAgencyId: agency.id,
      reportAgentFrozen: true,
    })
    const firstHash = await reportFingerprint(db, existing.inspection.id)
    await signInspection(existing.inspection.id, existing.landlord.id, 'data:image/png;base64,AA==')
    await assignTenancy(existing.tenancy.id, { leadAgentId: next.id })
    expect(await reportFingerprint(db, existing.inspection.id)).toBe(firstHash)
    await signInspection(existing.inspection.id, existing.tenant.id, 'data:image/png;base64,AA==')
    const signatures = await db.signature.findMany({ where: { inspectionId: existing.inspection.id } })
    expect(signatures.map((signature) => signature.contentHash)).toEqual([firstHash, firstHash])
  })

  it('preserves a legacy frozen report with no lead when assigning its first responsible agent', async () => {
    const { owner, agency } = await team()
    const { actor: next } = await member(agency.id)
    const existing = await deal(owner, agency.id)
    await db.tenancy.update({ where: { id: existing.tenancy.id }, data: { agentId: null } })
    await db.inspection.update({ where: { id: existing.inspection.id }, data: { status: 'AWAITING_SIGNATURE' } })
    const firstHash = await reportFingerprint(db, existing.inspection.id)
    as(owner)
    await assignTenancy(existing.tenancy.id, { leadAgentId: next.id })
    expect(await db.inspection.findUnique({ where: { id: existing.inspection.id } })).toMatchObject({ reportAgentId: null, reportAgencyId: agency.id, reportAgentFrozen: true })
    expect(await reportFingerprint(db, existing.inspection.id)).toBe(firstHash)
  })

  it('removes agency access and hands over leads while preserving private work, outside grants and drafts', async () => {
    const { owner, agency } = await team()
    const { actor: leaver, membership } = await member(agency.id)
    const own = await deal(leaver, agency.id)
    const shared = await deal(owner, agency.id)
    const privateDeal = await deal(leaver)
    const outside = await deal(owner)
    for (const value of [shared, outside]) await db.tenancyCollaborator.create({ data: { tenancyId: value.tenancy.id, stakeholderId: leaver.id } })
    await db.inspectionAccessGrant.create({ data: { inspectionId: shared.inspection.id, stakeholderId: leaver.id } })
    const draft = await db.findingPhotoDraft.create({ data: { id: randomUUID(), inspectionId: own.inspection.id, createdById: leaver.id } })
    const photo = await db.findingPhoto.create({ data: { clientId: randomUUID(), draftId: draft.id, storagePath: `agency-test/${randomUUID()}.jpg`, mimeType: 'image/jpeg' } })
    as(owner)
    await expect(changeAgencyMember(agency.id, membership.id, { action: 'remove' })).rejects.toThrow('Choose an active team member')
    await changeAgencyMember(agency.id, membership.id, { action: 'remove', reassignToId: owner.id })
    await expect(authorizeInspection(own.inspection.id, leaver.id)).rejects.toThrow('Inspection not found')
    await expect(authorizeInspection(shared.inspection.id, leaver.id)).rejects.toThrow('Inspection not found')
    await expect(authorizeInspection(privateDeal.inspection.id, leaver.id)).resolves.toBeTruthy()
    await expect(authorizeInspection(outside.inspection.id, leaver.id)).resolves.toBeTruthy()
    expect((await db.tenancy.findUniqueOrThrow({ where: { id: own.tenancy.id } })).agentId).toBe(owner.id)
    expect(await db.findingPhotoDraft.findUnique({ where: { id: draft.id } })).toEqual(draft)
    expect(await db.findingPhoto.findUnique({ where: { clientId: photo.clientId } })).toEqual(photo)
    await expect(addTenancyCollaborator(own.tenancy.id, leaver.email!)).rejects.toThrow('must accept an invitation')
  })

  it('protects the last owner across demotion, removal and account deletion, including racing owner changes', async () => {
    const { owner, agency } = await team()
    const ownerMembership = agency.members[0]
    as(owner)
    await expect(changeAgencyMember(agency.id, ownerMembership.id, { role: 'AGENT' })).rejects.toThrow('last owner')
    await expect(changeAgencyMember(agency.id, ownerMembership.id, { action: 'remove' })).rejects.toThrow('last owner')
    await expect(requestAccountDeletion()).rejects.toThrow('Make another member an owner')
    const second = await member(agency.id, 'OWNER')
    vi.mocked(requireAgent).mockResolvedValueOnce(owner).mockResolvedValueOnce(second.actor)
    const results = await Promise.allSettled([
      changeAgencyMember(agency.id, ownerMembership.id, { role: 'AGENT' }),
      changeAgencyMember(agency.id, second.membership.id, { role: 'AGENT' }),
    ])
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    expect(await db.agencyMembership.count({ where: { agencyId: agency.id, status: 'ACTIVE', role: 'OWNER' } })).toBe(1)
  })

  it('prevents managers changing owners and explains access inherited from management', async () => {
    const { owner, agency } = await team()
    const manager = await member(agency.id, 'MANAGER')
    const existing = await deal(owner, agency.id)
    as(manager.actor)
    await expect(changeAgencyMember(agency.id, agency.members[0].id, { role: 'AGENT' })).rejects.toThrow('Only a team owner')
    await expect(changeAgencyMember(agency.id, manager.membership.id, { role: 'OWNER' })).rejects.toThrow('Only a team owner')
    as(owner)
    await expect(removeTenancyCollaborator(existing.tenancy.id, manager.actor.id)).rejects.toThrow('team-wide access')
    expect(await tenancyAccess(existing.tenancy.id, manager.actor.id)).toMatchObject({ scope: 'TENANCY', canManageAccess: true, visibility: 'SHARED' })
  })

  it('expires, resends, declines and revokes invitations without leaking stale notifications', async () => {
    const { owner, agency } = await team()
    const invitee = await person('Invitee')
    as(owner)
    const invited = await inviteAgencyMember(agency.id, { email: invitee.email! })
    const invitation = invited.members.find((value) => value.stakeholderId === invitee.id)!
    const notice = await db.notification.findFirstOrThrow({ where: { agencyMembershipId: invitation.id } })
    await db.agencyMembership.update({ where: { id: invitation.id }, data: { expiresAt: new Date(0) } })
    expect(await notificationCanBeDelivered(db, notice)).toBe(false)
    as(invitee)
    await expect(respondAgencyInvitation(agency.id, invitation.id, 'accept')).rejects.toThrow('expired')
    expect((await agencyList(invitee.id)).invitations).toEqual([])
    as(owner)
    await changeAgencyMember(agency.id, invitation.id, { action: 'resend' })
    as(invitee)
    await respondAgencyInvitation(agency.id, invitation.id, 'decline')
    expect(await db.notification.count({ where: { agencyMembershipId: invitation.id } })).toBe(0)
    as(owner)
    await inviteAgencyMember(agency.id, { email: invitee.email! })
    await changeAgencyMember(agency.id, invitation.id, { action: 'revoke' })
    as(invitee)
    await expect(respondAgencyInvitation(agency.id, invitation.id, 'accept')).rejects.toThrow('Invitation not found')
  })

  it('serializes assignment against offboarding so a late assignment cannot restore removed access', async () => {
    const { owner, agency } = await team()
    const leaving = await member(agency.id)
    const existing = await deal(owner, agency.id)
    as(owner)
    await Promise.allSettled([
      assignTenancy(existing.tenancy.id, { memberIds: [leaving.actor.id] }),
      changeAgencyMember(agency.id, leaving.membership.id, { action: 'remove', reassignToId: owner.id }),
    ])
    expect((await db.agencyMembership.findUniqueOrThrow({ where: { id: leaving.membership.id } })).status).toBe('REMOVED')
    expect(await db.tenancyCollaborator.count({ where: { tenancyId: existing.tenancy.id, stakeholderId: leaving.actor.id } })).toBe(0)
    await expect(authorizeInspection(existing.inspection.id, leaving.actor.id)).rejects.toThrow('Inspection not found')
  })

  it('rejects capture registration authorized before offboarding while retaining already uploaded bytes', async () => {
    const { owner, agency } = await team()
    const leaving = await member(agency.id)
    const existing = await deal(leaving.actor, agency.id)
    const room = await db.room.create({ data: { inspectionId: existing.inspection.id, name: 'Kitchen', order: 0 } })
    let checked!: () => void
    let resume!: () => void
    const reachedStorage = new Promise<void>((resolve) => { checked = resolve })
    const allowRegistration = new Promise<void>((resolve) => { resume = resolve })
    vi.mocked(captureExists).mockImplementationOnce(async () => { checked(); await allowRegistration; return true })
    as(leaving.actor)
    const clientId = randomUUID()
    const result = registerCapture({ inspectionId: existing.inspection.id, roomId: room.id, clientId,
      storagePath: `${room.id}/${clientId}.jpg`, kind: 'PHOTO', mimeType: 'image/jpeg', sizeBytes: 100, durationSec: null, note: null })
    const rejected = expect(result).rejects.toThrow('Inspection not found')
    await reachedStorage
    as(owner)
    await changeAgencyMember(agency.id, leaving.membership.id, { action: 'remove', reassignToId: owner.id })
    resume()
    await rejected
    expect(await db.capture.count({ where: { roomId: room.id } })).toBe(0)
    expect(await db.storagePurge.count({ where: { path: `${room.id}/${clientId}.jpg` } })).toBe(0)
  })

  it.each(['upload', 'edit'] as const)('rechecks a stale %s request after acquiring the shared access locks', async (operation) => {
    const { owner, agency } = await team()
    const leaving = await member(agency.id)
    const existing = await deal(leaving.actor, agency.id)
    const room = await db.room.create({ data: { inspectionId: existing.inspection.id, name: 'Original room', order: 0 } })
    const actual = await vi.importActual<typeof import('@/lib/auth')>('@/lib/auth')
    let checked!: () => void
    let resume!: () => void
    const authorized = new Promise<void>((resolve) => { checked = resolve })
    const continueRequest = new Promise<void>((resolve) => { resume = resolve })
    vi.mocked(authorizeRoom).mockImplementationOnce(async (id, actorId) => {
      const value = await actual.authorizeRoom(id, actorId)
      checked()
      await continueRequest
      return value
    })
    vi.mocked(createUploadUrl).mockClear()
    as(leaving.actor)
    const result = operation === 'upload'
      ? requestUploadUrl(room.id, existing.inspection.id, 'photo.jpg')
      : renameRoom(room.id, existing.inspection.id, 'Unauthorized change')
    const rejected = expect(result).rejects.toThrow('Inspection not found')
    await authorized
    as(owner)
    await changeAgencyMember(agency.id, leaving.membership.id, { action: 'remove', reassignToId: owner.id })
    resume()
    await rejected
    expect(vi.mocked(createUploadUrl)).not.toHaveBeenCalled()
    expect((await db.room.findUniqueOrThrow({ where: { id: room.id } })).name).toBe('Original room')
  })

  it('serializes invitation acceptance and revocation and refuses strangers identically to missing teams', async () => {
    const { owner, agency } = await team()
    const invitee = await person('Invitee')
    as(owner)
    const invited = await inviteAgencyMember(agency.id, { email: invitee.email! })
    const invitation = invited.members.find((value) => value.stakeholderId === invitee.id)!
    vi.mocked(requireAgent).mockResolvedValueOnce(invitee).mockResolvedValueOnce(owner)
    const outcomes = await Promise.allSettled([
      respondAgencyInvitation(agency.id, invitation.id, 'accept'),
      changeAgencyMember(agency.id, invitation.id, { action: 'revoke' }),
    ])
    expect(outcomes.filter((outcome) => outcome.status === 'fulfilled')).toHaveLength(1)
    expect(await db.notification.count({ where: { agencyMembershipId: invitation.id } })).toBe(0)
    const outsider = await person('Outsider')
    as(outsider)
    for (const id of [agency.id, 'does-not-exist']) {
      const response = await GET(new Request(`http://kivilo.test/api/v1/agencies/${id}`), { params: Promise.resolve({ id }) })
      expect(response.status).toBe(404)
      expect(await response.json()).toEqual({ error: 'not_found' })
    }
  })

  it('creates directly in an explicitly chosen agency and carries that ownership into renewals', async () => {
    const { owner, agency } = await team()
    as(owner)
    const id = await createInspection({ agencyId: agency.id, line1: `Created ${tag}`, unit: null, postalCode: '998872', propertyType: 'HDB', fullyFurnished: false,
      landlordName: 'Owner landlord', landlordEmail: null, tenantName: 'Owner tenant', tenantEmail: null,
      startDate: '2026-01-01', endDate: '2099-01-01', monthlyRent: '3000', deposit: '6000' })
    const inspection = await db.inspection.findUniqueOrThrow({ where: { id }, include: { tenancy: true } })
    properties.push(inspection.tenancy.propertyId)
    people.push(inspection.tenancy.landlordId, inspection.tenancy.tenantId)
    expect(inspection.tenancy.agencyId).toBe(agency.id)
    const renewalId = await createRenewal(inspection.tenancyId, { startDate: '2099-01-02', endDate: '2100-01-02', monthlyRent: '3500', deposit: '7000' })
    expect((await db.inspection.findUniqueOrThrow({ where: { id: renewalId }, include: { tenancy: true } })).tenancy.agencyId).toBe(agency.id)
    const outsider = await person('Outsider')
    as(outsider)
    await expect(createInspection({ agencyId: agency.id, line1: 'Denied', unit: null, postalCode: '998872', propertyType: 'HDB', fullyFurnished: false,
      landlordName: 'Landlord', landlordEmail: null, tenantName: 'Tenant', tenantEmail: null,
      startDate: '2026-01-01', endDate: '2099-01-01', monthlyRent: '3000', deposit: '6000' })).rejects.toThrow('Team not found')
  })
})
