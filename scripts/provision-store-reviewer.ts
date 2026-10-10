import 'dotenv/config'
import { db } from '@/lib/db'
import { serviceClient } from '@/lib/storage'

/// Provision one dedicated App Review login and two isolated demo inspections. The
/// password comes only from the operator's environment, never from the repository.
const track = process.env.KIVILO_REVIEWER_TRACK
const email = process.env.KIVILO_REVIEWER_EMAIL?.trim().toLowerCase()
const password = process.env.KIVILO_REVIEWER_PASSWORD
if (process.env.KIVILO_REVIEWER_PROVISION !== '1' ||
    (track !== 'apple' && track !== 'google') ||
    !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !password || password.length < 12) {
  throw new Error('Set KIVILO_REVIEWER_PROVISION=1, KIVILO_REVIEWER_TRACK=apple|google, a dedicated KIVILO_REVIEWER_EMAIL, and a password of at least 12 characters')
}

const key = `kivilo_review_${track}`
const agentId = `${key}_agent`
const landlordId = `${key}_landlord`
const tenantId = `${key}_tenant`
const draftPropertyId = `${key}_draft_property`
const readyPropertyId = `${key}_ready_property`
const draftTenancyId = `${key}_draft_tenancy`
const readyTenancyId = `${key}_ready_tenancy`
const draftInspectionId = `${key}_draft_inspection`
const readyInspectionId = `${key}_ready_inspection`
const draftRoomId = `${key}_draft_room`
const readyRoomId = `${key}_ready_room`
const readyItemId = `${key}_ready_item`
const agentName = `Kivilo ${track === 'apple' ? 'Apple' : 'Google'} App Review`

async function reviewerAuthUser() {
  const admin = serviceClient().auth.admin
  let page = 1
  while (true) {
    const { data, error } = await admin.listUsers({ page, perPage: 200 })
    if (error) throw error
    const found = data.users.find((user) => user.email?.toLowerCase() === email)
    if (found) {
      if (found.app_metadata?.kiviloReviewerTrack !== track) {
        throw new Error('The reviewer email already belongs to a different account')
      }
      const updated = await admin.updateUserById(found.id, { password, email_confirm: true })
      if (updated.error) throw updated.error
      return found.id
    }
    if (data.users.length < 200) break
    page += 1
  }

  const created = await admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { kiviloReviewerTrack: track },
  })
  if (created.error) throw created.error
  if (!created.data.user) throw new Error('Supabase did not return the reviewer user')
  return created.data.user.id
}

