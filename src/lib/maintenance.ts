import { z } from 'zod'
import { db } from '@/lib/db'
import { agentTenancies, authorizeTenancy, tenancyScope, notificationScope, type TenancyRole } from '@/lib/auth'
import { captureExists, createDownloadUrl, createUploadUrl } from '@/lib/storage'
import { activeNotificationRecipients } from '@/lib/notification-recipients'
import { Prisma } from '@/generated/prisma'
import { moveInDefectIntent, moveInDefectOptions } from '@/lib/move-in-defects'
import { moveInDefectWindow, singaporeCalendarDate } from '@/lib/move-in-defect-window'
import { tenancyAccess } from '@/lib/tenancy-access'
import { lockAgencyTenancy } from '@/lib/agency'

const category = z.enum([
  'APPLIANCE', 'PLUMBING', 'LOCKSMITH', 'ELECTRICAL',
  'AIR_CONDITIONING', 'STRUCTURAL', 'PEST', 'OTHER',
])
const priority = z.enum(['ROUTINE', 'URGENT', 'SAFETY_EMERGENCY'])
const status = z.enum([
  'REPORTED', 'ACKNOWLEDGED', 'SCHEDULED',
  'AWAITING_CONFIRMATION', 'RESOLVED', 'CLOSED_NO_ACTION',
])
const evidencePurpose = z.enum(['BEFORE', 'AFTER', 'RECEIPT'])
const verificationOutcome = z.enum(['FIXED', 'NOT_FIXED'])
const clientId = z.string().uuid()
const money = z.string().regex(/^\d+(?:\.\d{1,2})?$/)
const party = z.enum(['LANDLORD', 'TENANT'])
const payer = z.enum(['LANDLORD', 'TENANT', 'SHARED'])
const basis = z.enum([
  'MINOR_REPAIR_CLAUSE', 'TENANT_CAUSED', 'FAIR_WEAR', 'LANDLORD_OBLIGATION', 'OTHER',
])

export const createCaseInput = z.object({
  clientId: clientId.optional(),
  propertyAssetId: z.string().min(1).nullable().default(null),
  category,
  priority: priority.default('ROUTINE'),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(4000),
  wasPresentAtMoveIn: z.boolean().default(false),
})

export const updateCaseInput = z.object({
  status,
  resolutionReason: z.string().trim().min(1).max(1000).nullable().optional(),
})

export const commentInput = z.object({ body: z.string().trim().min(1).max(4000) })

export const visitInput = z.object({
  providerId: z.string().min(1).nullable().default(null),
  scheduledAt: z.iso.datetime().nullable().default(null),
  completedAt: z.iso.datetime().nullable().default(null),
  notes: z.string().trim().max(4000).nullable().default(null),
  cost: money.nullable().default(null),
})

export const evidenceUploadInput = z.object({
  clientId,
  purpose: evidencePurpose,
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'application/pdf']),
  visitId: z.string().min(1).nullable().default(null),
})

export const evidenceInput = evidenceUploadInput.extend({
  storagePath: z.string().min(1),
  sizeBytes: z.number().int().positive().max(250_000_000),
  note: z.string().trim().max(1000).nullable().default(null),
})

export const verificationInput = z.object({
  outcome: verificationOutcome,
  note: z.string().trim().max(2000).nullable().default(null),
})

export const proposalInput = z.object({
  arrangedBy: party,
  payer,
  tenantCap: money.nullable().default(null),
  basis,
  reason: z.string().trim().min(1).max(1000),
  clauseRef: z.string().trim().min(1).max(120).nullable().default(null),
}).refine((input) => (input.payer === 'SHARED') === (input.tenantCap !== null), {
  message: 'A shared split needs the amount the tenant pays, and only a shared split has one',
  path: ['tenantCap'],
})

export const proposalAnswerInput = z.discriminatedUnion('decision', [
  z.object({ decision: z.literal('ACCEPT'), note: z.string().trim().max(1000).nullable().default(null) }),
  z.object({ decision: z.literal('REJECT'), note: z.string().trim().min(1).max(1000) }),
  z.object({ decision: z.literal('WITHDRAW') }),
])

export const tenancyTermsInput = z.object({
  minorRepairCap: money.nullable().optional(),
  agentMayAgreeCosts: z.boolean().optional(),
  defectWindowDays: z.number().int().min(0).max(365).optional(),
})

const allowedTransitions: Record<string, readonly string[]> = {
  REPORTED: ['ACKNOWLEDGED', 'CLOSED_NO_ACTION'],
  ACKNOWLEDGED: ['SCHEDULED', 'CLOSED_NO_ACTION'],
  // A completed visit, not a manager status edit, requests tenant confirmation.
  SCHEDULED: ['CLOSED_NO_ACTION'],
  // RESOLVED and the return to ACKNOWLEDGED are driven only by tenant verification,
  // not by a manager PATCH that could bypass the fixed/not-fixed evidence step.
  AWAITING_CONFIRMATION: ['CLOSED_NO_ACTION'],
  RESOLVED: [],
  CLOSED_NO_ACTION: [],
}

export function assertMaintenanceTransition(
  from: string,
  to: string,
  resolutionReason?: string | null,
) {
  if (!allowedTransitions[from]?.includes(to)) {
    throw new Error('Invalid maintenance status transition')
  }
  if (to === 'CLOSED_NO_ACTION' && !resolutionReason?.trim()) {
    throw new Error('Closing without action requires a reason')
  }
}

export function repeatRepairThresholdReached(completedVisits: number) {
  return completedVisits >= 4
}

function canManage(role: TenancyRole) {
  return role === 'LANDLORD' || role === 'AGENT'
}

type Side = z.infer<typeof party>

/// The agent acts for the landlord, so the two are one side of every cost question.
function sideOf(role: TenancyRole): Side {
  return role === 'TENANT' ? 'TENANT' : 'LANDLORD'
}

function proposalSide(proposedById: string, tenancy: { tenantId: string }): Side {
  return proposedById === tenancy.tenantId ? 'TENANT' : 'LANDLORD'
}

