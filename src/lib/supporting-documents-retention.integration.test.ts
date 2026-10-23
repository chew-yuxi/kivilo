import { randomUUID } from 'node:crypto'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { db } from '@/lib/db'
import { propertyManagement } from '@/lib/property-management'
import { purgeExpiredProperty } from '@/lib/property-trash'
import { purgeStorageEntry } from '@/lib/storage-purge'
import { retireSoleSupportingDocuments } from '@/lib/supporting-documents-retention'

const properties: string[] = []
const people: string[] = []
const paths: string[] = []

async function fixture(shared = false, submitted = false) {
  const agent = await db.stakeholder.create({ data: { name: `Document owner ${randomUUID()}` } })
  people.push(agent.id)
  const tenant = shared ? await db.stakeholder.create({ data: { name: 'Document tenant' } }) : agent
  if (shared) people.push(tenant.id)
  const property = await db.property.create({ data: { line1: 'Document lifecycle test', postalCode: '999999', type: 'HDB' } })
  properties.push(property.id)
  const tenancy = await db.tenancy.create({ data: {
    propertyId: property.id, agentId: agent.id, landlordId: agent.id, tenantId: tenant.id,
    startDate: new Date('2026-01-01'), endDate: new Date('2027-01-01'), monthlyRent: '1000', deposit: '1000',
  } })
  const request = await db.supportingDocumentRequest.create({ data: {
    tenancyId: tenancy.id, clientId: randomUUID(), title: 'Payment proof', requestedById: agent.id,
  } })
  const prefix = `supporting-documents/${tenancy.id}/${request.id}`
  const path = `${prefix}/${randomUUID()}.pdf`
  paths.push(prefix, path)
  const file = await db.supportingDocumentFile.create({ data: {
    requestId: request.id, clientId: randomUUID(), storagePath: path, fileName: 'receipt.pdf',
    mimeType: 'application/pdf', byteSize: 16, submittedById: tenant.id,
    submittedAt: submitted ? new Date() : null,
  } })
  return { agent, tenant, property, tenancy, request, file, prefix }
}

afterAll(async () => {
  await db.property.deleteMany({ where: { id: { in: properties } } })
  await db.stakeholder.deleteMany({ where: { id: { in: people } } })
  await db.storagePurge.deleteMany({ where: { path: { in: paths } } })
  await db.$disconnect()
})

