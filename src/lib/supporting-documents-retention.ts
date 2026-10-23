import { db } from '@/lib/db'
import { lockAgencyTenancy } from '@/lib/agency'
import { Prisma } from '@/generated/prisma'

// Used only by the operator's account-deletion workflow after its explicit
// retention choices. A document involving another person remains their record.
export function soleSupportingDocumentTenancy(stakeholderId: string): Prisma.TenancyWhereInput {
  return {
    agencyId: null,
    landlordId: stakeholderId,
    tenantId: stakeholderId,
    OR: [{ agentId: null }, { agentId: stakeholderId }],
    collaborators: { none: { stakeholderId: { not: stakeholderId } } },
    // Reviewing the clause is authorship too, even if that collaborator later
    // leaves and neither requested nor uploaded the original agreement.
    AND: [{ OR: [
      { minorRepairClause: { equals: Prisma.DbNull } },
      { minorRepairClause: { path: ['confirmedBy', 'id'], equals: stakeholderId } },
    ] }],
    inspections: { none: { OR: [
      { status: { in: ['AWAITING_SIGNATURE', 'COMPLETED'] } },
      { signatures: { some: {} } },
      { accessGrants: { some: { stakeholderId: { not: stakeholderId } } } },
      { conductedById: { not: stakeholderId } },
    ] } },
    supportingDocumentRequests: { none: { OR: [
      { requestedById: { not: stakeholderId } },
      { files: { some: { submittedById: { not: stakeholderId } } } },
    ] } },
  }
}

export async function retireSoleSupportingDocuments(stakeholderId: string) {
  const soleTenancy = soleSupportingDocumentTenancy(stakeholderId)
  const tenancies = await db.tenancy.findMany({
    // Lock even a tenancy with no visible request: a document transaction that
    // passed its account check before deletion began may still be committing its
    // first request. Waiting for that transaction makes its rows visible below.
    where: soleTenancy,
    select: { id: true },
  })
  for (const { id } of tenancies) {
    await db.$transaction(async (tx) => {
      await lockAgencyTenancy(id, tx)
      if (!await tx.tenancy.findFirst({ where: { AND: [{ id }, soleTenancy] }, select: { id: true } })) return
      const requests = await tx.supportingDocumentRequest.findMany({ where: { tenancyId: id }, select: { id: true } })
      await tx.storagePurge.createMany({
        data: requests.map((request) => ({
          path: `supporting-documents/${id}/${request.id}`,
          isPrefix: true,
          readyAt: new Date(Date.now() + 3 * 3600_000),
        })),
        skipDuplicates: true,
      })
      await tx.supportingDocumentRequest.deleteMany({ where: { tenancyId: id } })
      await tx.tenancy.update({ where: { id }, data: { minorRepairClause: Prisma.DbNull } })
    })
  }
}