/// Accepting or rejecting binds a side. The landlord can switch the agent's authority off.
function mayAnswerFor(role: TenancyRole, tenancy: { agentMayAgreeCosts: boolean }) {
  return role !== 'AGENT' || tenancy.agentMayAgreeCosts
}

/// Until both sides agree otherwise, the landlord arranges the repair, as before this
/// feature existed. The side that arranged it is never the side that confirms it.
function repairRoles(
  role: TenancyRole,
  proposals: { status: string; arrangedBy: Side }[],
) {
  const arrangedBy = proposals.find((proposal) => proposal.status === 'ACCEPTED')?.arrangedBy ?? 'LANDLORD'
  const arranges = sideOf(role) === arrangedBy
  return { arrangedBy, canLogVisit: arranges, canVerify: !arranges }
}

const partyName = { LANDLORD: 'Landlord', TENANT: 'Tenant' } as const

/// The one sentence both sides read, in the app and in the notification. Third person,
/// because the same words go to the proposer and the person answering.
export function describeProposal(proposal: {
  arrangedBy: Side
  payer: z.infer<typeof payer>
  tenantCap: { toString(): string } | null
}) {
  const pays = proposal.payer === 'SHARED'
    ? `Tenant pays the first S$${proposal.tenantCap}, landlord pays the rest.`
    : `${partyName[proposal.payer]} pays.`
  return `${pays} ${partyName[proposal.arrangedBy]} arranges the repair.`
}

/// Where the cost question on a case stands, for check-out review. A case closed
/// without action has no cost to settle. Anything else is settled only by an
/// accepted proposal; otherwise the latest proposal says how far it got.
export function costStanding(
  status: string,
  proposals: { status: string }[],
): 'AGREED' | 'PENDING' | 'DISPUTED' | 'NOT_PROPOSED' | null {
  if (status === 'CLOSED_NO_ACTION') return null
  if (proposals.some((proposal) => proposal.status === 'ACCEPTED')) return 'AGREED'
  const latest = proposals.at(-1)?.status
  if (latest === 'PENDING') return 'PENDING'
  if (latest === 'REJECTED') return 'DISPUTED'
  return 'NOT_PROPOSED'
}

/// Kivilo records the split; it never moves the money.
export function costShares(
  proposal: { payer: z.infer<typeof payer>; tenantCap: { toString(): string } | null },
  total: Prisma.Decimal,
) {
  const tenant = proposal.payer === 'LANDLORD'
    ? new Prisma.Decimal(0)
    : proposal.payer === 'TENANT'
      ? total
      : Prisma.Decimal.min(total, new Prisma.Decimal(proposal.tenantCap!.toString()))
  return { total: total.toFixed(2), tenant: tenant.toFixed(2), landlord: total.minus(tenant).toFixed(2) }
}

function caseInclude() {
  return {
    propertyAsset: true,
    reportedBy: { select: { id: true, name: true } },
    tenancy: {
      include: {
        property: true,
        landlord: { select: { name: true } },
        collaborators: { select: { stakeholderId: true } },
      },
    },
    events: {
      orderBy: { createdAt: 'asc' as const },
      include: { actor: { select: { id: true, name: true } } },
    },
    visits: {
      orderBy: { createdAt: 'asc' as const },
      include: { provider: true, verification: true },
    },
    evidence: { orderBy: { createdAt: 'asc' as const } },
    moveInDefectAddendum: true,
    responsibilityProposals: {
      orderBy: { createdAt: 'asc' as const },
      include: {
        proposedBy: { select: { id: true, name: true } },
        respondedBy: { select: { id: true, name: true } },
      },
    },
  }
}

export async function authorizeMaintenanceCase(caseId: string, stakeholderId: string) {
  const maintenanceCase = await db.maintenanceCase.findFirst({
    where: { id: caseId, tenancy: tenancyScope(stakeholderId) },
    include: caseInclude(),
  })
  if (!maintenanceCase) throw new Error('Maintenance case not found')
  const role: TenancyRole = maintenanceCase.tenancy.landlordId === stakeholderId
    ? 'LANDLORD'
    : maintenanceCase.tenancy.tenantId === stakeholderId
      ? 'TENANT'
      : 'AGENT'
  return { maintenanceCase, role }
}

function notificationRows(
  tenancy: { id: string; landlordId: string; tenantId: string; agentId: string | null; endDate: Date; collaborators: { stakeholderId: string }[] },
  excludeId: string,
  input: { kind: 'MAINTENANCE_REPORTED' | 'MAINTENANCE_STATUS' | 'MAINTENANCE_VISIT' | 'MAINTENANCE_VERIFICATION' | 'MAINTENANCE_RESPONSIBILITY' | 'REPEAT_REPAIR'; title: string; body: string; href: string; dedupeKey?: string },
) {
  const ids = [tenancy.landlordId, tenancy.tenantId]
  if (tenancy.endDate >= new Date()) {
    if (tenancy.agentId) ids.push(tenancy.agentId)
    ids.push(...tenancy.collaborators.map((person) => person.stakeholderId))
  }
  return [...new Set(ids)].filter((id) => id !== excludeId).map((recipientId) => ({
    ...input,
    recipientId,
    tenancyId: tenancy.id,
    dedupeKey: input.dedupeKey ? `${input.dedupeKey}:${recipientId}` : null,
  }))
}

async function createNotificationRows(
  client: Pick<Prisma.TransactionClient, 'accountDeletionRequest' | 'notification'>,
  rows: ReturnType<typeof notificationRows>,
) {
  const recipients = new Set(await activeNotificationRecipients(
    client,
    rows.map((row) => row.recipientId),
  ))
  const active = rows.filter((row) => recipients.has(row.recipientId))
  if (active.length) await client.notification.createMany({ data: active, skipDuplicates: true })
}

