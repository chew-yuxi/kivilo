import { createHash } from 'node:crypto'
import { z } from 'zod'
import { db } from '@/lib/db'
import { CATEGORIES, CONDITIONS } from '@/lib/inspection/schema'
import { applyAddenda, type StateChange, type StateRoom } from '@/lib/addenda-state'
import { storedAnnotationsSchema } from '@/lib/annotations'
import type { Prisma } from '@/generated/prisma'

/// Addenda: dated updates to a signed check-in. See plans/report-addenda.md.
/// This module holds what the actions, the report, the PDF and the app all read.

const lineSchema = z.object({
  key: z.string(),
  name: z.string(),
  category: z.enum(CATEGORIES),
  condition: z.enum(CONDITIONS),
  quantity: z.number().int(),
  identifier: z.string().nullable(),
  notes: z.string().nullable(),
  propertyAssetId: z.string().nullable(),
  meterReading: z.string().nullable().optional(),
})

/// A published addendum, by value. Rendering never follows the entry rows.
export const addendumSnapshotSchema = z.object({
  schemaVersion: z.literal(1),
  number: z.number().int(),
  title: z.string(),
  reason: z.string().nullable(),
  effectiveDate: z.string(),
  publishedAt: z.string(),
  publishedBy: z.string(),
  /// Optional on older agent updates. A tenant notice freezes when it was reported,
  /// separately from publication, and the deadline that applied to that report.
  moveInDefect: z.object({
    caseId: z.string(),
    reportedAt: z.iso.datetime(),
    deadline: z.iso.date(),
  }).optional(),
  entries: z.array(z.object({
    id: z.string(),
    change: z.enum(['ADDED', 'REPLACED', 'REMOVED']),
    roomName: z.string(),
    notes: z.string().nullable(),
    /// The line as it stood before this entry, for REPLACED and REMOVED.
    target: lineSchema.omit({ category: true, propertyAssetId: true }).nullable(),
    /// The new line, for ADDED and REPLACED.
    line: lineSchema.nullable(),
    maintenanceCase: z.object({ id: z.string(), title: z.string() }).nullable(),
    photos: z.array(z.object({
      id: z.string(),
      storagePath: z.string(),
      mimeType: z.string(),
      note: z.string().nullable(),
      label: z.string().nullable(),
      /// Copied from a repair photo. Absent on updates published before photos carried marks.
      annotations: storedAnnotationsSchema.nullable().optional(),
    })),
  })),
})

export type AddendumSnapshot = z.infer<typeof addendumSnapshotSchema>

/// SHA-256 of the snapshot with its keys sorted. Postgres stores JSONB with its own key
/// order, so this is what makes the hash recomputable from the stored row, which is the
/// point of recording it on every acknowledgement.
export function addendumHash(snapshot: unknown) {
  const canonical = (value: unknown): unknown =>
    Array.isArray(value)
      ? value.map(canonical)
      : value && typeof value === 'object'
        ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical((value as Record<string, unknown>)[key])]))
        : value
  return createHash('sha256').update(JSON.stringify(canonical(snapshot))).digest('hex')
}

export const ADDENDUM_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

/// Published addenda in the order they were numbered, which is the order they apply.
export const publishedAddenda = {
  where: { publishedAt: { not: null } },
  orderBy: { number: 'asc' },
  include: { acknowledgements: true },
} satisfies Prisma.Inspection$addendaArgs

type PublishedRow = Prisma.ReportAddendumGetPayload<{ include: { acknowledgements: true } }>

export function snapshotChanges(snapshot: AddendumSnapshot): StateChange[] {
  return snapshot.entries.map((entry) => ({
    change: entry.change,
    roomName: entry.roomName,
    targetKey: entry.target?.key ?? null,
    line: entry.line,
    photos: entry.photos.map(({ id, storagePath, label, note, annotations }) => ({ id, storagePath, label, note, annotations })),
    conditionOnly: Boolean(snapshot.moveInDefect),
    // Older frozen notices included the target's existing notes in the new line.
    // Apply only their own contribution so parallel notices retain both descriptions.
    conditionNote: entry.target?.notes && entry.notes?.startsWith(`${entry.target.notes}\n`)
      ? entry.notes.slice(entry.target.notes.length + 1)
      : entry.notes,
  }))
}

