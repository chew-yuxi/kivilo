import { createHash } from 'node:crypto'
import type { CddClientRole, CddIdType, CddParticulars, CddStatus, Prisma, ScreeningDecision, StakeholderKind } from '@/generated/prisma'
import { actsAsAgent } from '@/lib/auth'
import { requireAgencyMembership } from '@/lib/agency'
import { db } from '@/lib/db'
import { screen } from '@/lib/screening/match'
import { currentSanctionsLists } from '@/lib/screening/lists'
import { pepEntries, type PepEntry } from '@/lib/screening/dilisense'
import { recordServerError } from '@/lib/errors'
import { reportBranding } from '@/lib/report-agent'
import { decryptIdNumber, encryptIdNumber, maskIdNumber } from './crypto'
import { CddInputError, CddStateError } from './errors'
import { particularsProblem } from './particulars-rules'
import { RISK_QUESTIONS } from './risk'

export { CddInputError, CddStateError }

/// CEA customer due diligence for one client of one deal (plans/compliance-pack.md).
/// Every function takes the acting person explicitly and refuses with the same "Case not
/// found" as a missing row, so ids cannot be probed. The client is never told anything
/// about screening: telling someone they are the subject of a report is an offence.

const NOT_FOUND = 'Case not found'


/// Who works a case: the agent who started it, anyone working its linked tenancy, and the
/// owners and managers of its agency.
export function cddCaseScope(actorId: string): Prisma.CddCaseWhereInput {
  return {
    OR: [
      { agentId: actorId },
      { tenancy: actsAsAgent(actorId) },
      { agency: { members: { some: { stakeholderId: actorId, status: 'ACTIVE', role: { in: ['OWNER', 'MANAGER'] } } } } },
    ],
  }
}

export async function caseInScope(caseId: string, actorId: string, client: Prisma.TransactionClient = db) {
  const found = await client.cddCase.findFirst({ where: { id: caseId, ...cddCaseScope(actorId) } })
  if (!found) throw new Error(NOT_FOUND)
  return found
}

export type StartDeal = {
  clientName: string
  clientEmail?: string | null
  clientRole: CddClientRole
  tenancyId?: string | null
  agencyId?: string | null
}

/// "Start a deal": due diligence begins before any lease or check-in exists. Naming an
/// existing tenancy links the case now; otherwise it is linked when the check-in creates one.
export async function startDeal(actorId: string, input: StartDeal) {
  const name = input.clientName.trim()
  if (!name) throw new CddInputError('Enter the client’s name')
  const email = input.clientEmail?.trim().toLowerCase() || null
  return db.$transaction(async (tx) => {
    let tenancy: { id: string; propertyId: string; agencyId: string | null } | null = null
    if (input.tenancyId) {
      tenancy = await tx.tenancy.findFirst({
        where: { id: input.tenancyId, ...actsAsAgent(actorId) },
        select: { id: true, propertyId: true, agencyId: true },
      })
      if (!tenancy) throw new Error('Tenancy not found')
    }
    const agencyId = tenancy?.agencyId ?? input.agencyId ?? null
    if (agencyId && !tenancy) await requireAgencyMembership(agencyId, actorId, tx)
    const client = email
      ? await tx.stakeholder.upsert({ where: { email }, update: {}, create: { name, email } })
      : await tx.stakeholder.create({ data: { name } })
    const created = await tx.cddCase.create({
      data: {
        agentId: actorId,
        clientId: client.id,
        clientRole: input.clientRole,
        tenancyId: tenancy?.id,
        propertyId: tenancy?.propertyId,
        agencyId,
      },
    })
    await tx.cddEvent.create({ data: { caseId: created.id, actorId, kind: 'STARTED', detail: { clientRole: input.clientRole } } })
    return created
  })
}