export async function listTenancies(stakeholderId: string, filters: { agencyId?: string; personal?: boolean } = {}) {
  const scope: Prisma.TenancyWhereInput[] = [tenancyScope(stakeholderId)]
  if (filters.agencyId) scope.push({
    agencyId: filters.agencyId,
    agency: { members: { some: { stakeholderId, status: 'ACTIVE' } } },
  })
  if (filters.personal) scope.push({ agencyId: null })
  const tenancies = await db.tenancy.findMany({
    where: { AND: scope },
    orderBy: { startDate: 'desc' },
    include: {
      property: true,
      landlord: { select: { id: true, name: true } },
      tenant: { select: { id: true, name: true } },
      agent: { select: { id: true, name: true } },
      _count: { select: { maintenanceCases: true, inspections: true } },
      // The newest report sent for signature, which `authorizeReport` lets every party read.
      inspections: {
        where: { status: { in: ['AWAITING_SIGNATURE', 'COMPLETED'] } },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          id: true,
          kind: true,
          status: true,
          signatures: { where: { stakeholderId }, select: { id: true } },
        },
      },
    },
  })
  return tenancies.map((tenancy) => ({
    id: tenancy.id,
    role: tenancy.landlordId === stakeholderId ? 'LANDLORD' : tenancy.tenantId === stakeholderId ? 'TENANT' : 'AGENT',
    propertyId: tenancy.propertyId,
    property: [tenancy.property.line1, tenancy.property.unit].filter(Boolean).join(' '),
    postalCode: tenancy.property.postalCode,
    landlord: tenancy.landlord.name,
    tenant: tenancy.tenant.name,
    agent: tenancy.agent?.name ?? null,
    startDate: tenancy.startDate.toISOString(),
    endDate: tenancy.endDate.toISOString(),
    maintenanceCases: tenancy._count.maintenanceCases,
    inspections: tenancy._count.inspections,
    latestReport: tenancy.inspections[0]
      ? {
        id: tenancy.inspections[0].id,
        kind: tenancy.inspections[0].kind,
        status: tenancy.inspections[0].status,
        // Only a landlord or tenant signs; an agent collects signatures, never gives one.
        awaitingMySignature: tenancy.inspections[0].status === 'AWAITING_SIGNATURE' &&
          (tenancy.landlordId === stakeholderId || tenancy.tenantId === stakeholderId) &&
          tenancy.inspections[0].signatures.length === 0,
      }
      : null,
  }))
}

export async function tenancyDetail(tenancyId: string, stakeholderId: string) {
  const { tenancy, role } = await authorizeTenancy(tenancyId, stakeholderId)
  const moveInDefects = await moveInDefectOptions(tenancy, role)
  return {
    id: tenancy.id,
    role,
    propertyId: tenancy.propertyId,
    property: [tenancy.property.line1, tenancy.property.unit].filter(Boolean).join(' '),
    postalCode: tenancy.property.postalCode,
    landlord: tenancy.landlord.name,
    tenant: tenancy.tenant.name,
    agent: tenancy.agent?.name ?? null,
    startDate: tenancy.startDate.toISOString(),
    endDate: tenancy.endDate.toISOString(),
    minorRepairCap: tenancy.minorRepairCap?.toString() ?? null,
    agentMayAgreeCosts: tenancy.agentMayAgreeCosts,
    moveInDefects,
    access: role === 'AGENT' ? await tenancyAccess(tenancyId, stakeholderId) : null,
    capabilities: {
      report: true,
      manage: canManage(role),
      verify: role === 'TENANT',
      editMinorRepairCap: canManage(role),
      editAgentAuthority: role === 'LANDLORD',
    },
  }
}

export async function listMaintenanceCases(tenancyId: string, stakeholderId: string) {
  await authorizeTenancy(tenancyId, stakeholderId)
  const cases = await db.maintenanceCase.findMany({
    where: { tenancyId },
    orderBy: { createdAt: 'desc' },
    include: { propertyAsset: true, visits: { select: { completedAt: true } } },
  })
  return cases.map((item) => ({
    id: item.id,
    tenancyId: item.tenancyId,
    asset: item.propertyAsset?.name ?? null,
    category: item.category,
    priority: item.priority,
    title: item.title,
    description: item.description,
    status: item.status,
    resolutionReason: item.resolutionReason,
    repairAttempts: item.visits.filter((visit) => visit.completedAt !== null).length,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  }))
}