describe('supporting document retention', () => {
  it('preserves submitted tenancy paperwork when property deletion is requested', async () => {
    const row = await fixture(true, true)
    const management = await propertyManagement(row.property.id, row.agent.id)
    expect(management.canDelete).toBe(false)
    expect(management.deleteBlockedReason).toContain('supporting documents')
    await db.property.update({ where: { id: row.property.id }, data: { trashedAt: new Date(0), trashExpiresAt: new Date(0) } })
    expect(await purgeExpiredProperty(row.property.id)).toBe('protected')
    expect(await db.supportingDocumentFile.findUnique({ where: { id: row.file.id } })).toBeTruthy()
  })

  it('keeps pending uploads recoverable until property expiry, then records a delayed prefix purge', async () => {
    const row = await fixture(true)
    expect((await propertyManagement(row.property.id, row.agent.id)).canDelete).toBe(true)
    await db.property.update({ where: { id: row.property.id }, data: {
      trashedAt: new Date(), trashExpiresAt: new Date(Date.now() + 86400_000),
    } })
    expect(await purgeExpiredProperty(row.property.id)).toBe('not_due')
    expect(await db.supportingDocumentFile.findUnique({ where: { id: row.file.id } })).toBeTruthy()
    await db.property.update({ where: { id: row.property.id }, data: { trashExpiresAt: new Date(0) } })
    expect(await purgeExpiredProperty(row.property.id)).toBe('deleted')
    expect(await db.supportingDocumentRequest.findUnique({ where: { id: row.request.id } })).toBeNull()
    const purge = await db.storagePurge.findUniqueOrThrow({ where: { path: row.prefix } })
    expect(purge.isPrefix).toBe(true)
    expect(purge.readyAt.getTime()).toBeGreaterThan(Date.now() + 2 * 3600_000)
  })

  it('refuses both individual and prefix purges while even a pending document owns the bytes', async () => {
    const row = await fixture()
    for (const [path, isPrefix] of [[row.prefix, true], [row.file.storagePath, false]] as const) {
      const purge = await db.storagePurge.create({ data: {
        path, isPrefix, readyAt: new Date(0), createdAt: new Date(Date.now() - 4 * 3600_000),
      } })
      await expect(purgeStorageEntry(purge)).rejects.toThrow('still belongs')
      expect((await db.storagePurge.findUniqueOrThrow({ where: { id: purge.id } })).completedAt).toBeNull()
    }
  })

  it('deletes only sole-party unsigned paperwork during account deletion and preserves shared documents', async () => {
    const sole = await fixture(false, true)
    const shared = await fixture(true, true)
    const clause = { quote: 'Private agreement excerpt', confirmedBy: { id: sole.agent.id, name: sole.agent.name } }
    await db.tenancy.update({ where: { id: sole.tenancy.id }, data: { minorRepairClause: clause } })
    await db.tenancy.update({ where: { id: shared.tenancy.id }, data: { minorRepairClause: clause } })
    await retireSoleSupportingDocuments(sole.agent.id)
    expect(await db.supportingDocumentRequest.findUnique({ where: { id: sole.request.id } })).toBeNull()
    expect(await db.storagePurge.findUnique({ where: { path: sole.prefix } })).toMatchObject({ isPrefix: true, completedAt: null })
    expect((await db.tenancy.findUniqueOrThrow({ where: { id: sole.tenancy.id } })).minorRepairClause).toBeNull()
    await retireSoleSupportingDocuments(shared.agent.id)
    await retireSoleSupportingDocuments(shared.tenant.id)
    expect(await db.supportingDocumentFile.findUnique({ where: { id: shared.file.id } })).toBeTruthy()
    expect((await db.tenancy.findUniqueOrThrow({ where: { id: shared.tenancy.id } })).minorRepairClause).toEqual(clause)
  })

  it('retains sole-party paperwork associated with a sent report', async () => {
    const row = await fixture(false, true)
    await db.inspection.create({ data: { tenancyId: row.tenancy.id, kind: 'CHECK_IN', status: 'AWAITING_SIGNATURE', conductedById: row.agent.id } })
    await retireSoleSupportingDocuments(row.agent.id)
    expect(await db.supportingDocumentRequest.findUnique({ where: { id: row.request.id } })).toBeTruthy()
    expect(await db.storagePurge.findUnique({ where: { path: row.prefix } })).toBeNull()
  })

  it('retains another author’s reviewed clause after their tenancy access is removed', async () => {
    const row = await fixture(false, true)
    const former = await db.stakeholder.create({ data: { name: 'Former clause reviewer' } })
    people.push(former.id)
    await db.tenancyCollaborator.create({ data: { tenancyId: row.tenancy.id, stakeholderId: former.id } })
    const clause = {
      fileId: row.file.id, page: 2, quote: 'The tenant pays the first $150 per repair.',
      rule: 'FIRST_AMOUNT', tenantCap: '150.00', notes: null, confirmedAt: new Date().toISOString(),
      confirmedBy: { id: former.id, name: former.name },
    }
    await db.tenancy.update({ where: { id: row.tenancy.id }, data: { minorRepairClause: clause } })
    await db.tenancyCollaborator.deleteMany({ where: { tenancyId: row.tenancy.id, stakeholderId: former.id } })
    await retireSoleSupportingDocuments(row.agent.id)
    await retireSoleSupportingDocuments(former.id)
    expect(await db.supportingDocumentRequest.findUnique({ where: { id: row.request.id } })).toBeTruthy()
    expect((await db.tenancy.findUniqueOrThrow({ where: { id: row.tenancy.id } })).minorRepairClause).toEqual(clause)
    expect(await db.storagePurge.findUnique({ where: { path: row.prefix } })).toBeNull()
  })

  it('rechecks an initially empty tenancy after an in-flight request commits during account deletion', async () => {
    const row = await fixture()
    await db.supportingDocumentRequest.delete({ where: { id: row.request.id } })
    const original = db.tenancy.findMany.bind(db.tenancy)
    let scanned!: () => void
    let resume!: () => void
    const scan = new Promise<void>((resolve) => { scanned = resolve })
    const pause = new Promise<void>((resolve) => { resume = resolve })
    const spy = vi.spyOn(db.tenancy, 'findMany').mockImplementationOnce((args) => {
      const query = original(args)
      // This awaited query is never passed to a Prisma batch transaction. Keep
      // the delegate's promise type while pausing its result at the test barrier.
      return query.then(async (result) => {
        scanned()
        await pause
        return result
      }) as typeof query
    })
    const retiring = retireSoleSupportingDocuments(row.agent.id)
    try {
      await scan
      await db.supportingDocumentRequest.create({ data: {
        id: row.request.id, tenancyId: row.tenancy.id, clientId: row.request.clientId,
        title: 'Payment proof', requestedById: row.agent.id,
      } })
    } finally {
      resume()
      await retiring
      spy.mockRestore()
    }
    expect(await db.supportingDocumentRequest.findUnique({ where: { id: row.request.id } })).toBeNull()
    expect(await db.storagePurge.findUnique({ where: { path: row.prefix } })).toBeTruthy()
  })
})
