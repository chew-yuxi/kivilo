import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { db } from '@/lib/db'
import { parseTsfaFirstSchedule } from '@/lib/screening/sg-tsfa'
import { parseUnConsolidated } from '@/lib/screening/un-list'
import { notificationScope } from '@/lib/auth'
import {
  caseForAgent, caseForClient, decideCandidate, particularsStillWanted, requestParticulars, rescreen, startDeal,
  submitOwnParticulars, submitParticularsInPerson, type Particulars,
} from './cases'

const tag = randomUUID().slice(0, 8)
const people: string[] = []
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

beforeAll(async () => {
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
  await db.cddParticulars.deleteMany({ where: { caseId: { in: ids } } })
  await db.cddCase.deleteMany({ where: { id: { in: ids } } })
  await db.sanctionsList.deleteMany()
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
    expect((view.screeningRuns[0].listVersions as { source: string }[]).map((version) => version.source)).toEqual(['UN', 'SG'])
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
      'agencyLicence', 'agencyName', 'agentName', 'ceaRegistration', 'clientRole', 'id', 'logoPath',
      'property', 'reference', 'submitted', 'submittedAt',
    ])
    expect(JSON.parse(seen)).toMatchObject({ id: started.id, agentName: agent.name, clientRole: 'TENANT', submitted: true })
    for (const word of ['NEEDS_REVIEW', 'TSFA', 'Latiff', 'match', 'screen']) expect(seen).not.toContain(word)
  })

  it('records the agent’s reasoned, final decision, and escalates a confirmed match', async () => {
    const agent = await person('Agent Five')
    const started = await startDeal(agent.id, { clientName: 'Walk-in Five', clientRole: 'LANDLORD' })
    await submitParticularsInPerson(started.id, agent.id, { ...ordinary, legalName: 'Tan Jun Jie', dateOfBirth: '2007-03-19' })
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

