import { randomUUID } from 'node:crypto'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

type Alerted = { count: number; latest: { message: string } }[]
const { sendErrorAlert } = vi.hoisted(() => ({
  sendErrorAlert: vi.fn<(to: string, errors: Alerted) => Promise<void>>(async () => {}),
}))
vi.mock('@/lib/email', () => ({ sendErrorAlert }))

import { db } from '@/lib/db'
import { alertNewErrors, recordClientErrors, recordServerError } from '@/lib/errors'

const tag = randomUUID()
let agentId: string

function report(message: string, overrides: Record<string, unknown> = {}) {
  return {
    id: randomUUID(),
    context: 'window',
    name: 'TypeError',
    message,
    stack: `TypeError: ${message}\n    at onClick (app.js:1:2)`,
    path: '/inspections/cmgp1k2ab0000l70812345678?tab=rooms',
    release: 'test',
    occurredAt: new Date().toISOString(),
    ...overrides,
  }
}

/// Alerts sent this run for this file's errors, whatever else is pending in the shared
/// local database.
function alerted() {
  return sendErrorAlert.mock.calls.flatMap(([, errors]) =>
    errors.filter((error) => error.latest.message.includes(tag)))
}

beforeEach(async () => {
  vi.stubEnv('ERROR_ALERT_TO', 'operator@kivilo.test')
  sendErrorAlert.mockClear()
  agentId ??= (await db.stakeholder.create({ data: { name: `Errors ${tag}` } })).id
})

afterAll(async () => {
  vi.unstubAllEnvs()
  await db.errorEvent.deleteMany({ where: { message: { contains: tag } } })
  await db.stakeholder.deleteMany({ where: { name: `Errors ${tag}` } })
  await db.$disconnect()
})

describe('error tracking', () => {
  it('records a retried batch once, attributed, with no query string and no future time', async () => {
    const future = report(`clock ${tag}`, { occurredAt: '2099-01-01T00:00:00.000Z' })
    const batch = { errors: [report(`retried ${tag}`), future] }

    expect(await recordClientErrors(agentId, batch, 'Mozilla/5.0 test')).toBe(2)
    expect(await recordClientErrors(agentId, batch, 'Mozilla/5.0 test')).toBe(0)

    const rows = await db.errorEvent.findMany({ where: { message: { contains: tag } } })
    expect(rows).toHaveLength(2)
    expect(rows.every((row) => row.source === 'WEB' && row.stakeholderId === agentId)).toBe(true)
    expect(rows[0].path).toBe('/inspections/cmgp1k2ab0000l70812345678')
    expect(rows.find((row) => row.id === future.id)!.occurredAt.getTime()).toBeLessThanOrEqual(Date.now())
  })

  it('records reports from the app under its platform, with no path and no token', async () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4In0.c2lnbmF0dXJl'
    const caught = report(`app ${tag} at https://s.example/sign/a.jpg?token=${jwt}`, {
      context: 'caught',
      name: '_TypeError',
      path: null,
      stack: `#0 main (package:kivilo/main.dart:1:2) token=${jwt}`,
      // Dart's toIso8601String carries microseconds.
      occurredAt: '2026-10-14T01:02:03.123456Z',
    })
    expect(await recordClientErrors(agentId, { source: 'IOS', errors: [caught] }, 'Dart/3.9 (dart:io)')).toBe(1)

    const row = await db.errorEvent.findUniqueOrThrow({ where: { id: caught.id } })
    expect(row).toMatchObject({ source: 'IOS', context: 'caught', path: null, release: 'test' })
    expect(row.message).not.toContain(jwt)
    expect(row.stack).not.toContain(jwt)
  })

  it('refuses a batch that is not reports, rather than storing it', async () => {
    await expect(recordClientErrors(agentId, { errors: [{ message: tag }] }, null)).rejects.toThrow()
    await expect(recordClientErrors(agentId, { errors: [] }, null)).rejects.toThrow()
  })

  it('records a server error with its digest and the report token redacted', async () => {
    const error = Object.assign(new Error(`render ${tag}`), { digest: '1234567890' })
    await recordServerError(error, { context: 'render', path: '/reports/secret-token?x=1', userAgent: null })

    const row = await db.errorEvent.findFirstOrThrow({ where: { message: `render ${tag}` } })
    expect(row).toMatchObject({ source: 'SERVER', context: 'render', digest: '1234567890', path: '/reports/:token' })
  })

  it('emails each kind of error once, however often it recurs', async () => {
    const first = `first ${tag}`
    await recordClientErrors(agentId, { errors: [report(first), report(first)] }, null)
    await alertNewErrors()

    const once = alerted().filter((error) => error.latest.message === first)
    expect(once).toHaveLength(1)
    expect(once[0].count).toBe(2)
    expect(await db.errorEvent.count({ where: { message: { contains: tag }, notifiedAt: null } })).toBe(0)

    sendErrorAlert.mockClear()
    await recordClientErrors(agentId, { errors: [report(first)] }, null)
    const second = `second ${tag}`
    await recordClientErrors(agentId, { errors: [report(second)] }, null)
    await alertNewErrors()

    expect(alerted().map((error) => error.latest.message)).toEqual([second])
    expect(await db.errorEvent.count({ where: { message: { contains: tag }, notifiedAt: null } })).toBe(0)
  })

  it('deletes errors after 90 days', async () => {
    const old = report(`old ${tag}`)
    await recordClientErrors(agentId, { errors: [old] }, null)
    await db.errorEvent.update({ where: { id: old.id }, data: { createdAt: new Date(Date.now() - 91 * 86_400_000) } })

    await alertNewErrors()
    expect(await db.errorEvent.findUnique({ where: { id: old.id } })).toBeNull()
  })
})
