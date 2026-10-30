'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { recordEvent, tenancyPlace } from '@/lib/property-history'
import { db } from '@/lib/db'
import { requireAgent, authorizeLeadTenancy, tenancyAccessScope } from '@/lib/auth'
import { agencyDetail, freezeReportsBeforeHandover, lockAgency, requireAgencyMembership } from '@/lib/agency'
import { AgencyActionError } from '@/lib/agency-errors'
import { tenancyAccess } from '@/lib/tenancy-access'
import { activeNotificationRecipients } from '@/lib/notification-recipients'
import { propertyLabel } from '@/lib/format'
import { assertCanAddProperty, subscriptionCanResume, subscriptionIsLive } from '@/lib/plan'
import type { AgencyMembership, Prisma, Stakeholder } from '@/generated/prisma'

const agencyName = z.string().trim().min(1).max(100)
const roleSchema = z.enum(['OWNER', 'MANAGER', 'AGENT'])
const invitationInput = z.object({ email: z.email(), role: z.enum(['MANAGER', 'AGENT']).default('AGENT') })

function refreshAgency(agencyId: string) {
  revalidatePath('/team')
  revalidatePath(`/team/${agencyId}`)
  revalidatePath('/inspections')
}

async function audit(tx: Prisma.TransactionClient, agencyId: string, actor: Stakeholder, action: string, subject?: { id: string; name: string }) {
  await tx.agencyActivity.create({ data: {
    agencyId, actorId: actor.id, actorName: actor.name, action,
    subjectId: subject?.id, subjectName: subject?.name,
  } })
}

async function requireManager(agencyId: string, actorId: string, tx: Prisma.TransactionClient) {
  const membership = await requireAgencyMembership(agencyId, actorId, tx)
  if (membership.role === 'AGENT') throw new Error('Team not found')
  return membership
}

async function queueInvitation(tx: Prisma.TransactionClient, membership: AgencyMembership, agency: { name: string }, actor: Stakeholder) {
  await tx.notification.deleteMany({ where: { agencyMembershipId: membership.id } })
  if (!(await activeNotificationRecipients(tx, [membership.stakeholderId])).length) return
  await tx.notification.create({ data: {
    recipientId: membership.stakeholderId, agencyMembershipId: membership.id,
    kind: 'AGENCY_INVITATION', title: `Join ${agency.name} on Kivilo`,
    body: `${actor.name} invited you to join ${agency.name}. Review and accept this invitation within 7 days.`,
    href: '/team',
  } })
}

export async function createAgency(rawName: string) {
  const actor = await requireAgent()
  const name = agencyName.parse(rawName)
  const agency = await db.$transaction(async (tx) => {
    const created = await tx.agency.create({ data: {
      name, members: { create: { stakeholderId: actor.id, role: 'OWNER', status: 'ACTIVE', acceptedAt: new Date() } },
    } })
    await audit(tx, created.id, actor, 'Created team')
    return created
  })
  refreshAgency(agency.id)
  return agencyDetail(agency.id, actor.id)
}

export async function renameAgency(agencyId: string, rawName: string) {
  const actor = await requireAgent()
  const name = agencyName.parse(rawName)
  await db.$transaction(async (tx) => {
    await lockAgency(agencyId, tx)
    await requireManager(agencyId, actor.id, tx)
    await tx.agency.update({ where: { id: agencyId }, data: { name } })
    await audit(tx, agencyId, actor, 'Renamed team', { id: agencyId, name })
  })
  refreshAgency(agencyId)
  return agencyDetail(agencyId, actor.id)
}