async function main() {
  const authUserId = await reviewerAuthUser()

  await db.$transaction(async (tx) => {
    const emailOwner = await tx.stakeholder.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { id: true },
    })
    if (emailOwner && emailOwner.id !== agentId) {
      throw new Error('The reviewer email is already attached to another stakeholder')
    }

    await tx.stakeholder.createMany({
      data: [
        { id: agentId, name: agentName, email, authUserId },
        { id: landlordId, name: 'Demo Landlord (App Review)' },
        { id: tenantId, name: 'Demo Tenant (App Review)' },
      ],
      skipDuplicates: true,
    })
    const agent = await tx.stakeholder.findUniqueOrThrow({ where: { id: agentId } })
    const landlord = await tx.stakeholder.findUniqueOrThrow({ where: { id: landlordId } })
    const tenant = await tx.stakeholder.findUniqueOrThrow({ where: { id: tenantId } })
    if (agent.authUserId !== authUserId || agent.email?.toLowerCase() !== email ||
        agent.name !== agentName || landlord.name !== 'Demo Landlord (App Review)' ||
        tenant.name !== 'Demo Tenant (App Review)') {
      throw new Error('A reviewer fixture ID already belongs to different data')
    }

    await tx.property.createMany({
      data: [
        { id: draftPropertyId, line1: 'DEMO ONLY — 10 Review Lane', postalCode: '000000', type: 'PRIVATE_NON_LANDED' },
        { id: readyPropertyId, line1: 'DEMO ONLY — 20 Review Lane', postalCode: '000000', type: 'PRIVATE_NON_LANDED' },
      ],
      skipDuplicates: true,
    })
    const properties = await tx.property.findMany({
      where: { id: { in: [draftPropertyId, readyPropertyId] } },
    })
    if (properties.length !== 2 || properties.some((property) => !property.line1.startsWith('DEMO ONLY — '))) {
      throw new Error('A reviewer property ID already belongs to different data')
    }

    const tenancyBase = {
      landlordId,
      tenantId,
      agentId,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2027-01-01'),
      monthlyRent: '2500.00',
      deposit: '5000.00',
    }
    await tx.tenancy.createMany({
      data: [
        { ...tenancyBase, id: draftTenancyId, propertyId: draftPropertyId },
        { ...tenancyBase, id: readyTenancyId, propertyId: readyPropertyId },
      ],
      skipDuplicates: true,
    })
    const tenancies = await tx.tenancy.findMany({
      where: { id: { in: [draftTenancyId, readyTenancyId] } },
    })
    if (tenancies.length !== 2 || tenancies.some((tenancy) =>
      tenancy.agentId !== agentId || tenancy.landlordId !== landlordId ||
      tenancy.tenantId !== tenantId ||
      (tenancy.id === draftTenancyId ? tenancy.propertyId !== draftPropertyId : tenancy.propertyId !== readyPropertyId))) {
      throw new Error('A reviewer tenancy ID already belongs to different data')
    }

    await tx.inspection.createMany({
      data: [
        { id: draftInspectionId, tenancyId: draftTenancyId, kind: 'CHECK_IN', status: 'DRAFT', conductedById: agentId },
        { id: readyInspectionId, tenancyId: readyTenancyId, kind: 'CHECK_IN', status: 'AWAITING_SIGNATURE', conductedById: agentId, conductedAt: new Date('2026-01-01') },
      ],
      skipDuplicates: true,
    })
    const inspections = await tx.inspection.findMany({
      where: { id: { in: [draftInspectionId, readyInspectionId] } },
    })
    if (inspections.length !== 2 || inspections.some((inspection) =>
      inspection.kind !== 'CHECK_IN' || inspection.conductedById !== agentId ||
      (inspection.id === draftInspectionId ? inspection.tenancyId !== draftTenancyId : inspection.tenancyId !== readyTenancyId))) {
      throw new Error('A reviewer inspection ID already belongs to different data')
    }

    await tx.room.createMany({
      data: [
        { id: draftRoomId, inspectionId: draftInspectionId, name: 'Kitchen', order: 0, status: 'PENDING' },
        { id: readyRoomId, inspectionId: readyInspectionId, name: 'Kitchen', order: 0, status: 'REVIEWED' },
      ],
      skipDuplicates: true,
    })
    const rooms = await tx.room.findMany({ where: { id: { in: [draftRoomId, readyRoomId] } } })
    if (rooms.length !== 2 || rooms.some((room) =>
      room.name !== 'Kitchen' ||
      (room.id === draftRoomId ? room.inspectionId !== draftInspectionId : room.inspectionId !== readyInspectionId))) {
      throw new Error('A reviewer room ID already belongs to different data')
    }

    await tx.inspectionItem.createMany({
      data: [{
        id: readyItemId,
        roomId: readyRoomId,
        name: 'Demo refrigerator',
        category: 'APPLIANCE',
        condition: 'GOOD',
        editedByHuman: true,
        notes: 'Synthetic inventory for App Review. No real property or tenant.',
      }],
      skipDuplicates: true,
    })
    const item = await tx.inspectionItem.findUniqueOrThrow({ where: { id: readyItemId } })
    if (item.roomId !== readyRoomId || item.name !== 'Demo refrigerator') {
      throw new Error('A reviewer item ID already belongs to different data')
    }
  })

  console.log(`Provisioned ${track} App Review account and isolated demo inspections. No credentials were printed.`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => db.$disconnect())
