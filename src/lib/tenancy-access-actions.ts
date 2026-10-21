'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAgent, authorizeLeadTenancy } from '@/lib/auth'
import { tenancyAccess } from '@/lib/tenancy-access'
import { activeNotificationRecipients } from '@/lib/notification-recipients'
import { propertyLabel } from '@/lib/format'

/// Inviting a verified mailbox grants one tenancy. A new address is an unclaimed
/// stakeholder, claimed by the existing OTP sign-in flow when its owner signs in.
export async function addTenancyCollaborator(tenancyId: string, rawEmail: string) {
  const agent = await requireAgent()
  await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Tenancy" WHERE "id" = ${tenancyId} FOR UPDATE`
    const tenancy = await authorizeLeadTenancy(tenancyId, agent.id, tx)
    const email = z.email().parse(z.string().trim().toLowerCase().parse(rawEmail))

    // Skip duplicates at the unique email index, including concurrent invitations on
    // other tenancies. Never replace the name or account of an existing stakeholder.
    await tx.stakeholder.createMany({
      data: [{ email, name: email.split('@')[0] }],
      skipDuplicates: true,
    })
    const collaborator = await tx.stakeholder.findUniqueOrThrow({ where: { email } })
    z.string().refine(
      (id) => id !== agent.id && id !== tenancy.landlordId && id !== tenancy.tenantId,
      { message: 'Choose a collaborator other than the lead agent, landlord or tenant' },
    ).parse(collaborator.id)
    const added = await tx.tenancyCollaborator.createMany({
      data: [{ tenancyId, stakeholderId: collaborator.id, grantedById: agent.id }],
      skipDuplicates: true,
    })
    await tx.inspectionAccessGrant.deleteMany({
      where: { stakeholderId: collaborator.id, inspection: { tenancyId } },
    })
    if (added.count && (await activeNotificationRecipients(tx, [collaborator.id])).length) {
      const shared = await tx.tenancy.findUniqueOrThrow({
        where: { id: tenancyId },
        include: { property: true, inspections: { orderBy: { createdAt: 'desc' }, take: 1, select: { id: true } } },
      })
      await tx.notification.create({ data: {
        recipientId: collaborator.id,
        tenancyId,
        kind: 'PROPERTY_SHARED',
        title: `${agent.name} shared a property with you`,
        body: `${agent.name} added you as a collaborator for ${propertyLabel(shared.property)}.`,
        href: shared.inspections[0] ? `/inspections/${shared.inspections[0].id}` : '/inspections',
      } })
    }
  })
  revalidatePath('/inspections')
  revalidatePath(`/tenancies/${tenancyId}`)
  return tenancyAccess(tenancyId, agent.id)
}

export async function removeTenancyCollaborator(tenancyId: string, stakeholderId: string) {
  const agent = await requireAgent()
  await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Tenancy" WHERE "id" = ${tenancyId} FOR UPDATE`
    const tenancy = await authorizeLeadTenancy(tenancyId, agent.id, tx)
    z.string().refine((id) => id !== agent.id, {
      message: 'The lead agent cannot be removed',
    }).parse(stakeholderId)
    await tx.tenancyCollaborator.deleteMany({ where: { tenancyId, stakeholderId } })
    await tx.inspectionAccessGrant.deleteMany({ where: { stakeholderId, inspection: { tenancyId } } })
    // Party access is separate and survives removing any historical agent grant.
    if (stakeholderId !== tenancy.landlordId && stakeholderId !== tenancy.tenantId) {
      await tx.notification.deleteMany({ where: { tenancyId, recipientId: stakeholderId } })
    }
  })
  revalidatePath('/inspections')
  revalidatePath(`/tenancies/${tenancyId}`)
  return tenancyAccess(tenancyId, agent.id)
}