export async function inviteAgencyMember(agencyId: string, raw: { email: string; role?: 'MANAGER' | 'AGENT' }) {
  const actor = await requireAgent()
  const input = invitationInput.parse({ ...raw, email: raw.email.trim().toLowerCase() })
  await db.$transaction(async (tx) => {
    await lockAgency(agencyId, tx)
    await requireManager(agencyId, actor.id, tx)
    const agency = await tx.agency.findUniqueOrThrow({ where: { id: agencyId } })
    await tx.stakeholder.createMany({ data: [{ name: input.email.split('@')[0], email: input.email }], skipDuplicates: true })
    const person = await tx.stakeholder.findUniqueOrThrow({ where: { email: input.email } })
    const existing = await tx.agencyMembership.findUnique({ where: { agencyId_stakeholderId: { agencyId, stakeholderId: person.id } } })
    if (existing?.status === 'ACTIVE') throw new AgencyActionError('This person is already a team member.')
    if (existing?.status === 'INVITED' && existing.expiresAt && existing.expiresAt > new Date()) {
      throw new AgencyActionError('An invitation is already pending. Use Resend invitation if needed.')
    }
    const invitation = await tx.agencyMembership.upsert({
      where: { agencyId_stakeholderId: { agencyId, stakeholderId: person.id } },
      create: { agencyId, stakeholderId: person.id, role: input.role, invitedById: actor.id, expiresAt: new Date(Date.now() + 7 * 86400000) },
      update: { role: input.role, status: 'INVITED', invitedById: actor.id, expiresAt: new Date(Date.now() + 7 * 86400000), acceptedAt: null, removedAt: null },
    })
    await queueInvitation(tx, invitation, agency, actor)
    await audit(tx, agencyId, actor, 'Invited member', person)
  })
  refreshAgency(agencyId)
  return agencyDetail(agencyId, actor.id)
}

export async function respondAgencyInvitation(agencyId: string, memberId: string, rawAction: 'accept' | 'decline') {
  const actor = await requireAgent()
  const action = z.enum(['accept', 'decline']).parse(rawAction)
  await db.$transaction(async (tx) => {
    await lockAgency(agencyId, tx)
    const invitation = await tx.agencyMembership.findFirst({ where: { id: memberId, agencyId, stakeholderId: actor.id, status: 'INVITED' } })
    if (!invitation) throw new Error('Invitation not found')
    if (!invitation.expiresAt || invitation.expiresAt <= new Date()) {
      throw new AgencyActionError('This invitation has expired. Ask a team manager to send it again.')
    }
    if (action === 'accept') {
      const subscription = await tx.subscription.findUnique({ where: { agencyId } })
      if (subscription && subscriptionIsLive(subscription) &&
          await tx.agencyMembership.count({ where: { agencyId, status: 'ACTIVE' } }) >= subscription.seats) {
        throw new AgencyActionError('This team needs another paid seat. Ask its billing manager to add a seat before accepting.')
      }
    }
    await tx.agencyMembership.update({ where: { id: invitation.id }, data: action === 'accept'
      ? { status: 'ACTIVE', acceptedAt: new Date(), expiresAt: null }
      : { status: 'REMOVED', removedAt: new Date(), expiresAt: null } })
    await tx.notification.deleteMany({ where: { agencyMembershipId: invitation.id } })
    await audit(tx, agencyId, actor, action === 'accept' ? 'Joined team' : 'Declined invitation', actor)
  })
  refreshAgency(agencyId)
  return { accepted: action === 'accept' }
}

const memberChange = z.union([
  z.object({ role: roleSchema }).strict(),
  z.object({ action: z.enum(['remove', 'revoke', 'resend']), reassignToId: z.string().min(1).optional() }).strict(),
])