export async function maintenanceCaseDetail(caseId: string, stakeholderId: string) {
  const { maintenanceCase, role } = await authorizeMaintenanceCase(caseId, stakeholderId)
  const evidence = await Promise.all(maintenanceCase.evidence.map(async (item) => ({
    id: item.id,
    visitId: item.visitId,
    purpose: item.purpose,
    mimeType: item.mimeType,
    sizeBytes: item.sizeBytes,
    note: item.note,
    createdAt: item.createdAt.toISOString(),
    url: await createDownloadUrl(item.storagePath),
  })))
  const { tenancy } = maintenanceCase
  const proposals = maintenanceCase.responsibilityProposals.map((proposal) => ({
    id: proposal.id,
    side: proposalSide(proposal.proposedById, tenancy),
    proposedBy: proposal.proposedBy,
    arrangedBy: proposal.arrangedBy,
    payer: proposal.payer,
    tenantCap: proposal.tenantCap?.toString() ?? null,
    basis: proposal.basis,
    reason: proposal.reason,
    clauseRef: proposal.clauseRef,
    summary: describeProposal(proposal),
    status: proposal.status,
    respondedBy: proposal.respondedBy,
    respondedAt: proposal.respondedAt?.toISOString() ?? null,
    responseNote: proposal.responseNote,
    createdAt: proposal.createdAt.toISOString(),
  }))
  const pending = proposals.find((proposal) => proposal.status === 'PENDING') ?? null
  const agreement = proposals.find((proposal) => proposal.status === 'ACCEPTED') ?? null
  const totalCost = maintenanceCase.visits.reduce(
    (sum, visit) => (visit.cost ? sum.plus(visit.cost) : sum),
    new Prisma.Decimal(0),
  )
  const repair = repairRoles(role, maintenanceCase.responsibilityProposals)
  const moveInOptions = await moveInDefectOptions(tenancy, role, maintenanceCase.moveInDefectInspectionId)
  const notice = maintenanceCase.moveInDefectAddendum
  const window = moveInDefectWindow(tenancy, maintenanceCase.createdAt)
  return {
    id: maintenanceCase.id,
    tenancyId: maintenanceCase.tenancyId,
    role,
    canManage: canManage(role),
    canLogVisit: repair.canLogVisit,
    canVerify: repair.canVerify,
    moveInDefect: {
      wasPresentAtMoveIn: maintenanceCase.wasPresentAtMoveIn,
      canSubmit: role === 'TENANT' && maintenanceCase.reportedById === stakeholderId &&
        maintenanceCase.wasPresentAtMoveIn && window.open && Boolean(moveInOptions.checkInId) && !notice && !moveInOptions.checkOutSigned,
      addendumId: notice?.id ?? null,
      inspectionId: maintenanceCase.moveInDefectInspectionId,
      status: notice ? notice.disputedAt ? 'DISPUTED' : notice.acknowledgedAt ? 'ACKNOWLEDGED' : 'PENDING' : null,
      canRespond: role === 'LANDLORD' && Boolean(notice) && !notice?.disputedAt && !notice?.acknowledgedAt && !moveInOptions.checkOutSigned,
      reportedAt: maintenanceCase.wasPresentAtMoveIn ? maintenanceCase.createdAt.toISOString() : null,
      deadline: window.deadline ? singaporeCalendarDate(window.deadline) : null,
      dispute: notice?.disputedAt ? {
        disputedAt: notice.disputedAt.toISOString(), disputedById: notice.disputedById!,
        disputedBy: tenancy.landlord.name, reason: notice.disputeReason!,
      } : null,
      targets: moveInOptions.targets,
    },
    responsibility: {
      arrangedBy: repair.arrangedBy,
      minorRepairCap: tenancy.minorRepairCap?.toString() ?? null,
      agreement,
      pending,
      history: proposals,
      shares: agreement ? costShares(agreement, totalCost) : null,
      canPropose: maintenanceCase.status !== 'CLOSED_NO_ACTION',
      canAnswer: Boolean(pending && pending.side !== sideOf(role) && mayAnswerFor(role, tenancy)),
      canWithdraw: Boolean(pending && pending.side === sideOf(role)),
    },
    property: [maintenanceCase.tenancy.property.line1, maintenanceCase.tenancy.property.unit].filter(Boolean).join(' '),
    propertyAsset: maintenanceCase.propertyAsset,
    category: maintenanceCase.category,
    priority: maintenanceCase.priority,
    title: maintenanceCase.title,
    description: maintenanceCase.description,
    status: maintenanceCase.status,
    resolutionReason: maintenanceCase.resolutionReason,
    reportedBy: maintenanceCase.reportedBy,
    createdAt: maintenanceCase.createdAt.toISOString(),
    events: maintenanceCase.events.map((event) => ({
      id: event.id, kind: event.kind, body: event.body, metadata: event.metadata,
      actor: event.actor, createdAt: event.createdAt.toISOString(),
    })),
    visits: maintenanceCase.visits.map((visit) => ({
      id: visit.id,
      provider: visit.provider,
      scheduledAt: visit.scheduledAt?.toISOString() ?? null,
      completedAt: visit.completedAt?.toISOString() ?? null,
      notes: visit.notes,
      cost: visit.cost?.toString() ?? null,
      verification: visit.verification && {
        outcome: visit.verification.outcome,
        note: visit.verification.note,
        createdAt: visit.verification.createdAt.toISOString(),
      },
    })),
    evidence,
  }
}

export async function createMaintenanceCase(tenancyId: string, stakeholderId: string, raw: unknown) {
  const input = createCaseInput.parse(raw)
  const { tenancy } = await authorizeTenancy(tenancyId, stakeholderId)
  if (input.clientId) {
    const existing = await db.maintenanceCase.findUnique({ where: { clientId: input.clientId } })
    if (existing) {
      if (existing.tenancyId !== tenancyId || existing.reportedById !== stakeholderId) {
        throw new Error('Maintenance case not found')
      }
      return { id: existing.id }
    }
  }
  if (input.propertyAssetId) {
    const asset = await db.propertyAsset.findFirst({
      where: { id: input.propertyAssetId, propertyId: tenancy.propertyId, active: true },
      select: { id: true },
    })
    if (!asset) throw new Error('Property asset not found')
  }
  const created = await db.$transaction(async (tx) => {
    await lockAgencyTenancy(tenancyId, tx)
    if (!await tx.tenancy.findFirst({ where: { id: tenancyId, AND: [tenancyScope(stakeholderId)] }, select: { id: true } })) throw new Error('Tenancy not found')
    const moveInDefectInspectionId = input.wasPresentAtMoveIn
      ? await moveInDefectIntent(tx, tenancy, stakeholderId)
      : null
    const item = await tx.maintenanceCase.create({
      data: {
        ...input, tenancyId, reportedById: stakeholderId, moveInDefectInspectionId,
        createdAt: input.wasPresentAtMoveIn ? new Date() : undefined,
      },
    })
    await tx.maintenanceEvent.create({
      data: { caseId: item.id, actorId: stakeholderId, kind: 'REPORTED', body: input.description },
    })
    const rows = notificationRows(tenancy, stakeholderId, {
      kind: 'MAINTENANCE_REPORTED', title: input.title,
      body: `${tenancy.property.line1}: a maintenance issue was reported.`,
      href: `/maintenance/${item.id}`,
    })
    await createNotificationRows(tx, rows)
    return item
  })
  return { id: created.id }
}

