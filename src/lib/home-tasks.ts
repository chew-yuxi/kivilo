import { db } from '@/lib/db'
import { actsAsAgent, agentTenancies, type TenancyRole } from '@/lib/auth'
import { inspectionWorkScope, workspaceTenancies } from '@/lib/inspection-work'
import { repairNextStep } from '@/lib/maintenance'
import { moveInDefectWindow, singaporeCalendarDate } from '@/lib/move-in-defect-window'
import { CHECK_OUT_NOTICE_DAYS } from '@/lib/property-work'
import { dueRenewals } from '@/lib/renewals'
import { assessmentSnapshotSchema, depositStatement } from '@/lib/assessment-schema'
import { addendumSnapshotSchema } from '@/lib/addenda'
import { propertyLabel } from '@/lib/format'
import { Prisma } from '@/generated/prisma'

/// Home's command centre: what is waiting on whom, read from the report, repair,
/// document, update and tenancy state itself. Notifications are history and are never
/// read here. A context only narrows what the viewer already reaches through the shared
/// scopes; choosing "Homes I own" grants nothing an agent lacks, and the reverse.
export type HomeContext =
  | { kind: 'WORK'; agencyId?: string; personal?: boolean }
  | { kind: 'LANDLORD' }
  | { kind: 'TENANT' }

export type HomeTaskGroup = 'ACTION' | 'WAITING' | 'COMING_UP'

export type HomeTask = {
  id: string
  group: HomeTaskGroup
  kind: string
  capacity: TenancyRole
  propertyId: string
  property: string
  tenancyId: string
  title: string
  /// The person the row is about: who acts, or who it is waiting on.
  person: string | null
  date: string | null
  /// DEADLINE is the only kind that can be overdue; the rest describe the row.
  dateKind: 'DEADLINE' | 'ENDS' | 'STARTED' | 'REPORTED' | 'REQUESTED' | null
  overdue: boolean
  /// The same paths notifications carry, so the app resolves them one way.
  href: string
}

/// Each source is read with this bound. Reaching it marks the result truncated, so the
/// app says "at least" rather than presenting a partial count as the whole.
export const HOME_SOURCE_LIMIT = 100

const kindLabel = { CHECK_IN: 'check-in', CHECK_OUT: 'check-out' } as const
const roleName = { LANDLORD: 'landlord', TENANT: 'tenant' } as const

type Party = { id: string; name: string }
type TermParties = { landlord: Party; tenant: Party }

function waitingOn(actorId: string, parties: { role: 'LANDLORD' | 'TENANT'; person: Party }[]) {
  return parties.map(({ role, person }) =>
    person.id === actorId ? `You, as ${roleName[role]}` : `${person.name} (${roleName[role]})`).join(', ')
}

function unsignedParties(tenancy: TermParties, signed: Set<string>) {
  return ([['LANDLORD', tenancy.landlord], ['TENANT', tenancy.tenant]] as const)
    .filter(([, person]) => !signed.has(person.id))
    .map(([role, person]) => ({ role, person }))
}

const termSelect = {
  id: true, propertyId: true, landlordId: true, tenantId: true, agentMayAgreeCosts: true,
  startDate: true, endDate: true, defectWindowDays: true,
  property: true,
  landlord: { select: { id: true, name: true } },
  tenant: { select: { id: true, name: true } },
} satisfies Prisma.TenancySelect

type Term = Prisma.TenancyGetPayload<{ select: typeof termSelect }>

function place(tenancy: Term) {
  return { propertyId: tenancy.propertyId, property: propertyLabel(tenancy.property), tenancyId: tenancy.id }
}

/// Mirrors `authorizeMaintenanceCase`, so a row offers exactly what the case screen permits.
function caseRole(tenancy: Term, actorId: string): TenancyRole {
  return tenancy.landlordId === actorId ? 'LANDLORD' : tenancy.tenantId === actorId ? 'TENANT' : 'AGENT'
}