/// Starts due diligence on a tenancy's landlord and tenant, as the people already on it,
/// and emails each one with an address. A party who already has a case on this tenancy is
/// skipped, so a retried create or a second tap never starts anything twice; the tenancy
/// row lock serializes two taps at once.
export async function verifyTenancyParties(actorId: string, tenancyId: string, roles: CddClientRole[] = ['LANDLORD', 'TENANT']) {
  const started = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Tenancy" WHERE id = ${tenancyId} FOR UPDATE`
    const tenancy = await tx.tenancy.findFirst({
      where: { id: tenancyId, ...actsAsAgent(actorId) },
      select: {
        id: true, propertyId: true, agencyId: true, landlordId: true, tenantId: true,
        cddCases: { select: { clientRole: true } },
      },
    })
    if (!tenancy) throw new Error('Tenancy not found')
    const created: { role: CddClientRole; caseId: string }[] = []
    for (const role of roles) {
      if (tenancy.cddCases.some((existing) => existing.clientRole === role)) continue
      const found = await tx.cddCase.create({
        data: {
          agentId: actorId,
          clientId: role === 'LANDLORD' ? tenancy.landlordId : tenancy.tenantId,
          clientRole: role,
          tenancyId: tenancy.id,
          propertyId: tenancy.propertyId,
          agencyId: tenancy.agencyId,
        },
      })
      await tx.cddEvent.create({ data: { caseId: found.id, actorId, kind: 'STARTED', detail: { clientRole: role, fromTenancy: true } } })
      created.push({ role, caseId: found.id })
    }
    return created
  })
  for (const { caseId } of started) await requestParticulars(caseId, actorId)
  return started
}

export type PartyCheck = {
  caseId: string
  status: CddStatus
  needsCorrection: boolean
  requestedAt: Date | null
  completedAt: Date | null
}

/// Each tenancy's landlord and tenant checks, newest case per party, for the tenancy
/// screens and the check before signing. Only cases this agent may open are counted.
export async function partyChecks(tenancyIds: string[], actorId: string) {
  const cases = await db.cddCase.findMany({
    where: { tenancyId: { in: tenancyIds }, ...cddCaseScope(actorId) },
    orderBy: { createdAt: 'desc' },
    include: {
      particulars: true,
      events: { where: { kind: 'REQUEST_SENT' }, orderBy: { createdAt: 'desc' }, take: 1, select: { createdAt: true } },
    },
  })
  const checks = new Map<string, { landlord: PartyCheck | null; tenant: PartyCheck | null }>(
    tenancyIds.map((id) => [id, { landlord: null, tenant: null }]),
  )
  for (const found of cases) {
    const entry = checks.get(found.tenancyId!)!
    const key = found.clientRole === 'LANDLORD' ? 'landlord' : 'tenant'
    if (entry[key]) continue
    entry[key] = {
      caseId: found.id,
      status: found.status,
      needsCorrection: Boolean(found.particulars && found.status !== 'COMPLETE' && storedParticularsProblem(found.particulars)),
      requestedAt: found.events[0]?.createdAt ?? null,
      completedAt: found.completedAt,
    }
  }
  return checks
}

export type Particulars = {
  kind: StakeholderKind
  legalName: string
  idType: CddIdType
  idNumber: string
  nationality: string
  dateOfBirth?: string | null
  address: string
  pepDeclared: boolean
  pepDetails?: string | null
}

function checkedParticulars(input: Particulars) {
  // Companies and their owners come later (plans/compliance-pack.md); only individuals
  // reach here today, and everything about them must be right before it is stored.
  if (input.kind !== 'INDIVIDUAL') throw new CddInputError('Only individuals can send particulars for now')
  const problem = particularsProblem(input)
  if (problem) throw new CddInputError(problem.message)
  const legalName = input.legalName.trim()
  const nationality = input.nationality
  const address = input.address.trim()
  const dateOfBirth = new Date(`${input.dateOfBirth}T00:00:00Z`)
  const { encrypted, last4 } = encryptIdNumber(input.idNumber)
  return {
    kind: input.kind,
    legalName,
    idType: input.idType,
    idNumberEncrypted: encrypted,
    idNumberLast4: last4,
    nationality,
    dateOfBirth,
    address,
    pepDeclared: input.pepDeclared,
    pepDetails: input.pepDeclared ? input.pepDetails!.trim() : null,
  }
}

/// Where the client fills in their particulars, signed in as themselves (`/cdd/[caseId]`).
/// The email only fills in the login form; the link is not a credential.
export function particularsPath(caseId: string, email?: string | null) {
  return email ? `/cdd/${caseId}?${new URLSearchParams({ email })}` : `/cdd/${caseId}`
}

