import { test, expect } from '@playwright/test'
import { accessTokenFor, freshEmail } from './helpers'
import { ensureSanctionsLists, removeCases } from './cdd-helpers'
import { db } from '../src/lib/db'

const emails: string[] = []

test.afterAll(async () => {
  const people = await db.stakeholder.findMany({ where: { email: { in: emails } }, select: { id: true } })
  await removeCases({ people: people.map((person) => person.id) })
})

/// The app's due-diligence API, driven with a bearer token and no browser, like the
/// Flutter client: start a deal, ask the client, take particulars in person, review the
/// match the screening found, and decide it. Another agent cannot see or touch the case.
test('an agent runs due diligence through the app API, and nobody else can', async ({ request }) => {
  await ensureSanctionsLists()
  const agentEmail = freshEmail('cdd-api-agent')
  const strangerEmail = freshEmail('cdd-api-stranger')
  const clientEmail = freshEmail('cdd-api-client')
  emails.push(agentEmail, strangerEmail, clientEmail)
  const agent = { Authorization: `Bearer ${await accessTokenFor(agentEmail)}` }
  const stranger = { Authorization: `Bearer ${await accessTokenFor(strangerEmail)}` }

  const invalid = await request.post('/api/v1/cdd', { headers: agent, data: { clientName: 'X', clientRole: 'OWNER' } })
  expect(invalid.status()).toBe(400)
  const created = await request.post('/api/v1/cdd', {
    headers: agent,
    data: { clientName: 'Tan Jun Jie', clientEmail, clientRole: 'TENANT' },
  })
  expect(created.ok()).toBe(true)
  const { id } = await created.json()

  const list = await (await request.get('/api/v1/cdd', { headers: agent })).json()
  expect(list.cases).toEqual([expect.objectContaining({ id, status: 'WAITING_FOR_CLIENT', clientName: 'Tan Jun Jie', openMatches: 0 })])

  const asked = await (await request.post(`/api/v1/cdd/${id}/request`, { headers: agent })).json()
  expect(asked).toEqual({ url: `http://localhost:3111/cdd/${id}?email=${encodeURIComponent(clientEmail)}`, emailed: true })

  const inPerson = {
    legalName: 'Tan Jun Jie', idType: 'NRIC', idNumber: 'T0712345B', nationality: 'Singapore',
    dateOfBirth: '2007-03-19', address: '2 Jurong East Street 21', pepDeclared: false,
  }
  expect((await request.post(`/api/v1/cdd/${id}/particulars`, { headers: agent, data: inPerson })).ok()).toBe(true)
  const again = await request.post(`/api/v1/cdd/${id}/particulars`, { headers: agent, data: inPerson })
  expect(again.status()).toBe(409)
  expect(await again.json()).toEqual({ error: 'invalid_state', message: 'Particulars are already in' })

  const view = await (await request.get(`/api/v1/cdd/${id}`, { headers: agent })).json()
  expect(view).toMatchObject({ status: 'NEEDS_REVIEW', particulars: { idNumber: '*****345B', idSighted: true } })
  expect(JSON.stringify(view)).not.toContain('T0712345B')
  const [match] = view.screeningRuns[0].candidates
  expect(match).toMatchObject({ source: 'SG', reference: 'TSFA First Schedule 2(zzb)', decision: null })

  expect((await request.get(`/api/v1/cdd/${id}`, { headers: stranger })).status()).toBe(404)
  const meddling = await request.post(`/api/v1/cdd/matches/${match.id}/decision`, {
    headers: stranger, data: { decision: 'NOT_A_MATCH', reason: 'Not them' },
  })
  expect(meddling.status()).toBe(404)
  expect(await meddling.json()).toEqual({ error: 'not_found' })

  const unexplained = await request.post(`/api/v1/cdd/matches/${match.id}/decision`, {
    headers: agent, data: { decision: 'CONFIRMED_MATCH', reason: ' ' },
  })
  expect(unexplained.status()).toBe(400)
  expect(await unexplained.json()).toEqual({ error: 'invalid_input', message: 'Give the reason for this decision' })
  const decided = await request.post(`/api/v1/cdd/matches/${match.id}/decision`, {
    headers: agent, data: { decision: 'CONFIRMED_MATCH', reason: 'Same name and date of birth as the designation' },
  })
  expect(decided.ok()).toBe(true)
  expect((await (await request.get(`/api/v1/cdd/${id}`, { headers: agent })).json()).status).toBe('ESCALATED')
  expect((await (await request.get('/api/v1/cdd', { headers: agent })).json()).cases[0]).toMatchObject({ id, status: 'ESCALATED', openMatches: 0 })
})