export async function updateMaintenanceCase(caseId: string, stakeholderId: string, raw: unknown) {
  const input = updateCaseInput.parse(raw)
  const { maintenanceCase, role } = await authorizeMaintenanceCase(caseId, stakeholderId)
  if (!canManage(role)) throw new Error('Maintenance case not found')
  assertMaintenanceTransition(maintenanceCase.status, input.status, input.resolutionReason)
  const now = new Date()
  await db.$transaction(async (tx) => {
    const advanced = await tx.maintenanceCase.updateMany({
      where: { id: caseId, status: maintenanceCase.status },
      data: {
        status: input.status,
        resolutionReason: input.status === 'CLOSED_NO_ACTION' ? input.resolutionReason : null,
        acknowledgedAt: input.status === 'ACKNOWLEDGED' && !maintenanceCase.acknowledgedAt ? now : undefined,
        resolvedAt: ['RESOLVED', 'CLOSED_NO_ACTION'].includes(input.status) ? now : null,
      },
    })
    if (advanced.count !== 1) throw new Error('Invalid maintenance status transition')
    await tx.maintenanceEvent.create({
      data: {
        caseId, actorId: stakeholderId, kind: 'STATUS_CHANGED',
        body: input.resolutionReason ?? null,
        metadata: { from: maintenanceCase.status, to: input.status },
      },
    })
    const rows = notificationRows(maintenanceCase.tenancy, stakeholderId, {
      kind: 'MAINTENANCE_STATUS', title: maintenanceCase.title,
      body: `Maintenance status changed to ${input.status.toLowerCase().replaceAll('_', ' ')}.`,
      href: `/maintenance/${caseId}`,
    })
    await createNotificationRows(tx, rows)
  })
}

export async function addMaintenanceComment(caseId: string, stakeholderId: string, raw: unknown) {
  const input = commentInput.parse(raw)
  await authorizeMaintenanceCase(caseId, stakeholderId)
  return db.maintenanceEvent.create({
    data: { caseId, actorId: stakeholderId, kind: 'COMMENT', body: input.body },
    select: { id: true, createdAt: true },
  })
}

export async function addMaintenanceVisit(caseId: string, stakeholderId: string, raw: unknown) {
  const input = visitInput.parse(raw)
  const { maintenanceCase, role } = await authorizeMaintenanceCase(caseId, stakeholderId)
  if (!repairRoles(role, maintenanceCase.responsibilityProposals).canLogVisit) {
    throw new Error('Maintenance case not found')
  }
  if (!['ACKNOWLEDGED', 'SCHEDULED'].includes(maintenanceCase.status)) {
    throw new Error('Invalid maintenance status transition')
  }
  if (input.providerId) {
    const provider = await db.serviceProvider.findFirst({ where: { id: input.providerId, active: true } })
    if (!provider) throw new Error('Service provider not found')
  }
  const nextStatus = input.completedAt ? 'AWAITING_CONFIRMATION' : 'SCHEDULED'
  const visit = await db.$transaction(async (tx) => {
    const advanced = await tx.maintenanceCase.updateMany({
      where: { id: caseId, status: maintenanceCase.status },
      data: { status: nextStatus },
    })
    if (advanced.count !== 1) throw new Error('Invalid maintenance status transition')
    const created = await tx.maintenanceVisit.create({
      data: {
        caseId, providerId: input.providerId,
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
        completedAt: input.completedAt ? new Date(input.completedAt) : null,
        notes: input.notes, cost: input.cost,
      },
    })
    await tx.maintenanceEvent.create({
      data: { caseId, actorId: stakeholderId, kind: 'VISIT_RECORDED', metadata: { visitId: created.id, completed: Boolean(input.completedAt) } },
    })
    const rows = notificationRows(maintenanceCase.tenancy, stakeholderId, {
      kind: input.completedAt ? 'MAINTENANCE_VERIFICATION' : 'MAINTENANCE_VISIT',
      title: maintenanceCase.title,
      body: input.completedAt ? 'Was the repair successful? Please confirm.' : 'A repair visit was scheduled.',
      href: `/maintenance/${caseId}`,
    })
    await createNotificationRows(tx, rows)
    return created
  })
  if (input.completedAt && maintenanceCase.propertyAssetId) {
    await createRepeatRepairAlerts(maintenanceCase.propertyAssetId, maintenanceCase.tenancyId, caseId)
  }
  return { id: visit.id }
}

async function createRepeatRepairAlerts(assetId: string, tenancyId: string, caseId: string) {
  const since = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
  const count = await db.maintenanceVisit.count({
    where: { completedAt: { gte: since }, maintenanceCase: { propertyAssetId: assetId } },
  })
  if (!repeatRepairThresholdReached(count)) return
  const tenancy = await db.tenancy.findUniqueOrThrow({
    where: { id: tenancyId },
    include: { collaborators: { select: { stakeholderId: true } } },
  })
  const recipients = [tenancy.landlordId]
  if (tenancy.endDate >= new Date()) {
    if (tenancy.agentId) recipients.push(tenancy.agentId)
    recipients.push(...tenancy.collaborators.map((person) => person.stakeholderId))
  }
  await createNotificationRows(db, [...new Set(recipients)].map((recipientId) => ({
    recipientId,
    tenancyId,
    kind: 'REPEAT_REPAIR' as const,
    title: 'Repeated repair history',
    body: `This asset has had ${count} completed repair visits in the last 365 days.`,
    href: `/maintenance/${caseId}`,
    dedupeKey: `repeat-repair:${assetId}:${recipientId}`,
  })))
}