/// Asks the client for their particulars by email, in-app and push, and returns the link
/// for the agent to send on WhatsApp as well. At most once every ten minutes per case.
export async function requestParticulars(caseId: string, agentId: string, options: { reminder?: boolean; now?: Date } = {}) {
  return db.$transaction(async (tx) => {
    const found = await caseInScope(caseId, agentId, tx)
    if (found.status !== 'WAITING_FOR_CLIENT') throw new CddStateError('The client has already sent their particulars')
    const [client, agent] = await Promise.all([
      tx.stakeholder.findUniqueOrThrow({ where: { id: found.clientId }, select: { email: true } }),
      tx.stakeholder.findUniqueOrThrow({ where: { id: found.agentId }, select: { name: true } }),
    ])
    const path = particularsPath(caseId, client.email)
    const recent = await tx.cddEvent.findFirst({
      where: { caseId, kind: 'REQUEST_SENT', createdAt: { gt: new Date((options.now ?? new Date()).getTime() - 10 * 60 * 1000) } },
    })
    if (client.email && !recent) {
      await tx.notification.create({
        data: {
          recipientId: found.clientId,
          kind: 'CDD_REQUEST',
          title: `${options.reminder ? 'Reminder: ' : ''}${agent.name} needs your details for your rental`,
          body: `${agent.name} is your property agent and needs your details as on your ID. Agents in Singapore must confirm who their clients are before a deal, under CEA rules. It takes about three minutes.`,
          href: particularsPath(caseId),
          dedupeKey: `cdd-request:${caseId}:${Date.now()}`,
        },
      })
      await tx.cddEvent.create({
        data: { caseId, actorId: options.reminder ? null : agentId, kind: 'REQUEST_SENT', detail: options.reminder ? { reminder: true } : undefined },
      })
    }
    return { path, emailed: Boolean(client.email && !recent) }
  })
}

/// Whether a queued request still wants an answer; once the particulars are in, it is not sent.
export async function particularsStillWanted(caseId: string) {
  return (await db.cddCase.count({ where: { id: caseId, status: 'WAITING_FOR_CLIENT', particulars: null } })) > 0
}

/// The client's own submission, signed in as themselves: refused for anyone else, and once
/// submitted. They learn only that it was received.
/// Stored particulars measured against today's rules. Rules only tighten, so particulars
/// accepted under an older rule can fail a newer one; the case then needs them corrected
/// before any review step (`openCase` in review.ts) and says so to the agent.
export function storedParticularsProblem(p: CddParticulars) {
  if (p.kind !== 'INDIVIDUAL') return null
  return particularsProblem({
    legalName: p.legalName,
    idType: p.idType,
    idNumber: decryptIdNumber(p.idNumberEncrypted),
    nationality: p.nationality,
    dateOfBirth: p.dateOfBirth?.toISOString().slice(0, 10) ?? null,
    address: p.address,
    pepDeclared: p.pepDeclared,
    pepDetails: p.pepDetails,
  }, p.submittedAt)
}

export async function submitOwnParticulars(caseId: string, clientId: string, input: Particulars) {
  const data = checkedParticulars(input)
  await db.$transaction(async (tx) => {
    const found = await tx.cddCase.findFirst({ where: { id: caseId, clientId, status: 'WAITING_FOR_CLIENT', particulars: null } })
    if (!found) throw new Error(NOT_FOUND)
    await tx.cddParticulars.create({ data: { ...data, caseId, submittedById: clientId, submittedInPerson: false } })
    await tx.cddCase.update({ where: { id: caseId }, data: { status: 'NEEDS_REVIEW' } })
    await tx.cddEvent.create({ data: { caseId, actorId: clientId, kind: 'PARTICULARS_SUBMITTED', detail: { inPerson: false } } })
  })
  await screenAfterSubmission(caseId)
  return { submitted: true as const }
}

/// The agent filling the particulars in with the client present, having seen the ID.
export async function submitParticularsInPerson(caseId: string, agentId: string, input: Particulars) {
  const data = checkedParticulars(input)
  await db.$transaction(async (tx) => {
    const found = await caseInScope(caseId, agentId, tx)
    if (found.status !== 'WAITING_FOR_CLIENT') throw new CddStateError('Particulars are already in')
    await tx.cddParticulars.create({
      data: { ...data, caseId, submittedById: agentId, submittedInPerson: true, idSightedById: agentId, idSightedAt: new Date() },
    })
    await tx.cddCase.update({ where: { id: caseId }, data: { status: 'NEEDS_REVIEW' } })
    await tx.cddEvent.create({ data: { caseId, actorId: agentId, kind: 'PARTICULARS_SUBMITTED', detail: { inPerson: true } } })
  })
  await screenAfterSubmission(caseId)
}

