import { randomUUID } from 'node:crypto'
import { afterAll, describe, expect, it } from 'vitest'
import { db } from '@/lib/db'

const people: string[] = []

async function person() {
  const created = await db.stakeholder.create({ data: {
    name: 'Acquisition security test', email: `acquisition-security-${randomUUID()}@kivilo.test`,
  } })
  people.push(created.id)
  return created
}

afterAll(async () => {
  await db.stakeholder.deleteMany({ where: { id: { in: people } } })
  await db.$disconnect()
})

describe('server-only acquisition storage', () => {
  it('enables RLS with no client policies and removes all client table privileges', async () => {
    const [security] = await db.$queryRaw<{
      rlsEnabled: boolean; policyCount: number; anonPrivileges: boolean; authenticatedPrivileges: boolean
    }[]>`
      SELECT c.relrowsecurity AS "rlsEnabled",
        (SELECT count(*)::int FROM pg_policy p WHERE p.polrelid = c.oid) AS "policyCount",
        has_table_privilege('anon', c.oid,
          'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN') AS "anonPrivileges",
        has_table_privilege('authenticated', c.oid,
          'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN') AS "authenticatedPrivileges"
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'AccountAcquisition'
    `
    expect(security).toEqual({
      rlsEnabled: true, policyCount: 0, anonPrivileges: false, authenticatedPrivileges: false,
    })
  })

  it('keeps normal Prisma create, read, update and delete access', async () => {
    const owner = await person()
    await db.accountAcquisition.create({ data: {
      stakeholderId: owner.id, verifiedAt: new Date(), source: 'direct', entryPoint: 'WEB', excluded: true,
    } })
    expect(await db.accountAcquisition.findUniqueOrThrow({ where: { stakeholderId: owner.id } }))
      .toMatchObject({ source: 'direct', campaign: null })
    await db.accountAcquisition.update({ where: { stakeholderId: owner.id }, data: { campaign: 'server-update' } })
    expect((await db.accountAcquisition.findUniqueOrThrow({ where: { stakeholderId: owner.id } })).campaign)
      .toBe('server-update')
    await db.accountAcquisition.delete({ where: { stakeholderId: owner.id } })
    expect(await db.accountAcquisition.findUnique({ where: { stakeholderId: owner.id } })).toBeNull()
  })

  it.each(['anon', 'authenticated'] as const)('refuses reads and writes as the %s Data API role', async (role) => {
    const owner = await person()
    const empty = await person()
    await db.accountAcquisition.create({ data: {
      stakeholderId: owner.id, verifiedAt: new Date(), source: 'direct', entryPoint: 'WEB', excluded: true,
    } })
    // SET LOCAL cannot leak to another request on the connection pool. Each refusal
    // gets its own transaction because Postgres aborts the transaction on permission errors.
    for (const command of ['select', 'insert', 'update', 'delete'] as const) {
      await expect(db.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`SET LOCAL ROLE "${role}"`)
        switch (command) {
          case 'select':
            return tx.$queryRaw`SELECT "source" FROM public."AccountAcquisition" WHERE "stakeholderId" = ${owner.id}`
          case 'insert':
            return tx.$executeRaw`
              INSERT INTO public."AccountAcquisition" ("stakeholderId", "verifiedAt", "source", "entryPoint")
              VALUES (${empty.id}, CURRENT_TIMESTAMP, 'forged', 'WEB')
            `
          case 'update':
            return tx.$executeRaw`UPDATE public."AccountAcquisition" SET "source" = 'forged' WHERE "stakeholderId" = ${owner.id}`
          case 'delete':
            return tx.$executeRaw`DELETE FROM public."AccountAcquisition" WHERE "stakeholderId" = ${owner.id}`
        }
      })).rejects.toThrow(/permission denied for table AccountAcquisition/)
    }
    expect((await db.accountAcquisition.findUniqueOrThrow({ where: { stakeholderId: owner.id } })).source).toBe('direct')
    expect(await db.accountAcquisition.findUnique({ where: { stakeholderId: empty.id } })).toBeNull()
  })
})