/// The check-in as signed, then every published addendum (or only the acknowledged
/// ones) applied in number order.
export async function currentState(
  inspectionId: string,
  { acknowledgedOnly }: { acknowledgedOnly: boolean },
  client: Prisma.TransactionClient = db,
): Promise<StateRoom[]> {
  const inspection = await client.inspection.findUniqueOrThrow({
    where: { id: inspectionId },
    include: {
      rooms: { orderBy: { order: 'asc' }, include: { items: { orderBy: { createdAt: 'asc' } } } },
      addenda: {
        where: acknowledgedOnly
          ? { acknowledgedAt: { not: null } }
          : {
              publishedAt: { not: null },
              disputedAt: null,
            },
        orderBy: { number: 'asc' },
      },
    },
  })
  const signed: StateRoom[] = inspection.rooms.map((room) => ({
    name: room.name,
    roomId: room.id,
    addendumPhotos: [],
    lines: room.items.map((item) => ({
      key: `item:${item.id}`,
      name: item.name,
      category: item.category,
      condition: item.condition,
      quantity: item.quantity,
      identifier: item.identifier,
      notes: item.notes,
      meterReading: item.meterReading,
      propertyAssetId: item.propertyAssetId,
      createdAt: item.createdAt,
    })),
  }))
  return applyAddenda(signed, inspection.addenda.flatMap((addendum) => {
    const snapshot = addendumSnapshotSchema.parse(addendum.snapshot)
    // The immutable provenance survives retention removing the repair FK. An
    // unagreed tenant notice must never turn into an agent's authoring baseline.
    if (snapshot.moveInDefect && !addendum.acknowledgedAt) return []
    return [{ at: addendum.publishedAt!, changes: snapshotChanges(snapshot) }]
  }))
}

export type AcknowledgementStatus = {
  role: 'Landlord' | 'Tenant'
  name: string
  /// Who acknowledges, which the agent's phone names when it records one in person.
  stakeholderId: string
  acknowledgedAt: string | null
  /// Given on the agent's phone rather than on the party's own account.
  inPerson: boolean
}

/// One published addendum as every reader draws it, with each party's acknowledgement.
export function addendumView(
  row: PublishedRow,
  tenancy: { landlordId: string; tenantId: string; landlord: { name: string }; tenant: { name: string } },
) {
  const snapshot = addendumSnapshotSchema.parse(row.snapshot)
  const status = (role: AcknowledgementStatus['role'], stakeholderId: string, name: string): AcknowledgementStatus => {
    const ack = row.acknowledgements.find((each) => each.stakeholderId === stakeholderId)
    return {
      role,
      name,
      stakeholderId,
      acknowledgedAt: ack?.acknowledgedAt.toISOString() ?? null,
      inPerson: ack?.method === 'IN_PERSON',
    }
  }
  const acknowledgements = [
    status('Landlord', tenancy.landlordId, tenancy.landlord.name),
    status('Tenant', tenancy.tenantId, tenancy.tenant.name),
  ]
  return {
    id: row.id,
    ...snapshot,
    contentHash: row.contentHash!,
    acknowledgedAt: row.acknowledgedAt?.toISOString() ?? null,
    source: snapshot.moveInDefect ? 'MOVE_IN_DEFECT' as const : 'AGENT_UPDATE' as const,
    moveInDefect: snapshot.moveInDefect ?? null,
    dispute: row.disputedAt
      ? {
          disputedAt: row.disputedAt.toISOString(),
          disputedById: row.disputedById!,
          disputedBy: tenancy.landlord.name,
          reason: row.disputeReason!,
        }
      : null,
    acknowledgements,
  }
}

export type AddendumView = ReturnType<typeof addendumView>

/// "Added", "Replaced", "Removed", with what, as one heading line.
export function entryHeading(entry: AddendumSnapshot['entries'][number], source?: 'MOVE_IN_DEFECT' | 'AGENT_UPDATE') {
  if (source === 'MOVE_IN_DEFECT') return `Condition reported: ${entry.line?.name ?? entry.target?.name ?? 'item'}`
  if (entry.change === 'ADDED') return `Added: ${entry.line?.name ?? 'item'}`
  if (entry.change === 'REMOVED') return `Removed: ${entry.target?.name ?? 'item'}`
  return `Replaced: ${entry.target?.name ?? 'item'} with ${entry.line?.name ?? 'item'}`
}