/// A submission always stands; the case is the agent's from that moment. If screening
/// cannot run (a list not loaded, the database busy), the case records it, error tracking
/// alerts, and the agent's view offers the retry. The client never sees the difference.
async function screenAfterSubmission(caseId: string) {
  try {
    await screenCase(caseId)
  } catch (error) {
    await db.cddEvent.create({ data: { caseId, kind: 'SCREENING_FAILED' } })
    await recordServerError(error, { context: 'cdd-screening', path: `/cdd/${caseId}`, userAgent: null })
  }
}

/// Screens the client against every list in force. Run on submission, by the agent's retry,
/// and again at renewal; each run records the exact list versions it used.
export async function screenCase(caseId: string) {
  const particulars = await db.cddParticulars.findUniqueOrThrow({ where: { caseId } })
  const { entries, versions } = await currentSanctionsLists()
  // One run covers both checks, so a case is never screened against one and not the other.
  const pep = await pepEntries(particulars.legalName, particulars.dateOfBirth)
  const birthYear = particulars.dateOfBirth?.getUTCFullYear() ?? null
  const candidates = screen({ kind: particulars.kind, name: particulars.legalName, birthYear }, [...entries, ...pep.entries])
  await db.$transaction(async (tx) => {
    const run = await tx.screeningRun.create({
      data: {
        caseId,
        subjectName: particulars.legalName,
        subjectBirthYear: birthYear,
        provider: 'kivilo-lists+dilisense',
        listVersions: [...versions, pep.version],
      },
    })
    if (candidates.length) {
      await tx.screeningCandidate.createMany({
        data: candidates.map((candidate) => ({
          runId: run.id,
          source: candidate.entry.list,
          reference: candidate.entry.reference,
          matchedName: candidate.matchedName,
          score: candidate.score,
          details: {
            names: candidate.entry.names.map((listed) => listed.name),
            birthYears: candidate.entry.birthYears,
            nationalities: candidate.entry.nationalities,
            birthYearAgrees: candidate.birthYearAgrees,
            ...('positions' in candidate.entry && {
              pepType: (candidate.entry as PepEntry).pepType,
              positions: (candidate.entry as PepEntry).positions,
            }),
          },
        })),
      })
    }
    await tx.cddEvent.create({ data: { caseId, kind: 'SCREENED', detail: { runId: run.id, candidates: candidates.length } } })
  })
}

/// The agent's retry after a failed screening, or a fresh check before renewal.
export async function rescreen(caseId: string, agentId: string) {
  const found = await caseInScope(caseId, agentId)
  if (found.status === 'WAITING_FOR_CLIENT') throw new CddStateError('The client has not sent their particulars yet')
  if (found.status === 'COMPLETE') throw new CddStateError('This due diligence is complete and locked')
  await screenCase(caseId)
}

/// The agent's decision on one possible match, with their reason. Final once made. A
/// confirmed match escalates the case: no further dealing, and a report to be filed.
export async function decideCandidate(candidateId: string, agentId: string, decision: ScreeningDecision, reason: string) {
  const why = reason.trim()
  if (!why) throw new CddInputError('Give the reason for this decision')
  await db.$transaction(async (tx) => {
    const candidate = await tx.screeningCandidate.findFirst({
      where: { id: candidateId, decision: null, run: { case: cddCaseScope(agentId) } },
      select: { id: true, source: true, run: { select: { caseId: true } } },
    })
    if (!candidate) throw new Error('Match not found')
    await tx.screeningCandidate.update({
      where: { id: candidate.id },
      data: { decision, reason: why, decidedById: agentId, decidedAt: new Date() },
    })
    const caseId = candidate.run.caseId
    await tx.cddEvent.create({ data: { caseId, actorId: agentId, kind: 'MATCH_DECIDED', detail: { candidateId, decision } } })
    // A confirmed sanctions match stops the deal. A confirmed politically exposed person does
    // not: they are a higher-risk client, which the risk assessment then has to record.
    if (decision === 'CONFIRMED_MATCH' && candidate.source !== 'PEP') {
      await tx.cddCase.update({ where: { id: caseId }, data: { status: 'ESCALATED' } })
      await tx.cddEvent.create({ data: { caseId, actorId: agentId, kind: 'ESCALATED' } })
    }
  })
}

