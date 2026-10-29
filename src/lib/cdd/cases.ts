import type { CddClientRole, CddIdType, Prisma, ScreeningDecision, StakeholderKind } from '@/generated/prisma'
import { actsAsAgent } from '@/lib/auth'
import { requireAgencyMembership } from '@/lib/agency'
import { db } from '@/lib/db'
import { screen } from '@/lib/screening/match'
import { currentSanctionsLists } from '@/lib/screening/lists'
import { recordServerError } from '@/lib/errors'
import { encryptIdNumber, maskIdNumber } from './crypto'

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

async function caseInScope(caseId: string, actorId: string, client: Prisma.TransactionClient = db) {
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
  if (!name) throw new Error('Enter the client’s name')
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
  const legalName = input.legalName.trim()
  const nationality = input.nationality.trim()
  const address = input.address.trim()
  if (!legalName || !nationality || !address || !input.idNumber.trim()) {
    throw new Error('Fill in every field as it appears on the ID')
  }
  // Without a date of birth a common name matches too many listed people to review.
  const dateOfBirth = input.dateOfBirth ? new Date(`${input.dateOfBirth}T00:00:00Z`) : null
  if (input.kind === 'INDIVIDUAL' && (!dateOfBirth || Number.isNaN(dateOfBirth.getTime()))) {
    throw new Error('Enter the date of birth as it appears on the ID')
  }
  if (input.pepDeclared && !input.pepDetails?.trim()) throw new Error('Say which public position is held')
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

/// The client's own submission, signed in as themselves: refused for anyone else, and once
/// submitted. They learn only that it was received.
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
    if (found.status !== 'WAITING_FOR_CLIENT') throw new Error('Particulars are already in')
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
  const birthYear = particulars.dateOfBirth?.getUTCFullYear() ?? null
  const candidates = screen({ kind: particulars.kind, name: particulars.legalName, birthYear }, entries)
  await db.$transaction(async (tx) => {
    const run = await tx.screeningRun.create({
      data: { caseId, subjectName: particulars.legalName, subjectBirthYear: birthYear, provider: 'kivilo-lists', listVersions: versions },
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
  if (found.status === 'WAITING_FOR_CLIENT') throw new Error('The client has not sent their particulars yet')
  await screenCase(caseId)
}

/// The agent's decision on one possible match, with their reason. Final once made. A
/// confirmed match escalates the case: no further dealing, and a report to be filed.
export async function decideCandidate(candidateId: string, agentId: string, decision: ScreeningDecision, reason: string) {
  const why = reason.trim()
  if (!why) throw new Error('Give the reason for this decision')
  await db.$transaction(async (tx) => {
    const candidate = await tx.screeningCandidate.findFirst({
      where: { id: candidateId, decision: null, run: { case: cddCaseScope(agentId) } },
      select: { id: true, run: { select: { caseId: true } } },
    })
    if (!candidate) throw new Error('Match not found')
    await tx.screeningCandidate.update({
      where: { id: candidate.id },
      data: { decision, reason: why, decidedById: agentId, decidedAt: new Date() },
    })
    const caseId = candidate.run.caseId
    await tx.cddEvent.create({ data: { caseId, actorId: agentId, kind: 'MATCH_DECIDED', detail: { candidateId, decision } } })
    if (decision === 'CONFIRMED_MATCH') {
      await tx.cddCase.update({ where: { id: caseId }, data: { status: 'ESCALATED' } })
      await tx.cddEvent.create({ data: { caseId, actorId: agentId, kind: 'ESCALATED' } })
    }
  })
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
      screeningRuns: { orderBy: { ranAt: 'desc' }, include: { candidates: { orderBy: { score: 'desc' } } } },
    },
  })
  const { particulars, ...rest } = found
  return {
    ...rest,
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
      submittedAt: particulars.submittedAt,
    },
  }
}

/// Everything the client sees: whether their form is still wanted. Never the case's status,
/// screening or decisions.
export async function caseForClient(caseId: string, clientId: string) {
  const found = await db.cddCase.findFirst({
    where: { id: caseId, clientId },
    select: { id: true, clientRole: true, particulars: { select: { submittedAt: true } }, agent: { select: { name: true } } },
  })
  if (!found) throw new Error(NOT_FOUND)
  return { id: found.id, agentName: found.agent.name, clientRole: found.clientRole, submitted: found.particulars !== null }
}