export async function verifyMaintenanceVisit(caseId: string, visitId: string, stakeholderId: string, raw: unknown) {
  const input = verificationInput.parse(raw)
  const { maintenanceCase, role } = await authorizeMaintenanceCase(caseId, stakeholderId)
  if (!repairRoles(role, maintenanceCase.responsibilityProposals).canVerify) {
    throw new Error('Maintenance case not found')
  }
  const visit = maintenanceCase.visits.find((candidate) => candidate.id === visitId)
  if (!visit) throw new Error('Maintenance visit not found')
  if (!visit.completedAt) throw new Error('Only a completed visit can be verified')
  if (visit.verification) {
    if (visit.verification.outcome !== input.outcome || visit.verification.note !== input.note) {
      throw new Error('Maintenance visit already verified')
    }
    return { id: visit.verification.id }
  }
  if (maintenanceCase.status !== 'AWAITING_CONFIRMATION') {
    throw new Error('Invalid maintenance status transition')
  }
  const nextStatus = input.outcome === 'FIXED' ? 'RESOLVED' : 'ACKNOWLEDGED'
  return db.$transaction(async (tx) => {
    const advanced = await tx.maintenanceCase.updateMany({
      where: { id: caseId, status: 'AWAITING_CONFIRMATION' },
      data: { status: nextStatus, resolvedAt: input.outcome === 'FIXED' ? new Date() : null },
    })
    if (advanced.count !== 1) throw new Error('Invalid maintenance status transition')
    const verification = await tx.maintenanceVerification.create({
      data: { visitId, verifiedById: stakeholderId, outcome: input.outcome, note: input.note },
    })
    await tx.maintenanceEvent.create({
      data: {
        caseId, actorId: stakeholderId,
        kind: input.outcome === 'FIXED' ? 'VERIFICATION' : 'REOPENED',
        body: input.note, metadata: { visitId, outcome: input.outcome },
      },
    })
    const rows = notificationRows(maintenanceCase.tenancy, stakeholderId, {
      kind: 'MAINTENANCE_VERIFICATION', title: maintenanceCase.title,
      body: input.outcome === 'FIXED'
        ? `The ${sideOf(role).toLowerCase()} confirmed the repair is fixed.`
        : `The ${sideOf(role).toLowerCase()} reported that the issue is not fixed.`,
      href: `/maintenance/${caseId}`,
    })
    await createNotificationRows(tx, rows)
    return { id: verification.id }
  })
}

/// One side proposes who arranges a repair and who pays; the other answers. Proposing
/// while your own side's proposal is open replaces it. Proposing while the other side's
/// is open is a counter-offer, which rejects theirs and so needs the authority to answer.
export async function proposeResponsibility(caseId: string, stakeholderId: string, raw: unknown) {
  const input = proposalInput.parse(raw)
  const { maintenanceCase, role } = await authorizeMaintenanceCase(caseId, stakeholderId)
  if (maintenanceCase.status === 'CLOSED_NO_ACTION') {
    throw new Error('Invalid maintenance status transition')
  }
  const { tenancy } = maintenanceCase
  const pending = maintenanceCase.responsibilityProposals.find((proposal) => proposal.status === 'PENDING')
  const counters = pending && proposalSide(pending.proposedById, tenancy) !== sideOf(role)
  if (counters && !mayAnswerFor(role, tenancy)) throw new Error('Maintenance case not found')
  return db.$transaction(async (tx) => {
    if (pending) {
      const closed = await tx.responsibilityProposal.updateMany({
        where: { id: pending.id, status: 'PENDING' },
        data: counters
          ? { status: 'REJECTED', respondedById: stakeholderId, respondedAt: new Date() }
          : { status: 'SUPERSEDED' },
      })
      if (closed.count !== 1) throw new Error('Maintenance responsibility conflict')
    }
    const proposal = await tx.responsibilityProposal.create({
      data: { ...input, caseId, proposedById: stakeholderId },
    }).catch((error: unknown) => {
      // The partial unique index: someone else opened a proposal since we read the case.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new Error('Maintenance responsibility conflict')
      }
      throw error
    })
    const summary = describeProposal(input)
    await tx.maintenanceEvent.create({
      data: {
        caseId, actorId: stakeholderId, kind: 'RESPONSIBILITY_PROPOSED', body: input.reason,
        metadata: { proposalId: proposal.id, summary, replaces: pending?.id ?? null, counter: Boolean(counters) },
      },
    })
    await createNotificationRows(tx, notificationRows(tenancy, stakeholderId, {
      kind: 'MAINTENANCE_RESPONSIBILITY', title: maintenanceCase.title,
      body: `${partyName[sideOf(role)]} proposes: ${summary}`,
      href: `/maintenance/${caseId}`,
    }))
    return { id: proposal.id }
  })
}

/// Accept or reject is for the other side; withdraw is for the side that proposed.
/// Accepting replaces any earlier agreement, and a case nobody had acknowledged is
/// acknowledged by both sides agreeing on it.
export async function answerResponsibility(
  caseId: string,
  proposalId: string,
  stakeholderId: string,
  raw: unknown,
) {
  const input = proposalAnswerInput.parse(raw)
  const { maintenanceCase, role } = await authorizeMaintenanceCase(caseId, stakeholderId)
  const { tenancy } = maintenanceCase
  const proposal = maintenanceCase.responsibilityProposals.find((candidate) => candidate.id === proposalId)
  if (!proposal) throw new Error('Responsibility proposal not found')
  const ownSide = proposalSide(proposal.proposedById, tenancy) === sideOf(role)
  const permitted = input.decision === 'WITHDRAW' ? ownSide : !ownSide && mayAnswerFor(role, tenancy)
  if (!permitted) throw new Error('Responsibility proposal not found')
  if (proposal.status !== 'PENDING') throw new Error('Maintenance responsibility conflict')

  const now = new Date()
  const note = input.decision === 'WITHDRAW' ? null : input.note
  const acknowledges = input.decision === 'ACCEPT' && maintenanceCase.status === 'REPORTED'
  await db.$transaction(async (tx) => {
    if (input.decision === 'ACCEPT') {
      await tx.responsibilityProposal.updateMany({
        where: { caseId, status: 'ACCEPTED' },
        data: { status: 'SUPERSEDED' },
      })
    }
    const answered = await tx.responsibilityProposal.updateMany({
      where: { id: proposalId, status: 'PENDING' },
      data: input.decision === 'WITHDRAW'
        ? { status: 'WITHDRAWN' }
        : {
            status: input.decision === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED',
            respondedById: stakeholderId, respondedAt: now, responseNote: note,
          },
    })
    if (answered.count !== 1) throw new Error('Maintenance responsibility conflict')
    await tx.maintenanceEvent.create({
      data: {
        caseId, actorId: stakeholderId,
        kind: input.decision === 'ACCEPT'
          ? 'RESPONSIBILITY_ACCEPTED'
          : input.decision === 'REJECT' ? 'RESPONSIBILITY_REJECTED' : 'RESPONSIBILITY_WITHDRAWN',
        body: note,
        metadata: { proposalId, summary: describeProposal(proposal) },
      },
    })
    if (acknowledges) {
      const advanced = await tx.maintenanceCase.updateMany({
        where: { id: caseId, status: 'REPORTED' },
        data: { status: 'ACKNOWLEDGED', acknowledgedAt: now },
      })
      if (advanced.count !== 1) throw new Error('Maintenance responsibility conflict')
      await tx.maintenanceEvent.create({
        data: {
          caseId, actorId: stakeholderId, kind: 'STATUS_CHANGED',
          metadata: { from: 'REPORTED', to: 'ACKNOWLEDGED' },
        },
      })
    }
    const verb = { ACCEPT: 'accepted', REJECT: 'rejected', WITHDRAW: 'withdrew' }[input.decision]
    await createNotificationRows(tx, notificationRows(tenancy, stakeholderId, {
      kind: 'MAINTENANCE_RESPONSIBILITY', title: maintenanceCase.title,
      body: input.decision === 'WITHDRAW'
        ? `${partyName[sideOf(role)]} withdrew the cost proposal.`
        : `${partyName[sideOf(role)]} ${verb}: ${describeProposal(proposal)}`,
      href: `/maintenance/${caseId}`,
    }))
  })
}

