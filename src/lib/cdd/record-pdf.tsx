import { createHash } from 'node:crypto'
import { Document, Font, Page, renderToBuffer, StyleSheet, Text, View } from '@react-pdf/renderer'
import { addendumHash } from '@/lib/addenda'
import { db } from '@/lib/db'
import { reportBranding } from '@/lib/report-agent'
import { createDownloadUrl, uploadBytes } from '@/lib/storage'
import { caseInScope, caseReference } from './cases'
import { completedRecord } from './review'
import { CddStateError } from './errors'
import { RISK_QUESTIONS } from './risk'
import { maskIdNumber } from './crypto'

/// The receipt of a completed due-diligence case: what an agent shows CEA or their
/// agency's compliance officer. Everything it prints comes from the locked rows, and it
/// recomputes the case's fingerprint from them, so the file says whether the record it
/// describes is unchanged. The ID number is masked, as everywhere else.

Font.registerHyphenationCallback((word) => [word])

const TIME_ZONE = 'Asia/Singapore'
const when = new Intl.DateTimeFormat('en-SG', { dateStyle: 'medium', timeStyle: 'short', timeZone: TIME_ZONE })
const day = new Intl.DateTimeFormat('en-SG', { dateStyle: 'long', timeZone: 'UTC' })

const EVENTS: Record<string, string> = {
  STARTED: 'Deal started',
  REQUEST_SENT: 'Form emailed to the client',
  PARTICULARS_SUBMITTED: 'Particulars received',
  PARTICULARS_REJECTED: 'Particulars sent back for correction',
  SCREENED: 'Screened',
  SCREENING_FAILED: 'Screening could not run, retried',
  ID_SIGHTED: 'Original ID seen',
  MATCH_DECIDED: 'Possible match decided',
  RISK_ASSESSED: 'Risk assessed',
  COMPLETED: 'Completed and locked',
}
const SOURCES: Record<string, string> = {
  UN: 'UN Security Council Consolidated List',
  SG: 'Terrorism (Suppression of Financing) Act, First Schedule',
  PEP: 'Politically exposed persons, Dilisense',
}

export type CddRecordModel = Awaited<ReturnType<typeof cddRecordModel>>

export async function cddRecordModel(caseId: string, agentId: string) {
  const scoped = await caseInScope(caseId, agentId)
  if (scoped.status !== 'COMPLETE') throw new CddStateError('Only a completed due diligence has a record to download')
  const found = await db.cddCase.findUniqueOrThrow({
    where: { id: caseId },
    include: {
      agent: { select: { name: true, branding: true } },
      agency: { select: { name: true, updatedAt: true, branding: true } },
      property: { select: { line1: true, unit: true, postalCode: true } },
      particulars: true,
      riskAssessment: true,
      screeningRuns: { orderBy: { ranAt: 'desc' }, include: { candidates: { orderBy: { score: 'desc' } } } },
      events: { orderBy: { createdAt: 'asc' } },
    },
  })
  const completed = found.events.findLast((event) => event.kind === 'COMPLETED')!
  const recomputed = addendumHash(await completedRecord(db, caseId, completed.actorId!))
  const people = new Map(
    (await db.stakeholder.findMany({
      where: { id: { in: found.events.map((event) => event.actorId).concat(found.agentId).filter((id): id is string => Boolean(id)) } },
      select: { id: true, name: true },
    })).map((person) => [person.id, person.name]),
  )
  const name = (id: string | null) => (id && people.get(id)) ?? 'Unknown'
  const branding = reportBranding({ reportAgentFrozen: true, reportAgent: found.agent, reportAgency: found.agency, tenancy: { agent: null, agency: null } })
  const p = found.particulars!
  const run = found.screeningRuns[0]
  const risk = found.riskAssessment!
  const answers = risk.answers as Record<string, boolean | string | null>
  return {
    reference: caseReference(found.id),
    version: found.version,
    completedAt: found.completedAt!,
    completedBy: name(completed.actorId),
    contentHash: found.contentHash!,
    verified: recomputed === found.contentHash,
    agency: branding?.agencyName ?? null,
    agencyLicence: branding?.agencyLicence ?? null,
    agent: found.agent.name,
    ceaRegistration: branding?.ceaRegistration ?? null,
    clientRole: found.clientRole === 'LANDLORD' ? 'Landlord' : 'Tenant',
    property: found.property ? [[found.property.unit, found.property.line1].filter(Boolean).join(' '), `Singapore ${found.property.postalCode}`].join(', ') : null,
    client: {
      legalName: p.legalName,
      id: `${p.idType === 'PASSPORT' ? 'Passport' : p.idType} ${maskIdNumber(p.idNumberLast4)}`,
      nationality: p.nationality,
      dateOfBirth: p.dateOfBirth ? day.format(p.dateOfBirth) : 'Not given',
      address: p.address,
      pep: p.pepDeclared ? `Declared: ${p.pepDetails}` : 'None declared',
      obtained: p.submittedInPerson ? `Taken in person by ${name(p.submittedById)}` : 'Sent by the client through their own signed-in account',
      submittedAt: p.submittedAt,
      idSeen: p.idSightedAt ? `${name(p.idSightedById)}, ${when.format(p.idSightedAt)}` : 'Not recorded',
    },
    screening: {
      ranAt: run.ranAt,
      earlierRuns: found.screeningRuns.length - 1,
      sources: (run.listVersions as { source: string; publishedAt: string | null; checksum: string; fetchedAt: string }[]).map((version) => ({
        name: SOURCES[version.source] ?? version.source,
        version: version.publishedAt ? `Published ${version.publishedAt.slice(0, 10)}` : `Checked ${when.format(new Date(version.fetchedAt))}`,
        fingerprint: version.checksum.slice(0, 12),
      })),
      matches: run.candidates.map((candidate) => ({
        source: SOURCES[candidate.source] ?? candidate.source,
        reference: candidate.reference,
        name: candidate.matchedName,
        score: Math.round(candidate.score * 100),
        decision: candidate.decision === 'CONFIRMED_MATCH' ? 'Confirmed: same person' : 'Not the same person',
        reason: candidate.reason ?? '',
        decided: candidate.decidedAt ? `${name(candidate.decidedById)}, ${when.format(candidate.decidedAt)}` : '',
      })),
    },
    risk: {
      version: risk.checklistVersion,
      level: risk.level === 'HIGHER' ? 'Higher risk' : 'Standard risk',
      answers: RISK_QUESTIONS.map((question) => ({ question: question.text, answer: answers[question.key] ? 'Yes' : 'No' })),
      sourceOfFunds: typeof answers.sourceOfFunds === 'string' ? answers.sourceOfFunds : null,
      assessed: `${name(risk.assessedById)}, ${when.format(risk.assessedAt)}`,
    },
    trail: found.events.map((event) => ({ at: event.createdAt, what: EVENTS[event.kind] ?? event.kind, by: event.actorId ? name(event.actorId) : 'Kivilo' })),
  }
}