export async function homeTasks(actorId: string, context: HomeContext, now = new Date()) {
  const capacity: TenancyRole = context.kind === 'WORK' ? 'AGENT' : context.kind
  const work = context.kind === 'WORK' ? { agencyId: context.agencyId, personal: context.personal } : null
  // Reports and updates: the working scope for an agent, the party's own tenancies otherwise.
  // Archiving is the agent's working list; it never hides a party's pending answer.
  const own: Prisma.TenancyWhereInput = {
    property: { trashedAt: null },
    ...(context.kind === 'LANDLORD' ? { landlordId: actorId } : { tenantId: actorId }),
  }
  const inspections: Prisma.InspectionWhereInput = work ? inspectionWorkScope(actorId, work) : { tenancy: own }
  // Repairs follow `tenancyScope`: an agent only while the term runs, a party always.
  const repairTenancies: Prisma.TenancyWhereInput = work
    ? { AND: [agentTenancies(actorId, now), workspaceTenancies(actorId, work)] }
    : own

  const [open, awaiting, statements, addenda, cases, documents, defectTerms, checkOutsDue] = await Promise.all([
    work
      ? db.inspection.findMany({
        where: { AND: [inspections, { status: { in: ['DRAFT', 'CAPTURING', 'PROCESSING', 'REVIEW', 'FAILED'] } }] },
        orderBy: { createdAt: 'asc' },
        take: HOME_SOURCE_LIMIT,
        select: { id: true, kind: true, createdAt: true, tenancy: { select: termSelect } },
      })
      : [],
    db.inspection.findMany({
      where: { AND: [inspections, { status: 'AWAITING_SIGNATURE' }] },
      orderBy: { createdAt: 'asc' },
      take: HOME_SOURCE_LIMIT,
      select: { id: true, kind: true, tenancy: { select: termSelect }, signatures: { select: { stakeholderId: true } } },
    }),
    pendingStatements(inspections).then((ids) => db.inspection.findMany({
      where: { id: { in: ids } },
      orderBy: { createdAt: 'asc' },
      take: HOME_SOURCE_LIMIT,
      select: {
        id: true, tenancy: { select: termSelect },
        assessments: {
          orderBy: { version: 'desc' }, take: 1,
          select: { version: true, snapshot: true, responses: { select: { stakeholderId: true } } },
        },
      },
    })),
    db.reportAddendum.findMany({
      where: { publishedAt: { not: null }, acknowledgedAt: null, disputedAt: null, inspection: inspections },
      orderBy: { publishedAt: 'asc' },
      take: HOME_SOURCE_LIMIT,
      select: {
        id: true, number: true, title: true, snapshot: true,
        acknowledgements: { select: { stakeholderId: true } },
        inspection: { select: { tenancy: { select: termSelect } } },
      },
    }),
    db.maintenanceCase.findMany({
      // Only cases `repairNextStep` gives a row, so settled ones never take the bound.
      where: {
        tenancy: repairTenancies,
        OR: [
          { status: { in: ['REPORTED', 'AWAITING_CONFIRMATION'] } },
          { status: { in: ['ACKNOWLEDGED', 'SCHEDULED'] }, responsibilityProposals: { some: { status: 'PENDING' } } },
        ],
      },
      orderBy: { createdAt: 'asc' },
      take: HOME_SOURCE_LIMIT,
      select: {
        id: true, title: true, status: true, createdAt: true,
        responsibilityProposals: { select: { status: true, arrangedBy: true, proposedById: true } },
        tenancy: { select: termSelect },
      },
    }),
    // Only the tenant uploads, and only the agents working the tenancy request; a
    // landlord is not asked and is not shown the agent's paperwork chase.
    context.kind === 'LANDLORD'
      ? []
      : db.supportingDocumentRequest.findMany({
        where: {
          kind: 'SUPPORTING',
          files: { none: { submittedAt: { not: null } } },
          tenancy: work
            ? { AND: [actsAsAgent(actorId), workspaceTenancies(actorId, work)] }
            : own,
        },
        orderBy: { requestedAt: 'asc' },
        take: HOME_SOURCE_LIMIT,
        select: { id: true, title: true, requestedAt: true, tenancy: { select: termSelect } },
      }),
    // The tenant's move-in notice window, while it is open on a countersigned check-in.
    context.kind === 'TENANT'
      ? db.tenancy.findMany({
        where: {
          ...own,
          defectWindowDays: { gt: 0 },
          inspections: { some: { kind: 'CHECK_IN', status: 'COMPLETED' }, none: { kind: 'CHECK_OUT', status: 'COMPLETED' } },
        },
        take: HOME_SOURCE_LIMIT,
        select: termSelect,
      })
      : [],
    // Check-outs this account can start (`startCheckOut` needs full tenancy access, not
    // a grant on an old report), within the Properties tab's 30 days. A term whose
    // renewal is undecided waits on that decision instead, whoever is looking and
    // whether or not its reminder is snoozed; a renewed term needs no check-out.
    work
      ? db.tenancy.findMany({
        where: {
          AND: [
            actsAsAgent(actorId),
            workspaceTenancies(actorId, work),
            { property: { archivedAt: null, trashedAt: null } },
            { endDate: { lte: new Date(now.getTime() + CHECK_OUT_NOTICE_DAYS * 86_400_000) } },
            { renewedAs: null },
            { OR: [{ renewalDecision: { not: null } }, { endDate: { lt: now } }] },
            { inspections: { some: { kind: 'CHECK_IN', status: 'COMPLETED' }, none: { kind: 'CHECK_OUT' } } },
          ],
        },
        orderBy: { endDate: 'asc' },
        take: HOME_SOURCE_LIMIT,
        select: {
          ...termSelect,
          inspections: {
            where: { kind: 'CHECK_IN', status: 'COMPLETED' },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { id: true },
          },
        },
      })
      : [],
  ])
  const renewals = work ? await dueRenewals(actorId, now, work) : []

  const tasks: HomeTask[] = []
  const base = { capacity, overdue: false }

  for (const inspection of open) {
    tasks.push({
      ...base, ...place(inspection.tenancy),
      id: `inspection:${inspection.id}`, group: 'ACTION', kind: 'CONTINUE_INSPECTION',
      title: `Continue the ${kindLabel[inspection.kind]}`,
      person: `Tenant: ${inspection.tenancy.tenant.name}`,
      date: inspection.createdAt.toISOString(), dateKind: 'STARTED',
      href: `/inspections/${inspection.id}`,
    })
  }

  for (const inspection of awaiting) {
    const pending = unsignedParties(inspection.tenancy, new Set(inspection.signatures.map((row) => row.stakeholderId)))
    if (pending.length === 0) continue
    const mine = !work && pending.some(({ person }) => person.id === actorId)
    tasks.push({
      ...base, ...place(inspection.tenancy),
      id: `signature:${inspection.id}`,
      group: mine ? 'ACTION' : 'WAITING',
      kind: mine ? 'SIGN_REPORT' : 'SIGNATURES',
      title: mine ? `Review and sign the ${kindLabel[inspection.kind]} report` : `Signatures on the ${kindLabel[inspection.kind]} report`,
      person: mine
        ? `As ${roleName[capacity as 'LANDLORD' | 'TENANT']}`
        : `Waiting on ${waitingOn(actorId, pending)}`,
      date: null, dateKind: null,
      href: work ? `/inspections/${inspection.id}` : `/sign/${inspection.id}`,
    })
  }

  for (const inspection of statements) {
    const latest = inspection.assessments[0]
    if (!depositStatement(assessmentSnapshotSchema.parse(latest.snapshot))) continue
    const pending = unsignedParties(inspection.tenancy, new Set(latest.responses.map((row) => row.stakeholderId)))
    if (pending.length === 0) continue
    const mine = !work && pending.some(({ person }) => person.id === actorId)
    tasks.push({
      ...base, ...place(inspection.tenancy),
      id: `deposit:${inspection.id}:${latest.version}`,
      group: mine ? 'ACTION' : 'WAITING',
      kind: mine ? 'ANSWER_DEPOSIT' : 'DEPOSIT_ANSWERS',
      title: mine ? 'Agree or dispute the deposit statement' : 'Answers to the deposit statement',
      person: mine ? `As ${roleName[capacity as 'LANDLORD' | 'TENANT']}` : `Waiting on ${waitingOn(actorId, pending)}`,
      date: null, dateKind: null,
      href: work ? `/inspections/${inspection.id}` : `/sign/${inspection.id}`,
    })
  }

  for (const addendum of addenda) {
    const tenancy = addendum.inspection.tenancy
    // The frozen snapshot is authoritative; the source repair link can be removed.
    const notice = addendumSnapshotSchema.pick({ moveInDefect: true }).parse(addendum.snapshot).moveInDefect !== undefined
    const pending = unsignedParties(tenancy, new Set(addendum.acknowledgements.map((row) => row.stakeholderId)))
    if (pending.length === 0) continue
    const mine = !work && pending.some(({ person }) => person.id === actorId)
    const name = notice ? 'the move-in notice' : `update ${addendum.number}: ${addendum.title}`
    tasks.push({
      ...base, ...place(tenancy),
      id: `addendum:${addendum.id}`,
      group: mine ? 'ACTION' : 'WAITING',
      kind: mine ? (notice ? 'RESPOND_MOVE_IN_NOTICE' : 'ACKNOWLEDGE_UPDATE') : 'UPDATE_ACKNOWLEDGEMENTS',
      title: mine
        ? notice ? 'Agree or dispute the move-in notice' : `Acknowledge ${name}`
        : `Acknowledgements for ${name}`,
      person: mine ? `As ${roleName[capacity as 'LANDLORD' | 'TENANT']}` : `Waiting on ${waitingOn(actorId, pending)}`,
      date: null, dateKind: null,
      href: `/updates/${addendum.id}`,
    })
  }

  for (const repair of cases) {
    const role = caseRole(repair.tenancy, actorId)
    // A person who is also this tenancy's tenant works its repairs as the tenant.
    if (work && role === 'TENANT') continue
    const next = repairNextStep(role, repair, repair.tenancy)
    if (!next) continue
    const other = next.waitingOn === 'TENANT'
      ? repair.tenancy.tenant.name
      : role === 'TENANT' ? `${repair.tenancy.landlord.name} or their agent` : repair.tenancy.landlord.name
    const step = {
      ANSWER_COST: ['Answer the cost proposal', 'Answer to the cost proposal'],
      ACKNOWLEDGE: ['Acknowledge the repair', 'Repair acknowledgement'],
      CONFIRM: ['Confirm the repair is fixed', 'Confirmation the repair is fixed'],
    }[next.step]
    tasks.push({
      ...base, ...place(repair.tenancy),
      id: `repair:${repair.id}`,
      group: next.mine ? 'ACTION' : 'WAITING',
      kind: next.step === 'ANSWER_COST' ? 'REPAIR_COST' : next.step === 'ACKNOWLEDGE' ? 'REPAIR_REPORTED' : 'REPAIR_CONFIRMATION',
      title: `${next.mine ? step[0] : step[1]}: ${repair.title}`,
      person: next.mine ? null : `Waiting on ${other} (${roleName[next.waitingOn]})`,
      date: repair.createdAt.toISOString(), dateKind: 'REPORTED',
      href: `/maintenance/${repair.id}`,
    })
  }

  for (const request of documents) {
    const mine = !work
    tasks.push({
      ...base, ...place(request.tenancy),
      id: `document:${request.id}`,
      group: mine ? 'ACTION' : 'WAITING',
      kind: mine ? 'UPLOAD_DOCUMENT' : 'DOCUMENT_REQUESTED',
      title: mine ? `Upload ${request.title}` : `Document requested: ${request.title}`,
      person: mine ? null : `Waiting on ${request.tenancy.tenant.name} (tenant)`,
      date: request.requestedAt.toISOString(), dateKind: 'REQUESTED',
      href: `/tenancies/${request.tenancy.id}/documents?requestId=${request.id}`,
    })
  }

  for (const tenancy of defectTerms) {
    const window = moveInDefectWindow(tenancy, now)
    if (!window.open || !window.deadline) continue
    tasks.push({
      ...base, ...place(tenancy),
      id: `move-in-window:${tenancy.id}`,
      group: 'COMING_UP', kind: 'MOVE_IN_WINDOW',
      title: 'Report anything the check-in missed',
      person: null,
      // A Singapore calendar day, the last one the window includes.
      date: singaporeCalendarDate(window.deadline), dateKind: 'DEADLINE',
      href: `/tenancies/${tenancy.id}`,
    })
  }

  for (const renewal of renewals) {
    tasks.push({
      ...base,
      propertyId: renewal.propertyId, property: renewal.property, tenancyId: renewal.id,
      id: `renewal:${renewal.id}`, group: 'COMING_UP', kind: 'RENEWAL_DUE',
      title: 'Decide on the renewal',
      person: `Tenant: ${renewal.tenant}`,
      date: renewal.endDate, dateKind: 'ENDS',
      href: `/renewals/${renewal.id}`,
    })
  }

  for (const tenancy of checkOutsDue) {
    tasks.push({
      ...base, ...place(tenancy),
      id: `check-out:${tenancy.id}`, group: 'COMING_UP', kind: 'CHECK_OUT_DUE',
      title: 'Start the check-out',
      person: `Tenant: ${tenancy.tenant.name}`,
      date: tenancy.endDate.toISOString().slice(0, 10), dateKind: 'ENDS',
      href: `/inspections/${tenancy.inspections[0].id}`,
    })
  }

  const today = singaporeCalendarDate(now)
  for (const task of tasks) {
    task.overdue = task.dateKind === 'DEADLINE' && task.date !== null && task.date.slice(0, 10) < today
  }
  const truncated = [open, awaiting, statements, addenda, cases, documents, defectTerms, checkOutsDue]
    .some((rows) => rows.length >= HOME_SOURCE_LIMIT)
  const sorted = sortHomeTasks(tasks)
  return {
    context: context.kind,
    tasks: sorted,
    counts: {
      ACTION: sorted.filter((task) => task.group === 'ACTION').length,
      WAITING: sorted.filter((task) => task.group === 'WAITING').length,
      COMING_UP: sorted.filter((task) => task.group === 'COMING_UP').length,
    },
    truncated,
  }
}

