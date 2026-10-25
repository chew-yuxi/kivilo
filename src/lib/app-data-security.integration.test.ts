import { randomUUID } from 'node:crypto'
import { afterAll, describe, expect, it } from 'vitest'
import { Prisma } from '@/generated/prisma'
import { db } from '@/lib/db'

afterAll(async () => { await db.$disconnect() })

describe('server-only application tables', () => {
  it('protects every Prisma model and migration history from public client roles', async () => {
    // Derive the contract from the models, not the migration list: a future model must
    // explicitly secure its table too. Honor @@map if a model later names a different table.
    const expected = [...Prisma.dmmf.datamodel.models.map((model) => model.dbName ?? model.name), '_prisma_migrations'].sort()
    const tables = await db.$queryRaw<{
      table: string; rlsEnabled: boolean; anonPrivileges: boolean; authenticatedPrivileges: boolean
    }[]>`
      SELECT c.relname AS "table", c.relrowsecurity AS "rlsEnabled",
        has_table_privilege('anon', c.oid,
          'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN') AS "anonPrivileges",
        has_table_privilege('authenticated', c.oid,
          'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN') AS "authenticatedPrivileges"
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname IN (${Prisma.join(expected)})
      ORDER BY c.relname
    `
    expect(tables.map((table) => table.table).sort()).toEqual(expected)
    for (const table of tables) {
      expect(table, table.table).toMatchObject({
        rlsEnabled: true, anonPrivileges: false, authenticatedPrivileges: false,
      })
    }
    // The same server connection still reads migration history after its privileges change.
    const [history] = await db.$queryRaw<{ count: number }[]>`
      SELECT count(*)::int AS "count" FROM public._prisma_migrations WHERE finished_at IS NOT NULL
    `
    expect(history.count).toBeGreaterThan(0)
  })

  it.each(['anon', 'authenticated'] as const)('denies %s access to people, reports and captures', async (role) => {
    for (const table of ['Stakeholder', 'Inspection', 'Capture'] as const) {
      const statements = [
        `SELECT "id" FROM public."${table}" LIMIT 0`,
        `INSERT INTO public."${table}" DEFAULT VALUES`,
        `UPDATE public."${table}" SET "id" = "id" WHERE false`,
        `DELETE FROM public."${table}" WHERE false`,
      ]
      for (const statement of statements) {
        // Only fixed identifiers above enter these statements. No records are read or
        // changed even if a privilege regresses; insertion cannot satisfy required fields.
        await expect(db.$transaction(async (tx) => {
          await tx.$executeRawUnsafe(`SET LOCAL ROLE "${role}"`)
          return tx.$executeRawUnsafe(statement)
        }), `${role}: ${statement}`).rejects.toThrow(`permission denied for table ${table}`)
      }
    }
  })

  it('creates future tables without client privileges under the Prisma database owner', async () => {
    const name = `server_only_probe_${randomUUID().replaceAll('-', '')}`
    const rollback = new Error('Roll back the temporary privilege probe')
    await expect(db.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`CREATE TABLE public."${name}" (id integer)`)
      const [privileges] = await tx.$queryRaw<{ anon: boolean; authenticated: boolean }[]>`
        SELECT has_table_privilege('anon', ${`public."${name}"`}::regclass,
          'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN') AS "anon",
          has_table_privilege('authenticated', ${`public."${name}"`}::regclass,
          'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN') AS "authenticated"
      `
      expect(privileges).toEqual({ anon: false, authenticated: false })
      throw rollback
    })).rejects.toBe(rollback)
    const [probe] = await db.$queryRaw<{ absent: boolean }[]>`
      SELECT to_regclass(${`public."${name}"`}) IS NULL AS "absent"
    `
    expect(probe.absent).toBe(true)
  })
})
