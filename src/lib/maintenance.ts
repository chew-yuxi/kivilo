import { z } from 'zod'
import { db } from '@/lib/db'
import { authorizeTenancy, tenancyScope, type TenancyRole } from '@/lib/auth'
import { captureExists, createDownloadUrl, createUploadUrl } from '@/lib/storage'
import type { Prisma } from '@/generated/prisma'

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

export const createCaseInput = z.object({
  clientId: clientId.optional(),
  propertyAssetId: z.string().min(1).nullable().default(null),
  category,
  priority: priority.default('ROUTINE'),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(4000),
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
  cost: z.string().regex(/^\d+(?:\.\d{1,2})?$/).nullable().default(null),
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

function caseInclude() {
  return {
    propertyAsset: true,
    reportedBy: { select: { id: true, name: true } },
    tenancy: { include: { property: true } },
    events: {
      orderBy: { createdAt: 'asc' as const },
      include: { actor: { select: { id: true, name: true } } },
    },
    visits: {
      orderBy: { createdAt: 'asc' as const },
      include: { provider: true, verification: true },
    },
    evidence: { orderBy: { createdAt: 'asc' as const } },
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
  tenancy: { landlordId: string; tenantId: string; agentId: string | null; endDate: Date },
  excludeId: string,
  input: { kind: 'MAINTENANCE_REPORTED' | 'MAINTENANCE_STATUS' | 'MAINTENANCE_VISIT' | 'MAINTENANCE_VERIFICATION' | 'REPEAT_REPAIR'; title: string; body: string; href: string; dedupeKey?: string },
) {
  const ids = [tenancy.landlordId, tenancy.tenantId]
  if (tenancy.agentId && tenancy.endDate >= new Date()) ids.push(tenancy.agentId)
  return [...new Set(ids)].filter((id) => id !== excludeId).map((recipientId) => ({
    ...input,
    recipientId,
    dedupeKey: input.dedupeKey ? `${input.dedupeKey}:${recipientId}` : null,
  }))
}

export async function listTenancies(stakeholderId: string) {
  const tenancies = await db.tenancy.findMany({
    where: tenancyScope(stakeholderId),
    orderBy: { startDate: 'desc' },
    include: {
      property: true,
      landlord: { select: { id: true, name: true } },
      tenant: { select: { id: true, name: true } },
      agent: { select: { id: true, name: true } },
      _count: { select: { maintenanceCases: true, inspections: true } },
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
  }))
}

export async function tenancyDetail(tenancyId: string, stakeholderId: string) {
  const { tenancy, role } = await authorizeTenancy(tenancyId, stakeholderId)
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
    capabilities: { report: true, manage: canManage(role), verify: role === 'TENANT' },
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
  return {
    id: maintenanceCase.id,
    tenancyId: maintenanceCase.tenancyId,
    role,
    canManage: canManage(role),
    canVerify: role === 'TENANT',
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
    const item = await tx.maintenanceCase.create({
      data: { ...input, tenancyId, reportedById: stakeholderId },
    })
    await tx.maintenanceEvent.create({
      data: { caseId: item.id, actorId: stakeholderId, kind: 'REPORTED', body: input.description },
    })
    const rows = notificationRows(tenancy, stakeholderId, {
      kind: 'MAINTENANCE_REPORTED', title: input.title,
      body: `${tenancy.property.line1}: a maintenance issue was reported.`,
      href: `/maintenance/${item.id}`,
    })
    if (rows.length) await tx.notification.createMany({ data: rows })
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
    if (rows.length) await tx.notification.createMany({ data: rows })
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
  if (!canManage(role)) throw new Error('Maintenance case not found')
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
    if (rows.length) await tx.notification.createMany({ data: rows })
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
  const tenancy = await db.tenancy.findUniqueOrThrow({ where: { id: tenancyId } })
  const recipients = [tenancy.landlordId]
  if (tenancy.agentId && tenancy.endDate >= new Date()) recipients.push(tenancy.agentId)
  await db.notification.createMany({
    data: [...new Set(recipients)].map((recipientId) => ({
      recipientId,
      kind: 'REPEAT_REPAIR' as const,
      title: 'Repeated repair history',
      body: `This asset has had ${count} completed repair visits in the last 365 days.`,
      href: `/maintenance/${caseId}`,
      dedupeKey: `repeat-repair:${assetId}:${recipientId}`,
    })),
    skipDuplicates: true,
  })
}

export async function verifyMaintenanceVisit(caseId: string, visitId: string, stakeholderId: string, raw: unknown) {
  const input = verificationInput.parse(raw)
  const { maintenanceCase, role } = await authorizeMaintenanceCase(caseId, stakeholderId)
  if (role !== 'TENANT') throw new Error('Maintenance case not found')
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
      body: input.outcome === 'FIXED' ? 'The tenant confirmed the repair is fixed.' : 'The tenant reported that the issue is not fixed.',
      href: `/maintenance/${caseId}`,
    })
    if (rows.length) await tx.notification.createMany({ data: rows })
    return { id: verification.id }
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
    where: { recipientId: stakeholderId }, orderBy: { createdAt: 'desc' }, take: 100,
  })
  return notifications.map((item) => ({
    id: item.id, kind: item.kind, title: item.title, body: item.body, href: item.href,
    readAt: item.readAt?.toISOString() ?? null, createdAt: item.createdAt.toISOString(),
  }))
}

export async function markNotificationRead(notificationId: string, stakeholderId: string) {
  const result = await db.notification.updateMany({
    where: { id: notificationId, recipientId: stakeholderId },
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
      OR: [{ landlordId: stakeholderId }, { agentId: stakeholderId, endDate: { gte: new Date() } }],
    },
    select: { landlordId: true },
  })
  if (managerTenancies.length === 0) throw new Error('Property not found')
  const tenancyScopeForItem: Prisma.TenancyWhereInput = managerTenancies.some(
    (tenancy) => tenancy.landlordId === stakeholderId,
  )
    ? { propertyId }
    : { propertyId, agentId: stakeholderId, endDate: { gte: new Date() } }
  if (input.inspectionItemId) {
    const item = await db.inspectionItem.findFirst({
      where: { id: input.inspectionItemId, room: { inspection: { tenancy: tenancyScopeForItem } } },
      select: { editedByHuman: true, room: { select: { inspection: { select: { status: true } } } } },
    })
    if (!item) throw new Error('Inspection item not found')
    if (!item.editedByHuman) throw new Error('Only a human-reviewed inspection item can be linked')
    if (['AWAITING_SIGNATURE', 'COMPLETED'].includes(item.room.inspection.status)) {
      throw new Error('This report has been sent for signature and can no longer be changed')
    }
  }
  return db.$transaction(async (tx) => {
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