/// The minor repair cap only prefills proposals, so either landlord-side party may set
/// it. The agent's authority to agree costs belongs to the landlord alone.
export async function updateTenancyTerms(tenancyId: string, stakeholderId: string, raw: unknown) {
  const input = tenancyTermsInput.parse(raw)
  const { role } = await authorizeTenancy(tenancyId, stakeholderId)
  if (input.minorRepairCap !== undefined && !canManage(role)) throw new Error('Tenancy not found')
  if (input.agentMayAgreeCosts !== undefined && role !== 'LANDLORD') throw new Error('Tenancy not found')
  if (input.defectWindowDays !== undefined && !canManage(role)) throw new Error('Tenancy not found')
  await db.$transaction(async (tx) => {
    await lockAgencyTenancy(tenancyId, tx)
    if (!await tx.tenancy.findFirst({ where: { id: tenancyId, AND: [tenancyScope(stakeholderId)] }, select: { id: true } })) throw new Error('Tenancy not found')
    if (input.defectWindowDays !== undefined) {
      await tx.$queryRaw`SELECT "id" FROM "Inspection" WHERE "tenancyId" = ${tenancyId} AND "kind" = 'CHECK_IN' ORDER BY "id" FOR UPDATE`
      const tenancy = await tx.tenancy.findUniqueOrThrow({ where: { id: tenancyId }, select: { tenantId: true, defectWindowDays: true } })
      const tenantSignature = await tx.signature.findFirst({
        where: { stakeholderId: tenancy.tenantId, inspection: { tenancyId, kind: 'CHECK_IN' } },
        select: { id: true },
      })
      if (tenantSignature && input.defectWindowDays !== tenancy.defectWindowDays) {
        throw new Error('The move-in defect window is fixed after the tenant signs')
      }
    }
    await tx.tenancy.update({ where: { id: tenancyId }, data: input })
  })
}

function evidenceExtension(mimeType: string) {
  return ({
    'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
    'video/mp4': 'mp4', 'application/pdf': 'pdf',
  } as Record<string, string>)[mimeType]
}

export async function requestMaintenanceEvidenceUpload(caseId: string, stakeholderId: string, raw: unknown) {
  const input = evidenceUploadInput.parse(raw)
  const { maintenanceCase } = await authorizeMaintenanceCase(caseId, stakeholderId)
  if (input.purpose === 'AFTER') {
    const visit = maintenanceCase.visits.find((candidate) => candidate.id === input.visitId)
    if (!visit?.completedAt) throw new Error('After evidence requires a completed visit')
  }
  const existing = await db.maintenanceEvidence.findUnique({ where: { clientId: input.clientId } })
  if (existing) {
    if (existing.caseId !== caseId) throw new Error('Maintenance case not found')
    return {
      alreadyRegistered: true,
      alreadyUploaded: true,
      evidenceId: existing.id,
      storagePath: existing.storagePath,
    }
  }
  const storagePath = `maintenance/${caseId}/${input.clientId}.${evidenceExtension(input.mimeType)}`
  if (await captureExists(storagePath)) return { storagePath, alreadyUploaded: true }
  const upload = await createUploadUrl(storagePath)
  return { storagePath, token: upload.token, signedUrl: upload.signedUrl }
}

export async function registerMaintenanceEvidence(caseId: string, stakeholderId: string, raw: unknown) {
  const input = evidenceInput.parse(raw)
  const { maintenanceCase } = await authorizeMaintenanceCase(caseId, stakeholderId)
  const expectedPath = `maintenance/${caseId}/${input.clientId}.${evidenceExtension(input.mimeType)}`
  if (input.storagePath !== expectedPath) throw new Error('Maintenance evidence path is invalid')
  if (!await captureExists(input.storagePath)) throw new Error('Maintenance evidence has not reached storage')
  if (input.visitId && !maintenanceCase.visits.some((visit) => visit.id === input.visitId)) {
    throw new Error('Maintenance visit not found')
  }
  if (input.purpose === 'AFTER') {
    const visit = maintenanceCase.visits.find((candidate) => candidate.id === input.visitId)
    if (!visit?.completedAt) throw new Error('After evidence requires a completed visit')
  }
  const existing = await db.maintenanceEvidence.findUnique({ where: { clientId: input.clientId } })
  if (existing) {
    if (existing.caseId !== caseId || existing.storagePath !== input.storagePath) {
      throw new Error('Maintenance case not found')
    }
    return { id: existing.id }
  }
  const created = await db.maintenanceEvidence.create({
    data: { ...input, caseId, uploadedById: stakeholderId },
  })
  return { id: created.id }
}

