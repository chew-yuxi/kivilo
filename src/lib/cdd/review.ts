import type { Prisma } from '@/generated/prisma'
import { addendumHash } from '@/lib/addenda'
import { db } from '@/lib/db'
import { caseInScope, caseReference, storedParticularsProblem } from './cases'
import { CddInputError, CddStateError } from './errors'
import { RISK_CHECKLIST_VERSION, riskLevel, type RiskKey } from './risk'

/// The agent's side of a case after the particulars arrive, in order: the ID seen, the
/// screening decided (`decideCandidate`), the risk assessed, then completion, which locks
/// the record and fingerprints it like a signature. Each step refuses until the ones
/// before it are done, so the app's stepper is a view of this, never the control.

/// Locks the case for the rest of the transaction and refuses a finished one.
async function openCase(tx: Prisma.TransactionClient, caseId: string, agentId: string) {
  await tx.$queryRaw`SELECT id FROM "CddCase" WHERE id = ${caseId} FOR UPDATE`
  const found = await caseInScope(caseId, agentId, tx)
  if (found.status === 'COMPLETE') throw new CddStateError('This due diligence is complete and locked')
  if (found.status === 'ESCALATED') throw new CddStateError('A confirmed match stops this due diligence')
  const particulars = await tx.cddParticulars.findUnique({ where: { caseId } })
  if (!particulars) throw new CddStateError('The client has not sent their particulars yet')
  if (storedParticularsProblem(particulars)) throw new CddStateError('The particulars need correcting first')
  return { found, particulars }
}