const ATTENTION: Record<string, number> = { ESCALATED: 0, NEEDS_REVIEW: 1, WAITING_FOR_CLIENT: 2, COMPLETE: 3 }

/// The agent's cases, those needing them first: escalated, then needing review, then
/// waiting for the client, then complete; newest first within each.
export async function casesForAgent(agentId: string) {
  const cases = await db.cddCase.findMany({
    where: cddCaseScope(agentId),
    orderBy: { updatedAt: 'desc' },
    take: 200,
    select: {
      id: true, status: true, clientRole: true, createdAt: true, updatedAt: true,
      client: { select: { name: true } },
      particulars: true,
      riskAssessment: { select: { level: true } },
      tenancy: { select: { id: true, property: { select: { line1: true, unit: true } } } },
      screeningRuns: {
        orderBy: { ranAt: 'desc' },
        take: 1,
        select: { candidates: { where: { decision: null }, select: { id: true } } },
      },
    },
  })
  return cases
    .map((found) => ({
      id: found.id,
      status: found.status,
      clientRole: found.clientRole,
      clientName: found.particulars?.legalName ?? found.client.name,
      property: found.tenancy ? [found.tenancy.property.unit, found.tenancy.property.line1].filter(Boolean).join(', ') : null,
      tenancyId: found.tenancy?.id ?? null,
      openMatches: found.screeningRuns[0]?.candidates.length ?? 0,
      screened: found.screeningRuns.length > 0,
      particularsIn: found.particulars !== null,
      needsCorrection: Boolean(found.particulars && found.status !== 'COMPLETE' && storedParticularsProblem(found.particulars)),
      idSighted: Boolean(found.particulars?.idSightedAt),
      riskAssessed: found.riskAssessment !== null,
      createdAt: found.createdAt,
      updatedAt: found.updatedAt,
    }))
    .sort((a, b) => ATTENTION[a.status] - ATTENTION[b.status])
}

/// Everything the agent sees. The identity number appears only masked; nothing here ever
/// decrypts it.
export async function caseForAgent(caseId: string, agentId: string) {
  await caseInScope(caseId, agentId)
  const found = await db.cddCase.findUniqueOrThrow({
    where: { id: caseId },
    include: {
      client: { select: { id: true, name: true, email: true } },
      particulars: true,
      riskAssessment: true,
      events: { where: { kind: 'REQUEST_SENT' }, orderBy: { createdAt: 'desc' }, take: 1, select: { createdAt: true } },
      screeningRuns: { orderBy: { ranAt: 'desc' }, include: { candidates: { orderBy: { score: 'desc' } } } },
    },
  })
  const { particulars, riskAssessment, events, ...rest } = found
  return {
    ...rest,
    reference: caseReference(found.id),
    /// When the form was last emailed to the client, so the agent knows it went.
    requestedAt: events[0]?.createdAt ?? null,
    /// Set when the stored particulars fail today's rules and must be corrected.
    particularsProblem: particulars && found.status !== 'COMPLETE' ? storedParticularsProblem(particulars) : null,
    riskAssessment: riskAssessment && {
      checklistVersion: riskAssessment.checklistVersion,
      answers: riskAssessment.answers,
      level: riskAssessment.level,
      assessedAt: riskAssessment.assessedAt,
    },
    /// The questions the app asks, so the checklist changes in one place.
    riskQuestions: RISK_QUESTIONS,
    particulars: particulars && {
      kind: particulars.kind,
      legalName: particulars.legalName,
      idType: particulars.idType,
      idNumber: maskIdNumber(particulars.idNumberLast4),
      nationality: particulars.nationality,
      dateOfBirth: particulars.dateOfBirth?.toISOString().slice(0, 10) ?? null,
      address: particulars.address,
      pepDeclared: particulars.pepDeclared,
      pepDetails: particulars.pepDetails,
      submittedInPerson: particulars.submittedInPerson,
      idSighted: particulars.idSightedAt !== null,
      idSightedAt: particulars.idSightedAt,
      submittedAt: particulars.submittedAt,
    },
  }
}