export async function listPropertyAssets(propertyId: string, stakeholderId: string) {
  const property = await db.property.findFirst({
    where: { id: propertyId, tenancies: { some: tenancyScope(stakeholderId) } },
    select: { id: true },
  })
  if (!property) throw new Error('Property not found')
  const landlord = await db.tenancy.findFirst({ where: { propertyId, landlordId: stakeholderId }, select: { id: true } })
  const casesWhere: Prisma.MaintenanceCaseWhereInput = landlord
    ? {}
    : { tenancy: tenancyScope(stakeholderId) }
  const since = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
  const assets = await db.propertyAsset.findMany({
    where: { propertyId, active: true },
    orderBy: { name: 'asc' },
    include: {
      maintenanceCases: {
        where: casesWhere,
        select: { id: true, status: true, createdAt: true, visits: { where: { completedAt: { gte: since } }, select: { id: true } } },
      },
    },
  })
  return assets.map((asset) => ({
    id: asset.id, name: asset.name, category: asset.category,
    roomLabel: asset.roomLabel, identifier: asset.identifier,
    repairVisitsLast365Days: asset.maintenanceCases.reduce((sum, item) => sum + item.visits.length, 0),
    cases: asset.maintenanceCases.map((item) => ({ id: item.id, status: item.status, createdAt: item.createdAt.toISOString() })),
  }))
}

export async function listServiceProviders(categoryFilter?: string, postalSector?: string) {
  const parsedCategory = z.enum(['PLUMBING', 'LOCKSMITH']).optional().parse(categoryFilter || undefined)
  const providers = await db.serviceProvider.findMany({
    where: {
      active: true,
      category: parsedCategory,
      ...(postalSector ? { OR: [{ serviceAreas: { has: postalSector } }, { serviceAreas: { has: 'ALL' } }] } : {}),
    },
    orderBy: { name: 'asc' },
  })
  return {
    emergency: { police: '999', fireAmbulance: '995', source: 'https://www.gov.sg/contact-us/', checkedAt: '2026-10-10' },
    disclaimer: 'Kivilo lists contacts only and does not guarantee availability, pricing, or workmanship.',
    providers: providers.map((provider) => ({
      id: provider.id, name: provider.name, category: provider.category,
      phone: provider.phone, whatsapp: provider.whatsapp,
      serviceAreas: provider.serviceAreas, hours: provider.hours,
      lastVerifiedAt: provider.lastVerifiedAt.toISOString(),
    })),
  }
}

export async function listNotifications(stakeholderId: string) {
  const notifications = await db.notification.findMany({
    where: notificationScope(stakeholderId), orderBy: { createdAt: 'desc' }, take: 100,
  })
  return notifications.map((item) => ({
    id: item.id, kind: item.kind, title: item.title, body: item.body, href: item.href,
    readAt: item.readAt?.toISOString() ?? null, createdAt: item.createdAt.toISOString(),
  }))
}

export async function markNotificationRead(notificationId: string, stakeholderId: string) {
  const result = await db.notification.updateMany({
    where: { id: notificationId, AND: [notificationScope(stakeholderId)] },
    data: { readAt: new Date() },
  })
  if (result.count === 0) throw new Error('Notification not found')
}

export async function createPropertyAsset(
  propertyId: string,
  stakeholderId: string,
  raw: unknown,
) {
  const input = z.object({
    name: z.string().trim().min(1).max(120),
    category: z.enum(['APPLIANCE', 'FIXTURE', 'FURNITURE', 'SURFACE', 'SYSTEM', 'OTHER']),
    roomLabel: z.string().trim().max(120).nullable().default(null),
    identifier: z.string().trim().max(250).nullable().default(null),
    inspectionItemId: z.string().min(1).nullable().default(null),
  }).parse(raw)
  const managerTenancies = await db.tenancy.findMany({
    where: {
      propertyId,
      property: { trashedAt: null },
      OR: [{ landlordId: stakeholderId }, agentTenancies(stakeholderId)],
    },
    select: { id: true, landlordId: true },
  })
  if (managerTenancies.length === 0) throw new Error('Property not found')
  const tenancyScopeForItem: Prisma.TenancyWhereInput = managerTenancies.some(
    (tenancy) => tenancy.landlordId === stakeholderId,
  )
    ? { propertyId }
    : { AND: [{ propertyId }, agentTenancies(stakeholderId)] }
  let targetInspection: { id: string; tenancyId: string } | undefined
  if (input.inspectionItemId) {
    const item = await db.inspectionItem.findFirst({
      where: { id: input.inspectionItemId, room: { inspection: { tenancy: tenancyScopeForItem } } },
      select: { editedByHuman: true, room: { select: { inspection: { select: { id: true, tenancyId: true, status: true } } } } },
    })
    if (!item) throw new Error('Inspection item not found')
    if (!item.editedByHuman) throw new Error('Only a human-reviewed inspection item can be linked')
    if (['AWAITING_SIGNATURE', 'COMPLETED'].includes(item.room.inspection.status)) {
      throw new Error('This report has been sent for signature and can no longer be changed')
    }
    targetInspection = item.room.inspection
  }
  return db.$transaction(async (tx) => {
    await lockAgencyTenancy(targetInspection?.tenancyId ?? managerTenancies[0].id, tx)
    if (!await tx.tenancy.findFirst({ where: {
      propertyId, property: { trashedAt: null }, OR: [{ landlordId: stakeholderId }, agentTenancies(stakeholderId)],
    }, select: { id: true } })) throw new Error('Property not found')
    if (targetInspection) await tx.$queryRaw`SELECT "id" FROM "Inspection" WHERE "id" = ${targetInspection.id} FOR UPDATE`
    const asset = await tx.propertyAsset.create({
      data: { propertyId, name: input.name, category: input.category, roomLabel: input.roomLabel, identifier: input.identifier },
    })
    if (input.inspectionItemId) {
      const linked = await tx.inspectionItem.updateMany({
        where: {
          id: input.inspectionItemId,
          editedByHuman: true,
          room: {
            inspection: {
              tenancy: tenancyScopeForItem,
              status: { notIn: ['AWAITING_SIGNATURE', 'COMPLETED'] },
            },
          },
        },
        data: { propertyAssetId: asset.id },
      })
      if (linked.count !== 1) throw new Error('Inspection item not found')
    }
    return { id: asset.id }
  })
}