/// Sets the client's particulars aside and asks for them again: because they fail a rule
/// that has tightened since they were sent, or because the agent found they do not match
/// the original ID (then the reason is required). The rejected particulars are kept in
/// the audit trail, the ID number still encrypted; the screening runs stay as they were,
/// and the next submission is screened afresh. Any risk assessment made on them goes.
export async function requestCorrection(caseId: string, agentId: string, reason?: string | null) {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "CddCase" WHERE id = ${caseId} FOR UPDATE`
    const found = await caseInScope(caseId, agentId, tx)
    if (found.status === 'COMPLETE') throw new CddStateError('This due diligence is complete and locked')
    if (found.status === 'ESCALATED') throw new CddStateError('A confirmed match stops this due diligence')
    const particulars = await tx.cddParticulars.findUnique({ where: { caseId } })
    if (!particulars) throw new CddStateError('The client has not sent their particulars yet')
    const problem = storedParticularsProblem(particulars)
    const why = problem?.message ?? reason?.trim()
    if (!why) throw new CddInputError('Say what does not match the original ID')
    await tx.cddEvent.create({
      data: {
        caseId,
        actorId: agentId,
        kind: 'PARTICULARS_REJECTED',
        detail: {
          reason: why,
          field: problem?.field ?? null,
          particulars: { ...particulars, dateOfBirth: particulars.dateOfBirth?.toISOString() ?? null },
        },
      },
    })
    await tx.cddRiskAssessment.deleteMany({ where: { caseId } })
    await tx.cddParticulars.delete({ where: { caseId } })
    await tx.cddCase.update({ where: { id: caseId }, data: { status: 'WAITING_FOR_CLIENT', riskLevel: null } })
    return { reason: why }
  })
}

/// The screening is clear when the latest run's every possible match is decided as not
/// the client. A confirmed match escalates the case instead, which `openCase` refuses.
async function screeningClear(tx: Prisma.TransactionClient, caseId: string) {
  const run = await tx.screeningRun.findFirst({
    where: { caseId },
    orderBy: { ranAt: 'desc' },
    include: { candidates: true },
  })
  if (!run) throw new CddStateError('The client has not been screened yet. Screen them first')
  if (run.candidates.some((candidate) => candidate.decision === null)) {
    throw new CddStateError('Decide every possible match first')
  }
  return run
}

/// The agent's attestation that they saw the original ID, in person or on a video call.
/// Particulars taken in person already carry it.
export async function confirmIdSighted(caseId: string, agentId: string) {
  await db.$transaction(async (tx) => {
    const { particulars } = await openCase(tx, caseId, agentId)
    if (particulars.idSightedAt) return
    await tx.cddParticulars.update({ where: { caseId }, data: { idSightedById: agentId, idSightedAt: new Date() } })
    await tx.cddEvent.create({ data: { caseId, actorId: agentId, kind: 'ID_SIGHTED' } })
  })
}

export async function assessRisk(caseId: string, agentId: string, answers: Record<RiskKey, boolean>, sourceOfFunds?: string | null) {
  const level = riskLevel(answers)
  const funds = sourceOfFunds?.trim() || null
  if (level === 'HIGHER' && !funds) throw new CddInputError('Record where the client’s funds come from')
  await db.$transaction(async (tx) => {
    const { particulars } = await openCase(tx, caseId, agentId)
    if (!particulars.idSightedAt) throw new CddStateError('Check the client’s ID first')
    await screeningClear(tx, caseId)
    const assessment = {
      checklistVersion: RISK_CHECKLIST_VERSION,
      answers: { ...answers, sourceOfFunds: level === 'HIGHER' ? funds : null },
      level,
      assessedById: agentId,
      assessedAt: new Date(),
    } as const
    await tx.cddRiskAssessment.upsert({ where: { caseId }, create: { caseId, ...assessment }, update: assessment })
    await tx.cddCase.update({ where: { id: caseId }, data: { riskLevel: level } })
    await tx.cddEvent.create({ data: { caseId, actorId: agentId, kind: 'RISK_ASSESSED', detail: { level } } })
  })
}

/// Locks the record and stores the SHA-256 of everything it says, recomputable from the
/// rows with `completedRecord`.
export async function completeCase(caseId: string, agentId: string) {
  return db.$transaction(async (tx) => {
    const { found, particulars } = await openCase(tx, caseId, agentId)
    if (!particulars.idSightedAt) throw new CddStateError('Check the client’s ID first')
    await screeningClear(tx, caseId)
    const risk = await tx.cddRiskAssessment.findUnique({ where: { caseId } })
    if (!risk) throw new CddStateError('Assess the client’s risk first')
    const completedAt = new Date()
    await tx.cddCase.update({ where: { id: caseId }, data: { status: 'COMPLETE', completedAt } })
    const contentHash = addendumHash(await completedRecord(tx, caseId, agentId))
    await tx.cddCase.update({ where: { id: caseId }, data: { contentHash } })
    await tx.cddEvent.create({ data: { caseId, actorId: agentId, kind: 'COMPLETED', detail: { contentHash, version: found.version } } })
    return { contentHash, completedAt }
  })
}

/// Everything a completed case records, without the ID number itself.
export async function completedRecord(tx: Prisma.TransactionClient, caseId: string, completedById: string) {
  const found = await tx.cddCase.findUniqueOrThrow({
    where: { id: caseId },
    include: {
      particulars: true,
      riskAssessment: true,
      screeningRuns: { orderBy: { ranAt: 'desc' }, take: 1, include: { candidates: { orderBy: { reference: 'asc' } } } },
    },
  })
  const p = found.particulars!
  const run = found.screeningRuns[0]
  const risk = found.riskAssessment!
  return {
    caseId: found.id,
    reference: caseReference(found.id),
    version: found.version,
    agentId: found.agentId,
    clientId: found.clientId,
    clientRole: found.clientRole,
    particulars: {
      kind: p.kind,
      legalName: p.legalName,
      idType: p.idType,
      idNumberLast4: p.idNumberLast4,
      nationality: p.nationality,
      dateOfBirth: p.dateOfBirth?.toISOString().slice(0, 10) ?? null,
      address: p.address,
      pepDeclared: p.pepDeclared,
      pepDetails: p.pepDetails,
      submittedInPerson: p.submittedInPerson,
      submittedAt: p.submittedAt.toISOString(),
      idSightedById: p.idSightedById,
      idSightedAt: p.idSightedAt?.toISOString() ?? null,
    },
    screening: {
      runId: run.id,
      ranAt: run.ranAt.toISOString(),
      provider: run.provider,
      listVersions: run.listVersions,
      candidates: run.candidates.map((candidate) => ({
        source: candidate.source,
        reference: candidate.reference,
        matchedName: candidate.matchedName,
        score: candidate.score,
        decision: candidate.decision,
        reason: candidate.reason,
        decidedById: candidate.decidedById,
        decidedAt: candidate.decidedAt?.toISOString() ?? null,
      })),
    },
    risk: {
      checklistVersion: risk.checklistVersion,
      answers: risk.answers,
      level: risk.level,
      assessedById: risk.assessedById,
      assessedAt: risk.assessedAt.toISOString(),
    },
    completedById,
    completedAt: found.completedAt!.toISOString(),
  }
}
