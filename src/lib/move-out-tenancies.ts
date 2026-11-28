import { actsAsAgent, requireAgent } from '@/lib/auth'
import { db } from '@/lib/db'
import { lockAgencyTenancy } from '@/lib/agency'
import { propertyLabel } from '@/lib/format'
import { createMoveOutRoom, moveOutHash, moveOutVisit, type MoveOutVisit } from '@/lib/move-out'
import { z } from 'zod'

export async function moveOutTargets(agencyId: string | null) {
  const actor = await requireAgent()
  const terms = await db.tenancy.findMany({
    where: { AND: [actsAsAgent(actor.id), { agencyId, property: { archivedAt: null, trashedAt: null } }] },
    select: {
      id: true,
      property: true,
      tenant: { select: { name: true } },
      endDate: true,
      inspections: { select: { id: true, kind: true, status: true }, orderBy: { createdAt: 'desc' } },
    },
    orderBy: { endDate: 'desc' },
  })
  return terms.map((term) => ({
    id: term.id,
    address: propertyLabel(term.property),
    tenant: term.tenant.name,
    end: term.endDate.toISOString().slice(0, 10),
    baselineId:
      term.inspections.find((row) => row.kind === 'CHECK_IN' && row.status === 'COMPLETED')?.id ?? null,
    checkOutId: term.inspections.find((row) => row.kind === 'CHECK_OUT')?.id ?? null,
  }))
}

export async function saveTenancyMoveOut(tenancyId: string, clientId: string, values: MoveOutVisit) {
  const actor = await requireAgent()
  const visit = moveOutVisit.parse(values)
  z.uuid().parse(clientId)
  const requestHash = moveOutHash(visit, tenancyId)
  const scope = {
    AND: [actsAsAgent(actor.id), { id: tenancyId, property: { archivedAt: null, trashedAt: null } }],
  }
  if (!(await db.tenancy.findFirst({ where: scope, select: { id: true } })))
    throw new Error('Tenancy not found')
  return db.$transaction(async (tx) => {
    await lockAgencyTenancy(tenancyId, tx)
    const term = await tx.tenancy.findFirst({
      where: scope,
      select: {
        inspections: {
          select: {
            id: true,
            kind: true,
            status: true,
            clientId: true,
            moveOutRequestHash: true,
            conductedById: true,
          },
        },
      },
    })
    if (!term) throw new Error('Tenancy not found')
    const previous = term.inspections.find((row) => row.kind === 'CHECK_OUT')
    if (previous?.clientId === clientId && previous.conductedById === actor.id) {
      if (previous.moveOutRequestHash !== requestHash)
        throw new Error('Walkthrough save conflict: open the original check-out from Properties')
      return previous.id
    }
    if (previous || term.inspections.some((row) => row.kind === 'CHECK_IN' && row.status === 'COMPLETED')) {
      throw new Error(
        'The tenancy now has a signed check-in or a check-out. Your visit is saved on this device.',
      )
    }
    const report = await tx.inspection.create({
      data: {
        tenancyId,
        clientId,
        conductedById: actor.id,
        kind: 'CHECK_OUT',
        standaloneMoveOut: true,
        moveOutRequestHash: requestHash,
        status: 'REVIEW',
        conductedAt: visit.visitedAt ? new Date(visit.visitedAt) : new Date(),
      },
    })
    await createMoveOutRoom(tx, report.id, actor.id, visit)
    return report.id
  })
}