/// Everything the client sees: whether their form is still wanted. Never the case's status,
/// screening or decisions.
export async function caseForClient(caseId: string, clientId: string) {
  const found = await db.cddCase.findFirst({
    where: { id: caseId, clientId },
    select: {
      id: true,
      clientRole: true,
      particulars: { select: { submittedAt: true } },
      events: { where: { kind: 'PARTICULARS_REJECTED' }, orderBy: { createdAt: 'desc' }, take: 1, select: { detail: true } },
      agent: { select: { name: true, branding: true } },
      agency: { select: { name: true, updatedAt: true, branding: true } },
      property: { select: { line1: true, unit: true } },
    },
  })
  if (!found) throw new Error(NOT_FOUND)
  // The same identity a report carries: the team's name and logo with the agent's own
  // CEA registration, or the agent's personal branding.
  const branding = reportBranding({
    reportAgentFrozen: true,
    reportAgent: found.agent,
    reportAgency: found.agency,
    tenancy: { agent: null, agency: null },
  })
  return {
    id: found.id,
    reference: caseReference(found.id),
    agentName: found.agent.name,
    agencyName: branding?.agencyName ?? null,
    agencyLicence: branding?.agencyLicence ?? null,
    ceaRegistration: branding?.ceaRegistration ?? null,
    logoPath: branding?.logoPath ?? null,
    property: found.property ? [found.property.unit, found.property.line1].filter(Boolean).join(', ') : null,
    clientRole: found.clientRole,
    submitted: found.particulars !== null,
    submittedAt: found.particulars?.submittedAt ?? null,
    /// What the agent asked the client to correct, while the corrected details are awaited.
    /// About their own entry only, never about screening.
    correction: found.particulars ? null : ((found.events[0]?.detail as { reason?: string } | null)?.reason ?? null),
  }
}

/// What the client and the agent quote to each other about a case: short, and not the id.
export function caseReference(caseId: string) {
  return `DD-${createHash('sha256').update(caseId).digest('hex').slice(0, 8).toUpperCase()}`
}

/// What needs the agent on Home: cases waiting on them (review, correction, a confirmed
/// match) and cases waiting on clients.
export async function caseCounts(agentId: string) {
  const cases = await casesForAgent(agentId)
  return {
    needsYou: cases.filter((found) => found.status === 'NEEDS_REVIEW' || found.status === 'ESCALATED' || found.needsCorrection).length,
    waiting: cases.filter((found) => found.status === 'WAITING_FOR_CLIENT').length,
  }
}

/// Automatic reminders for clients who have not sent their particulars: one a day after
/// the agent's last request, another two days after that, then none. Only clients the
/// agent has already asked, by email, are reminded.
export const REMINDER_AFTER_HOURS = [24, 48]

export async function sendDueReminders(now = new Date()) {
  const waiting = await db.cddCase.findMany({
    where: { status: 'WAITING_FOR_CLIENT', particulars: null, client: { email: { not: null } }, events: { some: { kind: 'REQUEST_SENT' } } },
    select: {
      id: true,
      agentId: true,
      events: { where: { kind: { in: ['REQUEST_SENT', 'PARTICULARS_REJECTED'] } }, orderBy: { createdAt: 'desc' }, select: { kind: true, createdAt: true, detail: true } },
    },
  })
  const sent: string[] = []
  for (const found of waiting) {
    // Reminders count from the latest request; a correction starts the count again.
    const since = found.events.findIndex((event) => event.kind === 'PARTICULARS_REJECTED')
    const requests = (since < 0 ? found.events : found.events.slice(0, since)).filter((event) => event.kind === 'REQUEST_SENT')
    if (requests.length === 0) continue
    const reminders = requests.filter((event) => (event.detail as { reminder?: boolean } | null)?.reminder).length
    if (reminders >= REMINDER_AFTER_HOURS.length) continue
    const due = requests[0].createdAt.getTime() + REMINDER_AFTER_HOURS[reminders] * 60 * 60 * 1000
    if (now.getTime() < due) continue
    const { emailed } = await requestParticulars(found.id, found.agentId, { reminder: true, now })
    if (emailed) sent.push(found.id)
  }
  return sent
}
