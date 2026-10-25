import { randomUUID } from 'node:crypto'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { User } from '@supabase/supabase-js'

const request = vi.hoisted(() => ({ getUser: vi.fn(), cookie: undefined as string | undefined }))
vi.mock('next/headers', () => ({
  headers: async () => new Headers(),
  cookies: async () => ({ get: () => request.cookie ? { value: request.cookie } : undefined }),
}))
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ auth: { getUser: request.getUser } }) }))
vi.mock('@/lib/supabase/server', () => ({ supabaseServer: async () => ({ auth: { getUser: request.getUser } }) }))

import { db } from '@/lib/db'
import { agentFromBearer, currentStakeholder } from '@/lib/auth'

const emails: string[] = []

function verifiedUser(overrides: Partial<User> = {}): User {
  const email = `acquisition-${randomUUID()}@kivilo.test`
  emails.push(email)
  return {
    id: randomUUID(), email, app_metadata: {}, user_metadata: {}, aud: 'authenticated',
    created_at: new Date().toISOString(), email_confirmed_at: new Date().toISOString(),
    ...overrides,
  }
}

function authenticated(user: User | null) {
  request.getUser.mockResolvedValue({ data: { user }, error: null })
}

beforeEach(() => {
  request.cookie = undefined
  request.getUser.mockReset()
})

afterAll(async () => {
  await db.stakeholder.deleteMany({ where: { email: { in: emails } } })
  await db.$disconnect()
})

describe('verified account acquisition', () => {
  it('records verified Auth time and native entry point exactly once', async () => {
    const user = verifiedUser()
    authenticated(user)
    const person = await agentFromBearer('Bearer verified-token')
    const first = await db.accountAcquisition.findUniqueOrThrow({ where: { stakeholderId: person!.id } })
    expect(first).toMatchObject({
      verifiedAt: new Date(user.email_confirmed_at!), source: 'unattributed', entryPoint: 'NATIVE',
      excluded: true, firstCompletedReportAt: null, firstPaidAt: null,
    })
    await agentFromBearer('Bearer verified-token')
    expect(await db.accountAcquisition.findUnique({ where: { stakeholderId: person!.id } })).toEqual(first)
  })

  it('claims an old person without changing the verified date of their historical Auth account', async () => {
    const user = verifiedUser({ email_confirmed_at: '2025-01-02T03:04:05.000Z' })
    const person = await db.stakeholder.create({
      data: { name: 'Existing party', email: user.email, createdAt: new Date('2024-01-01') },
    })
    request.cookie = encodeURIComponent(JSON.stringify({
      source: 'google', medium: 'organic', campaign: null, landing: '/product', capturedAt: Date.now(),
    }))
    authenticated(user)
    expect((await currentStakeholder())?.id).toBe(person.id)
    expect(await db.accountAcquisition.findUnique({ where: { stakeholderId: person.id } })).toMatchObject({
      verifiedAt: new Date('2025-01-02T03:04:05.000Z'), source: 'unattributed', landing: null,
    })
  })

  it('records browser attribution at first linking and preserves it on later sign-ins', async () => {
    const user = verifiedUser()
    authenticated(user)
    request.cookie = encodeURIComponent(JSON.stringify({
      source: 'google', medium: 'organic', campaign: null, landing: '/product', capturedAt: Date.now(),
    }))
    const person = await currentStakeholder()
    expect(await db.accountAcquisition.findUnique({ where: { stakeholderId: person!.id } })).toMatchObject({
      source: 'google', medium: 'organic', landing: '/product', entryPoint: 'WEB',
    })
    request.cookie = undefined
    await currentStakeholder()
    expect(await db.accountAcquisition.findUnique({ where: { stakeholderId: person!.id } })).toMatchObject({ source: 'google' })
  })

  it('never backfills an already linked account as a new signup', async () => {
    const user = verifiedUser()
    const person = await db.stakeholder.create({ data: { name: 'Already linked', email: user.email, authUserId: user.id } })
    authenticated(user)
    expect((await agentFromBearer('Bearer verified-token'))?.id).toBe(person.id)
    expect(await db.accountAcquisition.count({ where: { stakeholderId: person.id } })).toBe(0)
  })

  it.each([false, true])('handles concurrent first linking with existing person = %s', async (claim) => {
    const user = verifiedUser()
    const prior = claim ? await db.stakeholder.create({ data: { name: 'Invited party', email: user.email } }) : null
    authenticated(user)
    const people = await Promise.all(Array.from({ length: 8 }, () => agentFromBearer('Bearer verified-token')))
    expect(new Set(people.map((person) => person!.id)).size).toBe(1)
    if (prior) expect(people[0]!.id).toBe(prior.id)
    expect(await db.accountAcquisition.count({ where: { stakeholderId: people[0]!.id } })).toBe(1)
    expect(await db.stakeholder.count({ where: { authUserId: user.id } })).toBe(1)
  })

  it('does not take over another linked identity with the same email', async () => {
    const user = verifiedUser()
    const originalAuthId = randomUUID()
    const person = await db.stakeholder.create({ data: { name: 'Linked elsewhere', email: user.email, authUserId: originalAuthId } })
    authenticated(user)
    await expect(agentFromBearer('Bearer verified-token')).rejects.toThrow()
    expect((await db.stakeholder.findUniqueOrThrow({ where: { id: person.id } })).authUserId).toBe(originalAuthId)
    expect(await db.accountAcquisition.count({ where: { stakeholderId: person.id } })).toBe(0)
  })

  it.each([undefined, 'invalid', '2099-01-01T00:00:00.000Z'])('does not invent a signup without a valid past verification time (%s)', async (email_confirmed_at) => {
    authenticated(verifiedUser({ email_confirmed_at }))
    const person = await agentFromBearer('Bearer verified-token')
    expect(person).not.toBeNull()
    expect(await db.accountAcquisition.count({ where: { stakeholderId: person!.id } })).toBe(0)
  })

  it('does not create an account for an unverified bearer', async () => {
    authenticated(null)
    expect(await agentFromBearer('Bearer invalid-token')).toBeNull()
  })
})