const INK = '#111827'
const MUTED = '#6b7280'
const RULE = '#e5e7eb'
const GREEN = '#047857'
const RED = '#b91c1c'

// No `lineHeight` on the page style: in @react-pdf 4.9 it stops the page numbers drawing.
const s = StyleSheet.create({
  page: { paddingTop: 48, paddingBottom: 56, paddingHorizontal: 44, fontFamily: 'Helvetica', fontSize: 9, color: INK },
  footer: { position: 'absolute', bottom: 24, left: 44, right: 44, flexDirection: 'row', justifyContent: 'space-between', fontSize: 7.5, color: MUTED, borderTopWidth: 0.5, borderTopColor: RULE, paddingTop: 5 },
  eyebrow: { fontSize: 8, color: MUTED, letterSpacing: 1, textTransform: 'uppercase' },
  title: { fontSize: 18, fontFamily: 'Helvetica-Bold', marginTop: 4 },
  section: { marginTop: 18 },
  heading: { fontSize: 11, fontFamily: 'Helvetica-Bold', marginBottom: 6, paddingBottom: 3, borderBottomWidth: 0.75, borderBottomColor: INK },
  row: { flexDirection: 'row', paddingVertical: 3, borderBottomWidth: 0.5, borderBottomColor: RULE },
  label: { width: 150, color: MUTED },
  value: { flex: 1 },
  bold: { fontFamily: 'Helvetica-Bold' },
  small: { fontSize: 8, color: MUTED },
  card: { marginTop: 6, padding: 8, borderWidth: 0.75, borderColor: RULE, borderRadius: 4 },
})

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.row} wrap={false}>
      <Text style={s.label}>{label}</Text>
      <Text style={s.value}>{value}</Text>
    </View>
  )
}

