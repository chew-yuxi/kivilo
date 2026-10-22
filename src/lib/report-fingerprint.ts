import { createHash } from 'node:crypto'
import type { Prisma } from '@/generated/prisma'
import { reportAgent } from '@/lib/report-agent'

/// What a signature agrees to, reduced to one sha256. Recorded on every signature, from
/// every signing path (`recordSignature`), so either party can later show that the
/// report in front of them is the one that was signed, and that both signed the same.
///
/// It covers exactly what Send froze: the inspection, its tenancy and property, the
/// parties, every room and item with its evidence links, and the captures stamped at
/// review with their notes and marks. A capture that landed after Send carries no stamp
/// and is not part of the agreement, so it is not part of this either. Findings are
/// written after the freeze and published separately, so they are out too.
export async function reportFingerprint(client: Prisma.TransactionClient, inspectionId: string) {
  const inspection = await client.inspection.findUniqueOrThrow({
    where: { id: inspectionId },
    include: {
      tenancy: { include: { property: true, landlord: true, tenant: true, agent: true } },
      conductedBy: true,
      reportAgent: true,
      rooms: {
        orderBy: [{ order: 'asc' }, { id: 'asc' }],
        // The frozen check-in reference is no part of what is signed.
        omit: { baseline: true },
        include: {
          items: {
            orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
            include: { evidence: { orderBy: { captureId: 'asc' }, select: { captureId: true } } },
          },
          captures: {
            where: { processedAt: { not: null } },
            orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          },
        },
      },
    },
  })
  const { tenancy } = inspection
  const party = (person: { id: string; name: string; email: string | null; idNumber: string | null } | null) =>
    person && { id: person.id, name: person.name, email: person.email, idNumber: person.idNumber }

  // Built field by field, never by spreading a row, so a column added later does not
  // silently change every fingerprint computed after it.
  const content = {
    version: 1,
    inspection: {
      id: inspection.id,
      kind: inspection.kind,
      conductedAt: inspection.conductedAt?.toISOString() ?? null,
      conductedBy: party(inspection.conductedBy),
      baselineId: inspection.baselineId,
    },
    tenancy: {
      id: tenancy.id,
      startDate: tenancy.startDate.toISOString(),
      endDate: tenancy.endDate.toISOString(),
      monthlyRent: tenancy.monthlyRent.toString(),
      deposit: tenancy.deposit.toString(),
      property: {
        line1: tenancy.property.line1,
        unit: tenancy.property.unit,
        postalCode: tenancy.property.postalCode,
        type: tenancy.property.type,
      },
      landlord: party(tenancy.landlord),
      tenant: party(tenancy.tenant),
      agent: party(reportAgent(inspection)),
    },
    rooms: inspection.rooms.map((room) => ({
      id: room.id,
      name: room.name,
      order: room.order,
      items: room.items.map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        condition: item.condition,
        quantity: item.quantity,
        notes: item.notes,
        identifier: item.identifier,
        meterReading: item.meterReading,
        evidence: item.evidence.map((evidence) => evidence.captureId),
      })),
      captures: room.captures.map((capture) => ({
        id: capture.id,
        kind: capture.kind,
        storagePath: capture.storagePath,
        sizeBytes: capture.sizeBytes,
        note: capture.note,
        annotations: capture.annotations,
      })),
    })),
  }
  return createHash('sha256').update(JSON.stringify(content)).digest('hex')
}

/// How a fingerprint is printed: the first 16 hex digits in groups of four. Enough to
/// compare two copies by eye; the full value is kept on the signature.
export function shortFingerprint(hash: string) {
  return hash.slice(0, 16).toUpperCase().match(/.{4}/g)!.join(' ')
}
