import { z } from 'zod'
import { db } from '@/lib/db'
import { actsAsAgent } from '@/lib/auth'
import { lockAgencyTenancy } from '@/lib/agency'
import { fieldChanges, recordEvent, tenancyPlace } from '@/lib/property-history'
import type { Prisma } from '@/generated/prisma'

const email = z.preprocess(
  (value) => typeof value === 'string' ? value.trim().toLowerCase() || null : value,
  z.email().nullable(),
)
const money = z.string().trim().regex(/^\d{1,8}(?:\.\d{1,2})?$/, 'Enter a valid SGD amount with up to 2 decimals')

export const tenancyDetailsInput = z.object({
  landlordEmail: email,
  tenantEmail: email,
  startDate: z.iso.date(),
  endDate: z.iso.date(),
  monthlyRent: money,
  deposit: money,
})

function calendarDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`)
}

/// Party rows can be shared by several tenancies, and old reports read them too. An
/// email change therefore points this draft tenancy at the person identified by the
/// new address instead of mutating a row that may already belong to signed history.
async function partyForEmail(
  tx: Prisma.TransactionClient,
  current: { id: string; name: string; email: string | null },
  nextEmail: string | null,
) {
  if (current.email === nextEmail) return current.id
  if (nextEmail === null) {
    return (await tx.stakeholder.create({ data: { name: current.name } })).id
  }
  return (await tx.stakeholder.upsert({
    where: { email: nextEmail },
    update: {},
    create: { name: current.name, email: nextEmail },
  })).id
}

/// Edits the current deal facts while they are still working data. Sending any report
/// freezes the tenancy and party details along with the rooms and inventory.
export async function updateTenancyDetails(tenancyId: string, actorId: string, raw: unknown) {
  const input = tenancyDetailsInput.parse(raw)
  const startDate = calendarDate(input.startDate)
  const endDate = calendarDate(input.endDate)
  if (endDate <= startDate) throw new Error('The tenancy must end after it starts')
  if (input.landlordEmail && input.landlordEmail === input.tenantEmail) {
    throw new Error('The landlord and tenant need different email addresses')
  }

  await db.$transaction(async (tx) => {
    await lockAgencyTenancy(tenancyId, tx)
    await tx.$queryRaw`SELECT "id" FROM "Inspection" WHERE "tenancyId" = ${tenancyId} ORDER BY "id" FOR UPDATE`
    const current = await tx.tenancy.findFirst({
      where: { AND: [{ id: tenancyId }, actsAsAgent(actorId)] },
      select: {
        id: true, propertyId: true, agentId: true, startDate: true, endDate: true,
        monthlyRent: true, deposit: true,
        landlord: { select: { id: true, name: true, email: true } },
        tenant: { select: { id: true, name: true, email: true } },
        collaborators: { select: { stakeholderId: true } },
        inspections: { select: { status: true } },
      },
    })
    if (!current) throw new Error('Tenancy not found')
    if (current.inspections.some((inspection) =>
      inspection.status === 'AWAITING_SIGNATURE' || inspection.status === 'COMPLETED')) {
      throw new Error('Tenancy details are fixed after a report is sent for signature')
    }

    const landlordId = await partyForEmail(tx, current.landlord, input.landlordEmail)
    const tenantId = await partyForEmail(tx, current.tenant, input.tenantEmail)
    const workingAgents = new Set([
      current.agentId,
      ...current.collaborators.map((collaborator) => collaborator.stakeholderId),
    ].filter((id): id is string => id !== null))
    if (landlordId === tenantId) throw new Error('The landlord and tenant must be different people')
    if (workingAgents.has(landlordId) || workingAgents.has(tenantId)) {
      throw new Error('A landlord or tenant cannot also be an agent on this tenancy')
    }

    await tx.tenancy.update({ where: { id: tenancyId }, data: {
      landlordId, tenantId, startDate, endDate,
      monthlyRent: input.monthlyRent,
      deposit: input.deposit,
    } })
    const changes = [
      ...fieldChanges(
        { landlordEmail: current.landlord.email, tenantEmail: current.tenant.email },
        input,
        { landlordEmail: 'Landlord email', tenantEmail: 'Tenant email' },
      ),
      ...fieldChanges(current, { startDate, endDate, monthlyRent: input.monthlyRent, deposit: input.deposit }, {
        startDate: 'Tenancy start', endDate: 'Tenancy end', monthlyRent: 'Monthly rent', deposit: 'Deposit',
      }),
    ]
    if (changes.length) await recordEvent(tx, {
      ...await tenancyPlace(tx, tenancyId), actorId, kind: 'TENANCY_DETAILS_CHANGED',
      summary: 'changed the tenancy details', changes,
    })
  })
}
