'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAgent } from '@/lib/auth'
import { recordEvent } from '@/lib/property-history'
import { lockPropertyRecords, manageableProperty, propertyManagement, PROPERTY_TRASH_DAYS, PropertyLifecycleError } from '@/lib/property-management'

const lifecycleInput = z.object({
  action: z.enum(['archive', 'unarchive', 'trash', 'restore']),
  confirmation: z.string().optional(),
})

export async function updatePropertyLifecycle(propertyId: string, raw: z.input<typeof lifecycleInput>) {
  const actor = await requireAgent()
  const input = lifecycleInput.parse(raw)
  const result = await db.$transaction(async (tx) => {
    await lockPropertyRecords(tx, propertyId)
    const managed = await tx.property.findFirst({
      where: { AND: [{ id: propertyId }, manageableProperty(actor.id)] }, select: { id: true },
    })
    if (!managed) throw new Error('Property not found')
    const current = await propertyManagement(propertyId, actor.id, tx)
    const now = new Date()
    if (input.action === 'trash') {
      z.string().refine((value) => value === current.confirmationLabel, { message: 'Type the property address to confirm deletion' }).parse(input.confirmation)
      if (!current.canDelete) throw new PropertyLifecycleError('property_history', 'This property has records that must be preserved. Archive it instead.')
      if (current.state !== 'TRASHED') await tx.property.update({ where: { id: propertyId }, data: {
        trashedAt: now, trashExpiresAt: new Date(now.getTime() + PROPERTY_TRASH_DAYS * 86400_000), trashedById: actor.id,
      } })
    } else if (input.action === 'restore') {
      if (current.state === 'TRASHED') {
        if (!current.trashExpiresAt || new Date(current.trashExpiresAt) <= now) throw new PropertyLifecycleError('property_restore_expired', 'The 30-day recovery period has ended.')
        await tx.property.update({ where: { id: propertyId }, data: { trashedAt: null, trashExpiresAt: null, trashedById: null } })
      }
    } else {
      if (current.state === 'TRASHED') throw new PropertyLifecycleError('property_trashed', 'This property is in Recently deleted. Restore it first.')
      await tx.property.update({ where: { id: propertyId }, data: { archivedAt: input.action === 'archive' ? now : null } })
    }
    await recordEvent(tx, {
      propertyId, tenancyId: null, inspectionId: null, actorId: actor.id, kind: `PROPERTY_${input.action.toUpperCase()}`,
      summary: {
        archive: 'archived the property',
        unarchive: 'unarchived the property',
        trash: 'moved the property to Recently deleted',
        restore: 'restored the property from Recently deleted',
      }[input.action],
    })
    const agencies = await tx.tenancy.findMany({
      where: { propertyId, agencyId: { not: null } }, select: { agencyId: true }, distinct: ['agencyId'],
    })
    if (agencies.length) await tx.agencyActivity.createMany({ data: agencies.map(({ agencyId }) => ({
      agencyId: agencyId!, actorId: actor.id, actorName: actor.name,
      subjectId: propertyId, subjectName: current.label, action: `PROPERTY_${input.action.toUpperCase()}`,
    })) })
    return propertyManagement(propertyId, actor.id, tx)
  }, { timeout: 15000 })
  revalidatePath('/properties')
  revalidatePath(`/properties/${propertyId}/settings`)
  revalidatePath('/inspections')
  revalidatePath('/team')
  return result
}
