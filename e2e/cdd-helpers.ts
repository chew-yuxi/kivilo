import { readFileSync } from 'node:fs'
import path from 'node:path'
import { db } from '../src/lib/db'
import { parseTsfaFirstSchedule } from '../src/lib/screening/sg-tsfa'
import { parseUnConsolidated } from '../src/lib/screening/un-list'

const fixture = (name: string) => readFileSync(path.join(process.cwd(), 'src/lib/screening/fixtures', name), 'utf8')

/// Screening refuses to run without both lists; load the test fixtures if none are loaded.
export async function ensureSanctionsLists() {
  if ((await db.sanctionsList.count()) > 0) return
  for (const [source, list] of [
    ['UN', parseUnConsolidated(fixture('un-consolidated-sample.xml'))],
    ['SG', parseTsfaFirstSchedule(fixture('sg-tsfa-first-schedule.html'))],
  ] as const) {
    await db.sanctionsList.create({
      data: { source, checksum: `e2e-${source}`, publishedAt: list.generatedAt, entryCount: list.entries.length, entries: list.entries },
    })
  }
}

/// Due-diligence records block deleting the people they name (they are kept five years),
/// so a test removes its own cases before anything cleans up test accounts.
export async function removeCases(where: { caseIds?: string[]; people?: string[] }) {
  const cases = await db.cddCase.findMany({
    where: { OR: [{ id: { in: where.caseIds ?? [] } }, { agentId: { in: where.people ?? [] } }, { clientId: { in: where.people ?? [] } }] },
    select: { id: true },
  })
  const ids = cases.map((found) => found.id)
  await db.screeningCandidate.deleteMany({ where: { run: { caseId: { in: ids } } } })
  await db.screeningRun.deleteMany({ where: { caseId: { in: ids } } })
  await db.cddEvent.deleteMany({ where: { caseId: { in: ids } } })
  await db.cddParticulars.deleteMany({ where: { caseId: { in: ids } } })
  await db.cddCase.deleteMany({ where: { id: { in: ids } } })
}