/// Completed check-outs in scope whose latest assessment has a deposit statement that
/// the landlord or tenant has not answered, the only ones that make a row. Filtered
/// before the bound, so years of settled check-outs never crowd out a new statement.
async function pendingStatements(inspections: Prisma.InspectionWhereInput) {
  const candidates = await db.inspection.findMany({
    where: { AND: [inspections, { kind: 'CHECK_OUT', status: 'COMPLETED', assessments: { some: {} } }] },
    select: { id: true },
  })
  if (candidates.length === 0) return []
  const rows = await db.$queryRaw<{ inspectionId: string }[]>`
    SELECT latest."inspectionId" FROM (
      SELECT DISTINCT ON ("inspectionId") "id", "inspectionId", "snapshot"
      FROM "AssessmentVersion"
      WHERE "inspectionId" IN (${Prisma.join(candidates.map((row) => row.id))})
      ORDER BY "inspectionId", "version" DESC
    ) latest
    JOIN "Inspection" i ON i."id" = latest."inspectionId"
    JOIN "Tenancy" t ON t."id" = i."tenancyId"
    WHERE latest."snapshot" ? 'deposit'
      AND (
        NOT EXISTS (SELECT 1 FROM "AssessmentResponse" r WHERE r."assessmentVersionId" = latest."id" AND r."stakeholderId" = t."landlordId")
        OR NOT EXISTS (SELECT 1 FROM "AssessmentResponse" r WHERE r."assessmentVersionId" = latest."id" AND r."stakeholderId" = t."tenantId")
      )`
  return rows.map((row) => row.inspectionId)
}

