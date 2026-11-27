import { amountEntered, optionalTenancyAmount, recordedAmount } from '@/lib/tenancy-amounts'
import { z } from 'zod'
import { db } from '@/lib/db'
import { actsAsAgent } from '@/lib/auth'
import { lockAgencyTenancy } from '@/lib/agency'
import { fieldChanges, recordEvent, tenancyPlace } from '@/lib/property-history'
import { allowsPropertyType, countryName, validPostcode } from '@/lib/country'
import type { Prisma } from '@/generated/prisma'

const email = z.preprocess(
  (value) => typeof value === 'string' ? value.trim().toLowerCase() || null : value,
  z.email().nullable(),
)
const optionalText = (max: number) => z.preprocess(
  (value) => typeof value === 'string' ? value.trim() || null : value,
  z.string().max(max).nullable(),
)

export const tenancyDetailsInput = z.object({
  // Optional for released app builds that predate property/name correction.
  line1: z.string().trim().min(1).max(250).optional(),
  unit: optionalText(80).optional(),
  postalCode: z.string().trim().min(1).max(20).optional(),
  propertyType: z.enum(['HDB', 'PRIVATE_NON_LANDED', 'LANDED', 'COMMERCIAL']).optional(),
  landlordName: z.string().trim().min(1).max(200).optional(),
  landlordEmail: email,
  tenantName: z.string().trim().min(1).max(200).optional(),
  tenantEmail: email,
  startDate: z.iso.date(),
  endDate: z.iso.date(),
  monthlyRent: optionalTenancyAmount,
  deposit: optionalTenancyAmount,
  preservesBlankAmounts: z.boolean().optional(),
})

function calendarDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`)
}

/// Party rows can be shared by several tenancies, and old reports read them too. An
/// email change therefore points this draft tenancy at the person identified by the
/// new address instead of mutating a row that may already belong to signed history.
async function partyForDetails(
  tx: Prisma.TransactionClient,
  current: { id: string; name: string; email: string | null; authUserId: string | null },
  nextName: string,
  nextEmail: string | null,
) {
  if (current.name === nextName && current.email === nextEmail) return current.id
  if (current.email === nextEmail) {
    const references = await tx.tenancy.count({
      where: { OR: [{ landlordId: current.id }, { tenantId: current.id }] },
    })
    if (current.authUserId === null && references === 1) {
      await tx.stakeholder.update({ where: { id: current.id }, data: { name: nextName } })
      return current.id
    }
    if (nextEmail !== null) {
      throw new Error('This party name belongs to an existing account or tenancy and cannot be changed here')
    }
    return (await tx.stakeholder.create({ data: { name: nextName } })).id
  }
  if (nextEmail === null) {
    return (await tx.stakeholder.create({ data: { name: nextName } })).id
  }
  const existing = await tx.stakeholder.findUnique({ where: { email: nextEmail } })
  if (existing) {
    if (existing.name !== nextName) {
      throw new Error('That email belongs to a person with a different name')
    }
    return existing.id
  }
  return (await tx.stakeholder.create({ data: { name: nextName, email: nextEmail } })).id
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
    await lockAgencyTenancy(tenancyId, tx, { updateProperty: true })
    await tx.$queryRaw`SELECT "id" FROM "Inspection" WHERE "tenancyId" = ${tenancyId} ORDER BY "id" FOR UPDATE`
    const current = await tx.tenancy.findFirst({
      where: { AND: [{ id: tenancyId }, actsAsAgent(actorId)] },
      select: {
        id: true, propertyId: true, agentId: true, startDate: true, endDate: true,
        monthlyRent: true, deposit: true, monthlyRentEntered: true, depositEntered: true,
        property: { select: { id: true, line1: true, unit: true, postalCode: true, type: true, country: true } },
        landlord: { select: { id: true, name: true, email: true, authUserId: true } },
        tenant: { select: { id: true, name: true, email: true, authUserId: true } },
        collaborators: { select: { stakeholderId: true } },
        inspections: { select: { status: true } },
      },
    })
    if (!current) throw new Error('Tenancy not found')
    if (input.propertyType && !allowsPropertyType(current.property.country, input.propertyType)) {
      throw new Error(`That property type is not offered in ${countryName(current.property.country)}`)
    }
    if (input.postalCode && !validPostcode(current.property.country, input.postalCode)) {
      throw new Error('A Malaysian postcode has 5 digits')
    }
    if (current.inspections.some((inspection) =>
      inspection.status === 'AWAITING_SIGNATURE' || inspection.status === 'COMPLETED')) {
      throw new Error('Tenancy details are fixed after a report is sent for signature')
    }

    const propertyChanges = fieldChanges(current.property, {
      line1: input.line1,
      unit: input.unit,
      postalCode: input.postalCode,
      type: input.propertyType,
    }, { line1: 'Address', unit: 'Unit', postalCode: 'Postal code', type: 'Property type' })
    if (propertyChanges.length && await tx.inspection.count({ where: {
      tenancy: { propertyId: current.propertyId },
      status: { in: ['AWAITING_SIGNATURE', 'COMPLETED'] },
    } })) {
      throw new Error('Property details are fixed after a report is sent for signature')
    }

    const landlordId = await partyForDetails(
      tx, current.landlord, input.landlordName ?? current.landlord.name, input.landlordEmail,
    )
    const tenantId = await partyForDetails(
      tx, current.tenant, input.tenantName ?? current.tenant.name, input.tenantEmail,
    )
    const workingAgents = new Set([
      current.agentId,
      ...current.collaborators.map((collaborator) => collaborator.stakeholderId),
    ].filter((id): id is string => id !== null))
    if (landlordId === tenantId) throw new Error('The landlord and tenant must be different people')
    if (workingAgents.has(landlordId) || workingAgents.has(tenantId)) {
      throw new Error('A landlord or tenant cannot also be an agent on this tenancy')
    }

    const monthlyRentEntered = amountEntered(input.monthlyRent, input.preservesBlankAmounts === true || current.monthlyRentEntered === true && current.monthlyRent.isZero())
    const depositEntered = amountEntered(input.deposit, input.preservesBlankAmounts === true || current.depositEntered === true && current.deposit.isZero())
    await tx.tenancy.update({ where: { id: tenancyId }, data: {
      landlordId, tenantId, startDate, endDate,
      monthlyRent: input.monthlyRent || '0', monthlyRentEntered,
      deposit: input.deposit || '0', depositEntered,
    } })
    if (propertyChanges.length) {
      await tx.property.update({ where: { id: current.propertyId }, data: {
        line1: input.line1,
        unit: input.unit,
        postalCode: input.postalCode,
        type: input.propertyType,
      } })
      await recordEvent(tx, {
        ...await tenancyPlace(tx, tenancyId), actorId, kind: 'PROPERTY_DETAILS_CHANGED',
        summary: 'changed the property details', changes: propertyChanges,
      })
    }
    const changes = [
      ...fieldChanges(
        {
          landlordName: current.landlord.name, landlordEmail: current.landlord.email,
          tenantName: current.tenant.name, tenantEmail: current.tenant.email,
        },
        input,
        {
          landlordName: 'Landlord name', landlordEmail: 'Landlord email',
          tenantName: 'Tenant name', tenantEmail: 'Tenant email',
        },
      ),
      ...fieldChanges({
        ...current, monthlyRent: recordedAmount(current.monthlyRent, current.monthlyRentEntered),
        deposit: recordedAmount(current.deposit, current.depositEntered),
      }, { startDate, endDate, monthlyRent: monthlyRentEntered ? input.monthlyRent : null, deposit: depositEntered ? input.deposit : null }, {
        startDate: 'Tenancy start', endDate: 'Tenancy end', monthlyRent: 'Monthly rent', deposit: 'Deposit',
      }),
    ]
    if (changes.length) await recordEvent(tx, {
      ...await tenancyPlace(tx, tenancyId), actorId, kind: 'TENANCY_DETAILS_CHANGED',
      summary: 'changed the tenancy details', changes,
    })
  })
}