export async function changeAgencyMember(agencyId: string, memberId: string, raw: { role?: 'OWNER' | 'MANAGER' | 'AGENT'; action?: 'remove' | 'revoke' | 'resend'; reassignToId?: string }) {
  const actor = await requireAgent()
  const input = memberChange.parse(raw)
  let removedSelf = false
  await db.$transaction(async (tx) => {
    await lockAgency(agencyId, tx)
    const manager = await requireManager(agencyId, actor.id, tx)
    const member = await tx.agencyMembership.findFirst({ where: { id: memberId, agencyId }, include: { stakeholder: true, agency: true } })
    if (!member || member.status === 'REMOVED') throw new Error('Member not found')
    if (manager.role !== 'OWNER' && (member.role === 'OWNER' || ('role' in input && input.role === 'OWNER'))) {
      throw new AgencyActionError('Only a team owner can change ownership.')
    }
    if (member.status === 'ACTIVE' && (('role' in input && input.role === 'AGENT') || ('action' in input && input.action === 'remove'))) {
      const subscription = await tx.subscription.findUnique({ where: { agencyId } })
      if (subscription?.managedById === member.stakeholderId &&
          (subscription.stripeSubscriptionId || subscription.googlePlayPurchaseId || subscription.applePurchaseId) && subscriptionCanResume(subscription)) {
        throw new AgencyActionError('This member manages the team’s paid subscription. Cancel it and wait until it ends before removing their billing access.')
      }
      if (subscription?.managedById === member.stakeholderId) {
        // A future subscription may be bought by another manager. The old payer's
        // customer is never reused when managedById has been cleared.
        await tx.subscription.update({ where: { id: subscription.id }, data: { managedById: null } })
      }
    }
    const removingOwner = member.status === 'ACTIVE' && member.role === 'OWNER' &&
      (('role' in input && input.role !== 'OWNER') || ('action' in input && input.action === 'remove'))
    if (removingOwner && await tx.agencyMembership.count({ where: { agencyId, status: 'ACTIVE', role: 'OWNER' } }) <= 1) {
      throw new AgencyActionError('Make another active member an owner before removing the last owner.')
    }
    if ('role' in input) {
      if (member.status !== 'ACTIVE') throw new AgencyActionError('Wait for the invitation to be accepted before changing this role.')
      await tx.$queryRaw`SELECT "id" FROM "Tenancy" WHERE "agencyId" = ${agencyId} ORDER BY "id" FOR UPDATE`
      await tx.agencyMembership.update({ where: { id: memberId }, data: { role: input.role } })
      await audit(tx, agencyId, actor, `Changed role to ${input.role.toLowerCase()}`, member.stakeholder)
      return
    }
    if (input.action === 'resend') {
      if (member.status !== 'INVITED') throw new AgencyActionError('This person has already joined the team.')
      const renewed = await tx.agencyMembership.update({ where: { id: memberId }, data: { expiresAt: new Date(Date.now() + 7 * 86400000), invitedById: actor.id } })
      await queueInvitation(tx, renewed, member.agency, actor)
      await audit(tx, agencyId, actor, 'Resent invitation', member.stakeholder)
      return
    }
    if (input.action === 'revoke' && member.status !== 'INVITED') throw new AgencyActionError('Use Remove member to remove an active team member.')
    if (member.status === 'ACTIVE') {
      // Lock every agency tenancy before checking ownership or removing grants.
      // Assignment and sharing take the same locks in the same order.
      await tx.$queryRaw`SELECT "id" FROM "Tenancy" WHERE "agencyId" = ${agencyId} ORDER BY "id" FOR UPDATE`
      const owned = await tx.tenancy.findMany({ where: { agencyId, agentId: member.stakeholderId }, select: { id: true, landlordId: true, tenantId: true } })
      if (owned.length) {
        if (!input.reassignToId || input.reassignToId === member.stakeholderId) throw new AgencyActionError('Choose an active team member to take over this person’s properties.')
        await requireAgencyMembership(agencyId, input.reassignToId, tx)
        if (owned.some((tenancy) => tenancy.landlordId === input.reassignToId || tenancy.tenantId === input.reassignToId)) {
          throw new AgencyActionError('The new lead cannot be a landlord or tenant on one of these tenancies.')
        }
        for (const tenancy of owned) {
          await freezeReportsBeforeHandover(tx, tenancy.id, member.stakeholderId, agencyId)
        }
        await tx.tenancy.updateMany({ where: { agencyId, agentId: member.stakeholderId }, data: { agentId: input.reassignToId } })
        await audit(tx, agencyId, actor, 'Reassigned departing member’s properties', member.stakeholder)
      }
      await tx.tenancyCollaborator.deleteMany({ where: { stakeholderId: member.stakeholderId, tenancy: { agencyId } } })
      await tx.inspectionAccessGrant.deleteMany({ where: { stakeholderId: member.stakeholderId, inspection: { tenancy: { agencyId } } } })
      await tx.notification.deleteMany({ where: { recipientId: member.stakeholderId, tenancy: { agencyId, landlordId: { not: member.stakeholderId }, tenantId: { not: member.stakeholderId } } } })
    }
    await tx.agencyMembership.update({ where: { id: memberId }, data: { status: 'REMOVED', removedAt: new Date(), expiresAt: null } })
    await tx.notification.deleteMany({ where: { agencyMembershipId: memberId } })
    await audit(tx, agencyId, actor, member.status === 'INVITED' ? 'Revoked invitation' : 'Removed member', member.stakeholder)
    removedSelf = member.stakeholderId === actor.id
  })
  refreshAgency(agencyId)
  return removedSelf ? { removed: true as const, accessRemoved: true as const } : agencyDetail(agencyId, actor.id)
}