/// Overdue deadlines, then dated rows soonest first, then undated work. A row's date
/// is a fact about it; nothing here invents an urgency score.
export function sortHomeTasks(tasks: HomeTask[]) {
  const rank = (task: HomeTask) => task.overdue ? 0 : task.dateKind === 'DEADLINE' || task.dateKind === 'ENDS' ? 1 : task.date ? 2 : 3
  return [...tasks].sort((a, b) =>
    rank(a) - rank(b) || (a.date ?? '').localeCompare(b.date ?? '') || a.id.localeCompare(b.id))
}

/// Which views this account has relationships for. Navigation only: every list is still
/// read through the shared scopes, so a stale answer here can never reveal a record.
export async function homeContexts(actorId: string) {
  const [agentWork, grant, membership, landlord, tenant] = await Promise.all([
    db.tenancy.findFirst({ where: actsAsAgent(actorId), select: { id: true } }),
    db.inspectionAccessGrant.findFirst({
      where: { stakeholderId: actorId, inspection: { tenancy: { property: { trashedAt: null } } } }, select: { id: true },
    }),
    db.agencyMembership.findFirst({ where: { stakeholderId: actorId, status: 'ACTIVE' }, select: { id: true } }),
    db.tenancy.findFirst({ where: { landlordId: actorId, property: { trashedAt: null } }, select: { id: true } }),
    db.tenancy.findFirst({ where: { tenantId: actorId, property: { trashedAt: null } }, select: { id: true } }),
  ])
  return {
    work: Boolean(agentWork || grant || membership),
    landlord: Boolean(landlord),
    tenant: Boolean(tenant),
  }
}