export function CddRecordDocument({ model }: { model: CddRecordModel }) {
  const m = model
  return (
    <Document title={`Customer due diligence record ${m.reference}`} author={m.agency ?? m.agent}>
      <Page size="A4" style={s.page}>
        <Text style={s.eyebrow}>{m.agency ?? 'Kivilo'}{m.agencyLicence ? `  ·  Licence ${m.agencyLicence}` : ''}</Text>
        <Text style={s.title}>Customer due diligence record</Text>
        <Text style={s.small}>Under the Estate Agents (Prevention of Money Laundering and Financing of Terrorism) Regulations 2021</Text>

        <View style={s.section}>
          <Row label="Reference" value={`${m.reference}  ·  version ${m.version}`} />
          <Row label="Completed" value={`${when.format(m.completedAt)} by ${m.completedBy}`} />
          <Row label="Agent" value={[m.agent, m.ceaRegistration && `CEA ${m.ceaRegistration}`].filter(Boolean).join(', ')} />
          <Row label="Client acting as" value={m.clientRole} />
          {m.property && <Row label="Property" value={m.property} />}
        </View>

        <View style={s.section}>
          <Text style={s.heading} minPresenceAhead={48}>1. Client particulars</Text>
          <Row label="Full name" value={m.client.legalName} />
          <Row label="Identity document" value={m.client.id} />
          <Row label="Nationality" value={m.client.nationality} />
          <Row label="Date of birth" value={m.client.dateOfBirth} />
          <Row label="Residential address" value={m.client.address} />
          <Row label="Public position" value={m.client.pep} />
          <Row label="How obtained" value={`${m.client.obtained}, ${when.format(m.client.submittedAt)}`} />
        </View>

        <View style={s.section}>
          <Text style={s.heading} minPresenceAhead={48}>2. Identity verification</Text>
          <Row label="Original document seen by" value={m.client.idSeen} />
        </View>

        <View style={s.section}>
          <Text style={s.heading} minPresenceAhead={48}>3. Screening</Text>
          <Row label="Screened" value={`${when.format(m.screening.ranAt)}${m.screening.earlierRuns ? `  ·  ${m.screening.earlierRuns} earlier run(s) superseded` : ''}`} />
          {m.screening.sources.map((source) => (
            <View key={source.name} style={s.row} wrap={false}>
              <View style={s.value}>
                <Text style={s.bold}>{source.name}</Text>
                <Text style={s.small}>{source.version}  ·  version fingerprint {source.fingerprint}</Text>
              </View>
            </View>
          ))}
          {m.screening.matches.length === 0 ? (
            <Text style={{ marginTop: 6, color: GREEN }}>No possible match on any source.</Text>
          ) : (
            m.screening.matches.map((match) => (
              <View key={match.reference} style={s.card} wrap={false}>
                <Text style={s.bold}>{match.name}  ({match.score}% name similarity)</Text>
                <Text style={s.small}>{match.source}  ·  {match.reference}</Text>
                <Text style={{ marginTop: 4, color: match.decision.startsWith('Confirmed') ? RED : INK }}>{match.decision}: {match.reason}</Text>
                <Text style={s.small}>Decided by {match.decided}</Text>
              </View>
            ))
          )}
        </View>

        <View style={s.section}>
          <Text style={s.heading} minPresenceAhead={48}>4. Risk assessment</Text>
          {m.risk.answers.map((answer) => (
            <View key={answer.question} style={s.row} wrap={false}>
              <Text style={s.value}>{answer.question}</Text>
              <Text style={[s.bold, { width: 40, textAlign: 'right' }]}>{answer.answer}</Text>
            </View>
          ))}
          <Row label="Result" value={m.risk.level} />
          {m.risk.sourceOfFunds && <Row label="Source of funds" value={m.risk.sourceOfFunds} />}
          <Row label="Assessed by" value={`${m.risk.assessed}  ·  checklist ${m.risk.version}`} />
        </View>

        <View style={s.section}>
          <Text style={s.heading} minPresenceAhead={48}>5. Audit trail</Text>
          {m.trail.map((event, i) => <Row key={i} label={when.format(event.at)} value={`${event.what}  ·  ${event.by}`} />)}
        </View>

        <View style={s.section} wrap={false}>
          <Text style={s.heading} minPresenceAhead={48}>6. Fingerprint</Text>
          <Text>SHA-256 of the locked record:</Text>
          <Text style={{ fontFamily: 'Courier', marginTop: 3 }}>{m.contentHash}</Text>
          <Text style={{ marginTop: 6, color: m.verified ? GREEN : RED }}>
            {m.verified
              ? 'Recomputed from the stored record when this file was made: it matches, so nothing has changed since completion.'
              : 'Recomputed from the stored record when this file was made: it DOES NOT match. Report this to Kivilo.'}
          </Text>
          <Text style={[s.small, { marginTop: 8 }]}>
            Keep this record for at least five years after the business relationship ends. The full identity number is held
            encrypted and is not printed.
          </Text>
        </View>

        <View fixed style={s.footer}>
          <Text>{m.reference}  ·  {m.contentHash.slice(0, 16)}  ·  Prepared with Kivilo</Text>
          <Text fixed render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}

/// Draws the record, stores it privately by what it says, and returns a ten-minute link.
export async function cddRecordPdfUrl(caseId: string, agentId: string) {
  const model = await cddRecordModel(caseId, agentId)
  const pdf = await renderToBuffer(<CddRecordDocument model={model} />)
  const digest = createHash('sha256').update(pdf).digest('hex').slice(0, 16)
  const path = await uploadBytes(`cdd/${caseId}/${digest}.pdf`, pdf, 'application/pdf')
  return { url: await createDownloadUrl(path, 10 * 60, `Kivilo due diligence ${model.reference}.pdf`) }
}
