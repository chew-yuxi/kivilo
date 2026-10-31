import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { db } from '@/lib/db'
import { parseTsfaFirstSchedule } from '@/lib/screening/sg-tsfa'
import { parseUnConsolidated } from '@/lib/screening/un-list'
import { notificationScope } from '@/lib/auth'
import {
  caseForAgent, caseCounts, caseForClient, decideCandidate, partyChecks, sendDueReminders, verifyTenancyParties, particularsStillWanted, requestParticulars, rescreen, startDeal,
  submitOwnParticulars, submitParticularsInPerson, type Particulars,
} from './cases'
import { addendumHash } from '@/lib/addenda'
import { renderToBuffer } from '@react-pdf/renderer'
import { pdfPageTexts } from '@/lib/report-pdf/pdf-text'
import { CddRecordDocument, cddRecordModel } from './record-pdf'
import { assessRisk, completeCase, completedRecord, confirmIdSighted, requestCorrection } from './review'

const tag = randomUUID().slice(0, 8)
const people: string[] = []
const tenancies: string[] = []
const properties: string[] = []
const fixture = (name: string) => readFileSync(new URL(`../screening/fixtures/${name}`, import.meta.url), 'utf8')

async function person(name: string) {
  const created = await db.stakeholder.create({ data: { name: `${name} ${tag}`, email: `${name.toLowerCase().replace(/\W/g, '')}-${tag}@example.test` } })
  people.push(created.id)
  return created
}

const ordinary: Particulars = {
  kind: 'INDIVIDUAL', legalName: 'Tan Wei Ming', idType: 'NRIC', idNumber: 's 1234567d',
  nationality: 'Singapore', dateOfBirth: '1985-04-12', address: '1 Orchard Road', pepDeclared: false,
}

/// Dilisense, as it answers: a politically exposed person for one name, nothing otherwise.
const realFetch = globalThis.fetch
const dilisense = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
  // Only Dilisense is answered here; the PDF renderer loads its layout engine by fetch.
  if (!String(url).startsWith('https://api.dilisense.com/')) return realFetch(url, init)
  const name = new URL(String(url)).searchParams.get('names')
  const found_records = name === 'Lawrence Wong'
    ? [{ id: 'pep-1', source_type: 'PEP', pep_type: 'POLITICIAN', name: 'Lawrence Wong', date_of_birth: ['18/12/1972'], citizenship: ['SG'], positions: ['Prime Minister of Singapore'] }]
    : []
  return Response.json({ timestamp: '2026-10-31T01:00:00Z', total_hits: found_records.length, found_records })
})

beforeAll(async () => {
  vi.stubEnv('DILISENSE_API_KEY', 'test-key')
  vi.stubGlobal('fetch', dilisense)
  await db.sanctionsList.deleteMany()
  for (const [source, list] of [
    ['UN', parseUnConsolidated(fixture('un-consolidated-sample.xml'))],
    ['SG', parseTsfaFirstSchedule(fixture('sg-tsfa-first-schedule.html'))],
  ] as const) {
    await db.sanctionsList.create({
      data: { source, checksum: `${source}-${tag}`, publishedAt: list.generatedAt, entryCount: list.entries.length, entries: list.entries },
    })
  }
})

afterAll(async () => {
  const cases = await db.cddCase.findMany({ where: { OR: [{ agentId: { in: people } }, { clientId: { in: people } }] }, select: { id: true } })
  const ids = cases.map((found) => found.id)
  await db.screeningCandidate.deleteMany({ where: { run: { caseId: { in: ids } } } })
  await db.screeningRun.deleteMany({ where: { caseId: { in: ids } } })
  await db.cddEvent.deleteMany({ where: { caseId: { in: ids } } })
  await db.notification.deleteMany({ where: { kind: 'CDD_REQUEST', recipientId: { in: people } } })
  await db.cddRiskAssessment.deleteMany({ where: { caseId: { in: ids } } })
  await db.cddParticulars.deleteMany({ where: { caseId: { in: ids } } })
  await db.cddCase.deleteMany({ where: { id: { in: ids } } })
  await db.sanctionsList.deleteMany()
  await db.tenancy.deleteMany({ where: { id: { in: tenancies } } })
  await db.property.deleteMany({ where: { id: { in: properties } } })
  const clients = await db.stakeholder.findMany({ where: { email: { endsWith: `-${tag}@example.test` } }, select: { id: true } })
  await db.stakeholder.deleteMany({ where: { id: { in: [...people, ...clients.map((client) => client.id)] } } })
})

