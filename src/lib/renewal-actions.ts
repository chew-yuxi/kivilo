'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAgent, authorizeAgentTenancy } from '@/lib/auth'

export async function respondToRenewal(tenancyId: string, choice: 'NOT_RENEWING' | 'DISMISSED' | 'LATER') {
  const agent = await requireAgent()
  await authorizeAgentTenancy(tenancyId, agent.id)
  const decision = z.enum(['NOT_RENEWING', 'DISMISSED', 'LATER']).parse(choice)
  await db.tenancy.update({
    where: { id: tenancyId },
    data: decision === 'LATER'
      ? { renewalSnoozedUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }
      : { renewalDecision: decision, renewalSnoozedUntil: null },
  })
  revalidatePath('/inspections')
}

const renewalInput = z.object({
  startDate: z.iso.date(),
  endDate: z.iso.date(),
  monthlyRent: z.string().regex(/^\d{1,8}(\.\d{1,2})?$/),
  deposit: z.string().regex(/^\d{1,8}(\.\d{1,2})?$/),
})

/// Reuse the property and the same parties. Confirming a next term creates its own
/// working check-in; the signed report, its dates and inventory remain untouched.
export async function createRenewal(tenancyId: string, raw: z.input<typeof renewalInput>) {
  const agent = await requireAgent()
  await authorizeAgentTenancy(tenancyId, agent.id)
  const input = renewalInput.parse(raw)
  const startDate = new Date(input.startDate)
  const endDate = new Date(input.endDate)
  const inspectionId = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Tenancy" WHERE "id" = ${tenancyId} FOR UPDATE`
    const source = await tx.tenancy.findUniqueOrThrow({
      where: { id: tenancyId },
      include: {
        renewedAs: { include: { inspections: { select: { id: true }, take: 1 } } },
        inspections: { where: { kind: 'CHECK_IN' }, orderBy: { createdAt: 'desc' }, take: 1 },
      },
    })
    if (source.renewedAs) return source.renewedAs.inspections[0].id
    if (startDate <= source.endDate || endDate <= startDate) {
      throw new Error('Renewal dates must follow the current tenancy and end after they start')
    }
    const renewal = await tx.inspection.create({
      data: {
        kind: 'CHECK_IN',
        conductedBy: { connect: { id: agent.id } },
        fullyFurnished: source.inspections[0]?.fullyFurnished ?? true,
        tenancy: { create: {
          propertyId: source.propertyId,
          landlordId: source.landlordId,
          tenantId: source.tenantId,
          agentId: source.agentId,
          renewedFromId: source.id,
          startDate,
          endDate,
          monthlyRent: input.monthlyRent,
          deposit: input.deposit,
          minorRepairCap: source.minorRepairCap,
          agentMayAgreeCosts: source.agentMayAgreeCosts,
        } },
      },
      select: { id: true },
    })
    return renewal.id
  })
  revalidatePath('/inspections')
  return inspectionId
}
