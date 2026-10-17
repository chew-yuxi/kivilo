import { createHash } from 'node:crypto'
import { z } from 'zod'
import { db } from '@/lib/db'
import { CATEGORIES, CONDITIONS } from '@/lib/inspection/schema'
import { applyAddenda, type StateChange, type StateRoom } from '@/lib/addenda-state'
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
    photos: entry.photos.map(({ id, storagePath, label, note }) => ({ id, storagePath, label, note })),
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
        where: acknowledgedOnly ? { acknowledgedAt: { not: null } } : { publishedAt: { not: null } },
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
  return applyAddenda(signed, inspection.addenda.map((addendum) => ({
    at: addendum.publishedAt!,
    changes: snapshotChanges(addendumSnapshotSchema.parse(addendum.snapshot)),
  })))
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
    acknowledgements,
  }
}

export type AddendumView = ReturnType<typeof addendumView>

/// "Added", "Replaced", "Removed", with what, as one heading line.
export function entryHeading(entry: AddendumSnapshot['entries'][number]) {
  if (entry.change === 'ADDED') return `Added: ${entry.line?.name ?? 'item'}`
  if (entry.change === 'REMOVED') return `Removed: ${entry.target?.name ?? 'item'}`
  return `Replaced: ${entry.target?.name ?? 'item'} with ${entry.line?.name ?? 'item'}`
}