describe('due diligence cases', () => {
  it('starts a deal before any tenancy, reusing the client on file by email', async () => {
    const agent = await person('Agent One')
    const landlord = await person('Landlord One')
    const started = await startDeal(agent.id, { clientName: 'Someone else', clientEmail: landlord.email!.toUpperCase(), clientRole: 'LANDLORD' })
    expect(started).toMatchObject({ agentId: agent.id, clientId: landlord.id, tenancyId: null, status: 'WAITING_FOR_CLIENT' })
  })

  it('answers another agent exactly as it answers a missing case', async () => {
    const agent = await person('Agent Two')
    const stranger = await person('Stranger Two')
    const started = await startDeal(agent.id, { clientName: 'Client Two', clientRole: 'TENANT' })
    await expect(caseForAgent(started.id, stranger.id)).rejects.toThrow('Case not found')
    await expect(caseForAgent('missing', stranger.id)).rejects.toThrow('Case not found')
  })

  it('takes the client’s own particulars once, encrypted, and tells them only that it arrived', async () => {
    const agent = await person('Agent Three')
    const client = await person('Client Three')
    const started = await startDeal(agent.id, { clientName: client.name, clientEmail: client.email, clientRole: 'LANDLORD' })
    await expect(submitOwnParticulars(started.id, agent.id, ordinary)).rejects.toThrow('Case not found')
    expect(await submitOwnParticulars(started.id, client.id, ordinary)).toEqual({ submitted: true })
    await expect(submitOwnParticulars(started.id, client.id, ordinary)).rejects.toThrow('Case not found')

    const stored = await db.cddParticulars.findUniqueOrThrow({ where: { caseId: started.id } })
    expect(stored.idNumberEncrypted).not.toContain('1234567')
    const view = await caseForAgent(started.id, agent.id)
    expect(view.status).toBe('NEEDS_REVIEW')
    expect(view.particulars).toMatchObject({ idNumber: '*****567D', submittedInPerson: false, idSighted: false })
    expect(view.screeningRuns).toHaveLength(1)
    expect(view.screeningRuns[0].candidates).toEqual([])
    expect((view.screeningRuns[0].listVersions as { source: string }[]).map((version) => version.source)).toEqual(['UN', 'SG', 'PEP'])
  })

  it('never shows the client a match, a status or a decision', async () => {
    const agent = await person('Agent Four')
    const client = await person('Client Four')
    const started = await startDeal(agent.id, { clientName: client.name, clientEmail: client.email, clientRole: 'TENANT' })
    await submitOwnParticulars(started.id, client.id, { ...ordinary, legalName: 'Mohamad Latiff bin Rahim', dateOfBirth: '1983-08-23' })
    const view = await caseForAgent(started.id, agent.id)
    const [candidate] = view.screeningRuns[0].candidates
    expect(candidate).toMatchObject({ source: 'SG', reference: 'TSFA First Schedule 2(zw)', decision: null })

    const seen = JSON.stringify(await caseForClient(started.id, client.id))
    // The agent's identity and when they sent it; nothing about what happened after.
    expect(Object.keys(JSON.parse(seen)).sort()).toEqual([
      'agencyLicence', 'agencyName', 'agentName', 'ceaRegistration', 'clientRole', 'correction', 'id', 'logoPath',
      'property', 'reference', 'submitted', 'submittedAt',
    ])
    expect(JSON.parse(seen)).toMatchObject({ id: started.id, agentName: agent.name, clientRole: 'TENANT', submitted: true })
    for (const word of ['NEEDS_REVIEW', 'TSFA', 'Latiff', 'match', 'screen']) expect(seen).not.toContain(word)
  })

  it('records the agent’s reasoned, final decision, and escalates a confirmed match', async () => {
    const agent = await person('Agent Five')
    const started = await startDeal(agent.id, { clientName: 'Walk-in Five', clientRole: 'LANDLORD' })
    await submitParticularsInPerson(started.id, agent.id, { ...ordinary, legalName: 'Tan Jun Jie', idNumber: 'T0712345G', dateOfBirth: '2007-03-19' })
    const [candidate] = (await caseForAgent(started.id, agent.id)).screeningRuns[0].candidates
    await expect(decideCandidate(candidate.id, agent.id, 'NOT_A_MATCH', '  ')).rejects.toThrow('reason')
    await decideCandidate(candidate.id, agent.id, 'CONFIRMED_MATCH', 'Same name and date of birth as the designation')
    await expect(decideCandidate(candidate.id, agent.id, 'NOT_A_MATCH', 'Changed my mind')).rejects.toThrow('Match not found')
    const view = await caseForAgent(started.id, agent.id)
    expect(view.status).toBe('ESCALATED')
    expect(view.particulars).toMatchObject({ submittedInPerson: true, idSighted: true })
  })

  it('keeps a submission when screening cannot run, and lets the agent retry', async () => {
    const agent = await person('Agent Six')
    const client = await person('Client Six')
    const started = await startDeal(agent.id, { clientName: client.name, clientEmail: client.email, clientRole: 'LANDLORD' })
    const lists = await db.sanctionsList.findMany()
    await db.sanctionsList.deleteMany()
    try {
      expect(await submitOwnParticulars(started.id, client.id, ordinary)).toEqual({ submitted: true })
      const view = await caseForAgent(started.id, agent.id)
      expect(view).toMatchObject({ status: 'NEEDS_REVIEW', screeningRuns: [] })
      expect(await db.cddEvent.count({ where: { caseId: started.id, kind: 'SCREENING_FAILED' } })).toBe(1)
    } finally {
      await db.sanctionsList.createMany({
        data: lists.map((list) => ({
          source: list.source, checksum: list.checksum, publishedAt: list.publishedAt, entryCount: list.entryCount,
          entries: list.entries as object, fetchedAt: list.fetchedAt,
        })),
      })
      await db.errorEvent.deleteMany({ where: { context: 'cdd-screening', path: `/cdd/${started.id}` } })
    }
    await rescreen(started.id, agent.id)
    expect((await caseForAgent(started.id, agent.id)).screeningRuns).toHaveLength(1)
  })

  it('asks the client by email, once per ten minutes, until their particulars are in', async () => {
    const agent = await person('Agent Seven')
    const client = await person('Client Seven')
    const started = await startDeal(agent.id, { clientName: client.name, clientEmail: client.email, clientRole: 'LANDLORD' })
    const first = await requestParticulars(started.id, agent.id)
    expect(first).toEqual({ path: `/cdd/${started.id}?email=${encodeURIComponent(client.email!)}`, emailed: true })
    expect((await requestParticulars(started.id, agent.id)).emailed).toBe(false)

    const [request] = await db.notification.findMany({ where: { kind: 'CDD_REQUEST', recipientId: client.id } })
    expect(request).toMatchObject({ href: `/cdd/${started.id}`, title: expect.stringContaining(agent.name) })
    expect(await db.notification.count({ where: { id: request.id, ...notificationScope(client.id) } })).toBe(1)
    expect(await particularsStillWanted(started.id)).toBe(true)

    await submitOwnParticulars(started.id, client.id, ordinary)
    expect(await particularsStillWanted(started.id)).toBe(false)
    await expect(requestParticulars(started.id, agent.id)).rejects.toThrow('already sent')
    const stranger = await person('Stranger Seven')
    await expect(requestParticulars(started.id, stranger.id)).rejects.toThrow('Case not found')
  })

  it('returns a copyable link without emailing a client who has no address on file', async () => {
    const agent = await person('Agent Eight')
    const started = await startDeal(agent.id, { clientName: 'No Email Eight', clientRole: 'TENANT' })
    expect(await requestParticulars(started.id, agent.id)).toEqual({ path: `/cdd/${started.id}`, emailed: false })
    expect(await db.notification.count({ where: { kind: 'CDD_REQUEST', href: `/cdd/${started.id}` } })).toBe(0)
  })
})

