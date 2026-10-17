import { afterAll, describe, expect, it, vi } from 'vitest'
import { randomUUID } from 'node:crypto'
import { db } from '@/lib/db'
import { pruneProductEvents, recordProductEvents } from '@/lib/product-events'
import { adminUsage } from '@/lib/admin-usage'

vi.mock('@/lib/admin', () => ({ requireAdmin: vi.fn() }))

const ids: string[] = []

afterAll(async () => {
  await db.stakeholder.deleteMany({ where: { id: { in: ids } } })
  await db.$disconnect()
})

describe('usage events', () => {
  it('stamps authenticated identity, deduplicates replay and caps a future clock', async () => {
    const agent = await db.stakeholder.create({ data: { name: 'Usage test' } })
    ids.push(agent.id)
    const event = { id: randomUUID(), name: 'screen_viewed', properties: { screen: 'capture' }, occurredAt: '2099-01-01T00:00:00.000Z' }
    expect(await recordProductEvents(agent.id, { source: 'ANDROID', events: [event] })).toBe(1)
    expect(await recordProductEvents(agent.id, { source: 'ANDROID', events: [event] })).toBe(0)
    const saved = await db.productEvent.findUniqueOrThrow({ where: { id: event.id } })
    expect(saved).toMatchObject({ stakeholderId: agent.id, source: 'ANDROID', properties: { screen: 'capture' } })
    expect(saved.occurredAt.getTime()).toBeLessThanOrEqual(Date.now())
    await db.stakeholder.delete({ where: { id: agent.id } })
    expect(await db.productEvent.count({ where: { stakeholderId: agent.id } })).toBe(0)
  })

  it('prunes after 90 days while keeping recent events', async () => {
    const agent = await db.stakeholder.create({ data: { name: 'Usage retention test' } })
    ids.push(agent.id)
    const now = new Date()
    const recent = randomUUID()
    const old = randomUUID()
    await db.productEvent.createMany({ data: [
      { id: recent, source: 'WEB', name: 'screen_viewed', properties: { screen: 'account' }, stakeholderId: agent.id, occurredAt: now },
      { id: old, source: 'WEB', name: 'screen_viewed', properties: { screen: 'account' }, stakeholderId: agent.id, occurredAt: now, createdAt: new Date(now.getTime() - 91 * 86_400_000) },
    ] })
    await pruneProductEvents(now)
    expect(await db.productEvent.findUnique({ where: { id: old } })).toBeNull()
    expect(await db.productEvent.findUnique({ where: { id: recent } })).not.toBeNull()
    const usage = await adminUsage(now)
    expect(usage.active).toBeGreaterThanOrEqual(1)
    expect(usage.screens.find((row) => (row.properties as { screen: string }).screen === 'account')?._count).toBeGreaterThanOrEqual(1)
  })
})