const assignmentInput = z.object({
  agencyId: z.string().min(1).optional(), leadAgentId: z.string().min(1).optional(), memberIds: z.array(z.string().min(1)).max(100).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, 'Choose a team or assignment to change')

export async function assignTenancy(tenancyId: string, raw: z.input<typeof assignmentInput>) {
  const actor = await requireAgent()
  const input = assignmentInput.parse(raw)
  let changedAgencyId: string | undefined
  await db.$transaction(async (tx) => {
    const before = await tx.tenancy.findUnique({ where: { id: tenancyId }, select: { agencyId: true } })
    if (!before) throw new Error('Tenancy not found')
    const agencyId = before.agencyId ?? input.agencyId
    if (!agencyId) throw new AgencyActionError('Choose a team before assigning team members.')
    changedAgencyId = agencyId
    await lockAgency(agencyId, tx)
    await tx.$queryRaw`SELECT "id" FROM "Tenancy" WHERE "id" = ${tenancyId} FOR UPDATE`
    const tenancy = await authorizeLeadTenancy(tenancyId, actor.id, tx)
    if (tenancy.agencyId !== before.agencyId) throw new AgencyActionError('This tenancy’s team changed. Refresh and try again.')
    if (tenancy.agencyId && input.agencyId && input.agencyId !== tenancy.agencyId) throw new AgencyActionError('A tenancy already assigned to a team cannot be moved to another team.')
    if (!tenancy.agencyId) {
      if (tenancy.agentId !== actor.id) throw new Error('Tenancy not found')
      await requireAgencyMembership(agencyId, actor.id, tx)
      const active = { endDate: { gte: new Date() }, inspections: { none: { kind: 'CHECK_OUT' as const, status: 'COMPLETED' as const } }, property: { trashedAt: null } }
      if (await tx.tenancy.findFirst({ where: { id: tenancy.id, ...active } })) {
        await assertCanAddProperty(actor, agencyId, tx, tenancy.propertyId)
      }
    }
    const leadAgentId = input.leadAgentId ?? tenancy.agentId
    if (!leadAgentId) throw new AgencyActionError('Choose a responsible lead agent.')
    await requireAgencyMembership(agencyId, leadAgentId, tx)
    const ids = [...new Set(input.memberIds ?? [])]
    if ([leadAgentId, ...ids].some((id) => id === tenancy.landlordId || id === tenancy.tenantId)) {
      throw new AgencyActionError('A landlord or tenant cannot be assigned as an agent on their own tenancy.')
    }
    if (ids.length !== await tx.agencyMembership.count({ where: { agencyId, stakeholderId: { in: ids }, status: 'ACTIVE' } })) {
      throw new AgencyActionError('Choose active members of this team.')
    }
    const beforeCollaborators = await tx.tenancyCollaborator.findMany({ where: { tenancyId }, select: { stakeholderId: true } })
    const beforeAssigned = new Set([tenancy.agentId, ...beforeCollaborators.map((member) => member.stakeholderId)])
    if (leadAgentId !== tenancy.agentId || agencyId !== tenancy.agencyId) {
      await freezeReportsBeforeHandover(tx, tenancyId, tenancy.agentId, tenancy.agencyId)
    }
    await tx.tenancy.update({ where: { id: tenancyId }, data: { agencyId, agentId: leadAgentId } })
    if (input.memberIds !== undefined) {
      await tx.tenancyCollaborator.deleteMany({ where: {
        tenancyId, stakeholder: { agencyMemberships: { some: { agencyId } } }, stakeholderId: { notIn: ids },
      } })
      await tx.tenancyCollaborator.createMany({
        data: ids.filter((id) => id !== leadAgentId).map((stakeholderId) => ({ tenancyId, stakeholderId, grantedById: actor.id })), skipDuplicates: true,
      })
      // A removed assignment cannot retain migrated historical access by another route.
      await tx.inspectionAccessGrant.deleteMany({ where: {
        inspection: { tenancyId }, stakeholder: { agencyMemberships: { some: { agencyId } } }, stakeholderId: { notIn: ids },
      } })
    }
    await tx.tenancyCollaborator.deleteMany({ where: { tenancyId, stakeholderId: leadAgentId } })
    const property = await tx.property.findUniqueOrThrow({ where: { id: tenancy.propertyId } })
    const newlyAssigned = [leadAgentId, ...ids].filter((id) => id !== actor.id && !beforeAssigned.has(id))
    const recipients = await activeNotificationRecipients(tx, newlyAssigned)
    if (recipients.length) {
      const inspection = await tx.inspection.findFirst({ where: { tenancyId }, orderBy: { createdAt: 'desc' }, select: { id: true } })
      await tx.notification.createMany({ data: recipients.map((recipientId) => ({
        recipientId, tenancyId, kind: 'PROPERTY_SHARED' as const,
        title: `${actor.name} assigned a property to you`,
        body: `${actor.name} assigned you to ${propertyLabel(property)}.`,
        href: inspection ? `/inspections/${inspection.id}` : '/inspections',
      })) })
    }
    await audit(tx, agencyId, actor, tenancy.agencyId ? 'Changed property assignments' : 'Added property to team', { id: tenancyId, name: property.line1 })
    const lead = leadAgentId !== tenancy.agentId
      ? await tx.stakeholder.findUnique({ where: { id: leadAgentId }, select: { name: true } })
      : null
    const team = tenancy.agencyId ? null : await tx.agency.findUnique({ where: { id: agencyId }, select: { name: true } })
    await recordEvent(tx, {
      ...await tenancyPlace(tx, tenancyId), actorId: actor.id, kind: 'ASSIGNMENT_CHANGED',
      summary: [
        team ? `moved the tenancy to the team ${team.name}` : null,
        lead ? `handed the tenancy to ${lead.name}` : null,
      ].filter(Boolean).join(' and ') || 'changed who is assigned to the tenancy',
    })
  })
  refreshAgency(changedAgencyId!)
  revalidatePath(`/tenancies/${tenancyId}`)
  // Transferring a personally led record can intentionally end the old lead's access.
  if (!await db.tenancy.findFirst({ where: { id: tenancyId, AND: [tenancyAccessScope(actor.id)] }, select: { id: true } })) {
    return { accessRemoved: true as const }
  }
  return tenancyAccess(tenancyId, actor.id)
}