describe('reviewing a case', () => {
  const clear = { pep: false, highRiskCountry: false, cash: false, actingForAnother: false, unusual: false }

  it('takes the steps in order, then locks the record under a recomputable fingerprint', async () => {
    const agent = await person('Agent Review')
    const client = await person('Client Review')
    const started = await startDeal(agent.id, { clientName: client.name, clientEmail: client.email, clientRole: 'TENANT' })
    await expect(confirmIdSighted(started.id, agent.id)).rejects.toThrow('The client has not sent their particulars yet')
    // Shares a name with the listed Mohamad Latiff bin Rahim, so there is a match to decide.
    await submitOwnParticulars(started.id, client.id, { ...ordinary, legalName: 'Mohamad Latiff bin Rahim', dateOfBirth: '1990-01-01' })

    await expect(assessRisk(started.id, agent.id, clear)).rejects.toThrow('Check the client’s ID first')
    await confirmIdSighted(started.id, agent.id)
    await expect(assessRisk(started.id, agent.id, clear)).rejects.toThrow('Decide every possible match first')
    const [candidate] = (await caseForAgent(started.id, agent.id)).screeningRuns[0].candidates
    await decideCandidate(candidate.id, agent.id, 'NOT_A_MATCH', 'Born 1990, the listed person 1983')
    await expect(completeCase(started.id, agent.id)).rejects.toThrow('Assess the client’s risk first')

    await expect(assessRisk(started.id, agent.id, { ...clear, cash: true })).rejects.toThrow('Record where the client’s funds come from')
    await assessRisk(started.id, agent.id, { ...clear, cash: true }, 'Salary, DBS payslips seen')
    const { contentHash } = await completeCase(started.id, agent.id)

    const view = await caseForAgent(started.id, agent.id)
    expect(view).toMatchObject({ status: 'COMPLETE', riskLevel: 'HIGHER', contentHash, riskAssessment: { level: 'HIGHER' } })
    expect(view.reference).toMatch(/^DD-[0-9A-F]{8}$/)
    expect(addendumHash(await completedRecord(db, started.id, agent.id))).toBe(contentHash)

    for (const step of [
      () => confirmIdSighted(started.id, agent.id),
      () => assessRisk(started.id, agent.id, clear),
      () => completeCase(started.id, agent.id),
      () => rescreen(started.id, agent.id),
    ]) await expect(step()).rejects.toThrow('This due diligence is complete and locked')
  })

  it('refuses another agent every step, as a missing case', async () => {
    const agent = await person('Agent Owner')
    const stranger = await person('Agent Stranger')
    const started = await startDeal(agent.id, { clientName: 'Walk-in Six', clientRole: 'LANDLORD' })
    await submitParticularsInPerson(started.id, agent.id, ordinary)
    for (const step of [
      () => confirmIdSighted(started.id, stranger.id),
      () => assessRisk(started.id, stranger.id, clear),
      () => completeCase(started.id, stranger.id),
    ]) await expect(step()).rejects.toThrow('Case not found')
  })

  it('blocks review of particulars that fail a newer rule until the client corrects them', async () => {
    const agent = await person('Agent Correct')
    const client = await person('Client Correct')
    const started = await startDeal(agent.id, { clientName: client.name, clientEmail: client.email, clientRole: 'TENANT' })
    await submitOwnParticulars(started.id, client.id, ordinary)
    // As a row accepted before nationality came from a list.
    await db.cddParticulars.update({ where: { caseId: started.id }, data: { nationality: 'Singaporean' } })

    const view = await caseForAgent(started.id, agent.id)
    expect(view.particularsProblem).toEqual({ field: 'nationality', message: 'Choose the nationality from the list' })
    await expect(confirmIdSighted(started.id, agent.id)).rejects.toThrow('The particulars need correcting first')
    const before = await db.cddParticulars.findUniqueOrThrow({ where: { caseId: started.id } })

    await requestCorrection(started.id, agent.id)
    expect(await db.cddParticulars.findUnique({ where: { caseId: started.id } })).toBeNull()
    expect((await caseForAgent(started.id, agent.id)).status).toBe('WAITING_FOR_CLIENT')
    const rejected = await db.cddEvent.findFirstOrThrow({ where: { caseId: started.id, kind: 'PARTICULARS_REJECTED' } })
    expect(rejected.detail).toMatchObject({ reason: 'Choose the nationality from the list', particulars: { idNumberEncrypted: before.idNumberEncrypted } })
    expect(await caseForClient(started.id, client.id)).toMatchObject({ submitted: false, correction: 'Choose the nationality from the list' })

    await submitOwnParticulars(started.id, client.id, ordinary)
    expect((await caseForAgent(started.id, agent.id)).particularsProblem).toBeNull()
    expect(await caseForClient(started.id, client.id)).toMatchObject({ submitted: true, correction: null })
  })

  it('asks for a reason to reject particulars that pass every rule', async () => {
    const agent = await person('Agent Mismatch')
    const started = await startDeal(agent.id, { clientName: 'Walk-in Seven', clientRole: 'LANDLORD' })
    await submitParticularsInPerson(started.id, agent.id, ordinary)
    await expect(requestCorrection(started.id, agent.id, ' ')).rejects.toThrow('Say what does not match the original ID')
    expect(await requestCorrection(started.id, agent.id, 'Address differs from the NRIC')).toEqual({ reason: 'Address differs from the NRIC' })
  })

  it('checks politically exposed persons with the lists, and a confirmed one raises the risk, not the alarm', async () => {
    const agent = await person('Agent Pep')
    const started = await startDeal(agent.id, { clientName: 'Walk-in Eight', clientRole: 'LANDLORD' })
    await submitParticularsInPerson(started.id, agent.id, { ...ordinary, legalName: 'Lawrence Wong', dateOfBirth: '1972-12-18' })
    const [run] = (await caseForAgent(started.id, agent.id)).screeningRuns
    expect(run.provider).toBe('kivilo-lists+dilisense')
    expect(run.listVersions).toEqual(expect.arrayContaining([expect.objectContaining({ source: 'PEP', fetchedAt: '2026-10-31T01:00:00Z' })]))
    const pep = run.candidates.find((candidate) => candidate.source === 'PEP')!
    expect(pep).toMatchObject({ reference: 'Dilisense pep-1', matchedName: 'Lawrence Wong', details: { positions: ['Prime Minister of Singapore'] } })
    const checked = new URL(String(dilisense.mock.calls.findLast(([url]) => String(url).includes('dilisense'))![0])).searchParams
    expect([checked.get('names'), checked.get('dob')]).toEqual(['Lawrence Wong', '18/12/1972'])

    await decideCandidate(pep.id, agent.id, 'CONFIRMED_MATCH', 'Same person: the Prime Minister')
    expect((await caseForAgent(started.id, agent.id)).status).toBe('NEEDS_REVIEW')
    const clear = { pep: false, highRiskCountry: false, cash: false, actingForAnother: false, unusual: false }
    await expect(assessRisk(started.id, agent.id, clear)).rejects.toThrow('You confirmed the client is a politically exposed person')
    await assessRisk(started.id, agent.id, { ...clear, pep: true }, 'Ministerial salary')
    expect((await caseForAgent(started.id, agent.id)).riskLevel).toBe('HIGHER')
  })

  it('records a failed screening when the PEP check cannot be reached, and screens on retry', async () => {
    const agent = await person('Agent Down')
    const started = await startDeal(agent.id, { clientName: 'Walk-in Nine', clientRole: 'TENANT' })
    dilisense.mockImplementationOnce(async () => new Response('busy', { status: 503 }))
    await submitParticularsInPerson(started.id, agent.id, ordinary)
    expect((await caseForAgent(started.id, agent.id)).screeningRuns).toEqual([])
    expect(await db.cddEvent.count({ where: { caseId: started.id, kind: 'SCREENING_FAILED' } })).toBe(1)
    await rescreen(started.id, agent.id)
    expect((await caseForAgent(started.id, agent.id)).screeningRuns).toHaveLength(1)
  })

  it('prints a completed case as a receipt that verifies its own fingerprint, with the ID masked', async () => {
    const agent = await person('Agent Receipt')
    const started = await startDeal(agent.id, { clientName: 'Walk-in Ten', clientRole: 'TENANT' })
    await expect(cddRecordModel(started.id, agent.id)).rejects.toThrow('Only a completed due diligence has a record to download')
    await submitParticularsInPerson(started.id, agent.id, ordinary)
    const clear = { pep: false, highRiskCountry: false, cash: false, actingForAnother: false, unusual: false }
    await assessRisk(started.id, agent.id, clear)
    const { contentHash } = await completeCase(started.id, agent.id)

    const model = await cddRecordModel(started.id, agent.id)
    expect(model).toMatchObject({ contentHash, verified: true, clientRole: 'Tenant' })
    const text = (await pdfPageTexts(await renderToBuffer(<CddRecordDocument model={model} />))).join(' ')
    for (const expected of [
      'Customer due diligence record', model.reference, 'Tan Wei Ming', 'NRIC *****567D', 'Original document seen by',
      'UN Security Council Consolidated List', 'Politically exposed persons, Dilisense', 'No possible match on any source',
      'Standard risk', 'Completed and locked', contentHash, 'it matches, so nothing has changed since completion',
    ]) expect(text, expected).toContain(expected)
    expect(text).not.toContain('S1234567D')

    // A row changed after completion is caught by the receipt itself.
    await db.cddParticulars.update({ where: { caseId: started.id }, data: { address: '2 Orchard Road' } })
    expect((await cddRecordModel(started.id, agent.id)).verified).toBe(false)
    await expect(cddRecordModel(started.id, (await person('Agent Outsider')).id)).rejects.toThrow('Case not found')
  })

  it('starts both parties’ checks from a tenancy once, as the people already on it, and reports them per party', async () => {
    const agent = await person('Agent Tenancy')
    const landlord = await person('Landlord Tenancy')
    const tenant = await db.stakeholder.create({ data: { name: `Tenant without email ${tag}` } })
    people.push(tenant.id)
    const property = await db.property.create({ data: { line1: '8 Jalan Kayu', postalCode: '799487', type: 'HDB' } })
    properties.push(property.id)
    const tenancy = await db.tenancy.create({
      data: {
        propertyId: property.id, landlordId: landlord.id, tenantId: tenant.id, agentId: agent.id,
        startDate: new Date('2026-11-01'), endDate: new Date('2027-10-31'), monthlyRent: 3000, deposit: 6000,
      },
    })
    tenancies.push(tenancy.id)

    await expect(verifyTenancyParties((await person('Agent Elsewhere')).id, tenancy.id)).rejects.toThrow('Tenancy not found')
    const started = await verifyTenancyParties(agent.id, tenancy.id)
    expect(started.map((each) => each.role)).toEqual(['LANDLORD', 'TENANT'])
    expect(await verifyTenancyParties(agent.id, tenancy.id)).toEqual([])

    const cases = await db.cddCase.findMany({ where: { tenancyId: tenancy.id }, orderBy: { clientRole: 'asc' } })
    expect(cases.map((found) => [found.clientRole, found.clientId, found.propertyId])).toEqual([
      ['LANDLORD', landlord.id, property.id],
      ['TENANT', tenant.id, property.id],
    ])
    const checks = (await partyChecks([tenancy.id], agent.id)).get(tenancy.id)!
    // Emailed where there is an address; the tenant has none, so the agent shares the link.
    expect(checks.landlord).toMatchObject({ status: 'WAITING_FOR_CLIENT', requestedAt: expect.any(Date) })
    expect(checks.tenant).toMatchObject({ status: 'WAITING_FOR_CLIENT', requestedAt: null })
    expect((await partyChecks([tenancy.id], (await person('Agent Nosy')).id)).get(tenancy.id)).toEqual({ landlord: null, tenant: null })
  })

  it('reminds a client who has not answered a day later, again two days after, then stops', async () => {
    const agent = await person('Agent Remind')
    const client = await person('Client Remind')
    const walkIn = await startDeal(agent.id, { clientName: 'Walk-in Eleven', clientRole: 'LANDLORD' })
    const started = await startDeal(agent.id, { clientName: client.name, clientEmail: client.email, clientRole: 'TENANT' })
    const hours = (n: number) => new Date(Date.now() + n * 60 * 60 * 1000)
    const ours = async (at: Date) => (await sendDueReminders(at)).filter((id) => id === started.id || id === walkIn.id)

    expect(await ours(hours(30)), 'never asked yet').toEqual([])
    await requestParticulars(started.id, agent.id)
    expect(await ours(hours(23))).toEqual([])
    expect(await ours(hours(25))).toEqual([started.id])
    expect(await ours(hours(26)), 'the next one counts from this reminder').toEqual([])
    expect(await ours(hours(25 + 49))).toEqual([started.id])
    expect(await ours(hours(500)), 'two reminders, then none').toEqual([])

    const notices = await db.notification.findMany({ where: { recipientId: client.id, kind: 'CDD_REQUEST' }, orderBy: { createdAt: 'asc' } })
    expect(notices.map((notice) => notice.title.startsWith('Reminder: '))).toEqual([false, true, true])
    expect(await caseCounts(agent.id)).toEqual({ needsYou: 0, waiting: 2 })
  })
})
