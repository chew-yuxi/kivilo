import { createHash } from 'node:crypto'
import type { ItemCondition, Prisma } from '@/generated/prisma'
import { db } from '@/lib/db'
import { propertyLabel } from '@/lib/format'
import { toAnnotations, type StoredAnnotations } from '@/lib/annotations'
import { assessmentSnapshotSchema } from '@/lib/assessment-schema'
import { addendumView, publishedAddenda } from '@/lib/addenda'
import { reportAgent, reportBranding } from '@/lib/report-agent'

/// Bump whenever the document's layout changes, so every cached PDF is redrawn.
export const RENDER_VERSION = 7

const reportInclude = {
  tenancy: {
    include: {
      property: true,
      landlord: true,
      tenant: true,
      agent: { include: { branding: true } },
      agency: { include: { branding: true } },
    },
  },
  conductedBy: { include: { branding: true } },
  reportAgent: { include: { branding: true } },
  reportAgency: { include: { branding: true } },
  rooms: {
    orderBy: { order: 'asc' },
    // The frozen check-in reference only `check-in-reference.ts` reads.
    omit: { baseline: true },
    include: {
      items: { orderBy: { createdAt: 'asc' }, include: { evidence: { select: { captureId: true } } } },
      // The same filter as the shared page: a capture that landed after Send was never
      // reviewed, so it is not part of what the parties agreed.
      captures: { where: { kind: 'PHOTO', processedAt: { not: null } }, orderBy: { createdAt: 'asc' } },
    },
  },
  signatures: { include: { stakeholder: true }, orderBy: { signedAt: 'asc' } },
  assessments: {
    orderBy: { version: 'desc' },
    take: 1,
    include: { responses: { include: { stakeholder: { select: { name: true } } }, orderBy: { respondedAt: 'asc' } } },
  },
  addenda: publishedAddenda,
} satisfies Prisma.InspectionInclude

export type ReportRow = Prisma.InspectionGetPayload<{ include: typeof reportInclude }>

/// Every generated copy of one inspection's report lives under this prefix, so revoking
/// the share link can withdraw them all.
export function reportPrefix(inspectionId: string) {
  return `reports/${inspectionId}`
}

/// Only a countersigned report becomes a document. Before that it could be mistaken for
/// the agreed one.
export function loadReportRow(inspectionId: string) {
  return db.inspection.findFirst({
    where: { id: inspectionId, status: 'COMPLETED' },
    include: reportInclude,
  })
}

/// Item conditions worth a second look at check-out. NEW and GOOD are the baseline.
export const NOTED_CONDITIONS: ItemCondition[] = ['FAIR', 'POOR', 'DAMAGED']

export type ReportPhoto = {
  /// "3.12": room 3, twelfth photo. What a person quotes in an email about the report.
  ref: string
  anchor: string
  storagePath: string
  note: string | null
  annotations: StoredAnnotations | null
  /// Items the inspector attached this photo to as evidence.
  shows: string[]
}

export type ReportItem = {
  name: string
  quantity: number
  condition: ItemCondition
  identifier: string | null
  meterReading: string | null
  notes: string | null
  photoRefs: { ref: string; anchor: string }[]
}

export type ReportRoom = {
  number: number
  name: string
  anchor: string
  items: ReportItem[]
  photos: ReportPhoto[]
}

export type NotedEntry =
  | { kind: 'item'; label: string; condition: ItemCondition; detail: string | null; photoRefs: ReportItem['photoRefs'] }
  | { kind: 'photo'; ref: string; anchor: string; detail: string[] }

export type ReportModel = ReturnType<typeof buildReportModel>

/// Everything the document draws, as plain data. Bytes are fetched afterwards, so the
/// cache key can be computed without downloading a single photo.
export function buildReportModel(row: ReportRow) {
  const { tenancy } = row
  // The agent on the deal heads the report; an inspection with no agent falls back to
  // whoever conducted it.
  const preparer = reportAgent(row) ?? row.conductedBy
  const branding = reportBranding(row)

  const rooms: ReportRoom[] = row.rooms.map((room, roomIndex) => {
    const number = roomIndex + 1
    const photos: ReportPhoto[] = room.captures.map((capture, index) => ({
      ref: `${number}.${index + 1}`,
      anchor: `photo-${number}-${index + 1}`,
      storagePath: capture.storagePath,
      note: capture.note,
      annotations: toAnnotations(capture.annotations),
      shows: room.items
        .filter((item) => item.evidence.some((evidence) => evidence.captureId === capture.id))
        .map((item) => item.name),
    }))
    const photoByCapture = new Map(room.captures.map((capture, index) => [capture.id, photos[index]]))
    return {
      number,
      name: room.name,
      anchor: `room-${number}`,
      photos,
      items: room.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        condition: item.condition,
        identifier: item.identifier,
        meterReading: item.meterReading,
        notes: item.notes,
        photoRefs: item.evidence.flatMap(({ captureId }) => {
          const photo = photoByCapture.get(captureId)
          return photo ? [{ ref: photo.ref, anchor: photo.anchor }] : []
        }),
      })),
    }
  })

  const published = row.assessments[0] ?? null
  const assessment = published
    ? {
        version: published.version,
        publishedAt: published.publishedAt.toISOString(),
        ...assessmentSnapshotSchema.parse(published.snapshot),
        /// Each party's answer to the deposit statement, in the order the parties are
        /// named. An answer changes the cache key, so the copy redraws when one arrives.
        responses: [tenancy.landlordId, tenancy.tenantId].map((id) => {
          const response = published.responses.find((row) => row.stakeholderId === id)
          return {
            name: id === tenancy.landlordId ? tenancy.landlord.name : tenancy.tenant.name,
            role: id === tenancy.landlordId ? 'landlord' : 'tenant',
            answer: response?.answer ?? null,
            reason: response?.reason ?? null,
            inPerson: response?.method === 'IN_PERSON',
            respondedAt: response?.respondedAt.toISOString() ?? null,
          }
        }),
      }
    : null

  return {
    inspectionId: row.id,
    /// Short enough to read out on the phone; unique enough within one agent's reports.
    reference: row.id.slice(-8).toUpperCase(),
    kind: row.kind,
    address: propertyLabel(tenancy.property),
    unit: tenancy.property.unit,
    line1: tenancy.property.line1,
    conductedAt: row.conductedAt?.toISOString() ?? null,
    inspector: row.conductedBy?.name ?? null,
    landlord: tenancy.landlord.name,
    tenant: tenancy.tenant.name,
    tenancyStart: tenancy.startDate.toISOString(),
    tenancyEnd: tenancy.endDate.toISOString(),
    deposit: tenancy.deposit.toString(),
    preparer: preparer ? { name: preparer.name, email: preparer.email } : null,
    branding: branding && {
      agencyName: branding.agencyName,
      agencyLicence: branding.agencyLicence,
      ceaRegistration: branding.ceaRegistration,
      phone: branding.phone,
      logoPath: branding.logoPath,
      // The logo is replaced in place at the same path, so its bytes can change while
      // the path does not. The row's timestamp moves with every upload.
      updatedAt: branding.updatedAt.toISOString(),
    },
    rooms,
    noted: rooms
      .map((room) => ({ room, entries: notedEntries(room) }))
      .filter(({ entries }) => entries.length > 0),
    signatures: row.signatures.map((signature) => ({
      name: signature.stakeholder.name,
      role: signature.stakeholderId === tenancy.landlordId
        ? 'Landlord'
        : signature.stakeholderId === tenancy.tenantId ? 'Tenant' : 'Signatory',
      signedAt: signature.signedAt.toISOString(),
      imageData: signature.imageData,
      contentHash: signature.contentHash,
    })),
    assessment,
    /// Updates since signing, oldest first, each with both parties' acknowledgement. An
    /// acknowledgement changes the cache key, so the copy redraws when one arrives.
    addenda: row.addenda.map((addendum) => addendumView(addendum, tenancy)),
  }
}

/// Items rated below good, then photos the inspector captioned or marked that none of
/// those items already points to: the things a check-out will be argued over, gathered
/// in one place instead of across every page.
export function notedEntries(room: ReportRoom): NotedEntry[] {
  const notedItems = room.items.filter((item) => NOTED_CONDITIONS.includes(item.condition))
  const cited = new Set(notedItems.flatMap((item) => item.photoRefs.map((photo) => photo.ref)))
  const items: NotedEntry[] = notedItems
    .map((item) => ({
      kind: 'item',
      label: item.quantity > 1 ? `${item.name} ×${item.quantity}` : item.name,
      condition: item.condition,
      detail: item.notes,
      photoRefs: item.photoRefs,
    }))
  const photos: NotedEntry[] = room.photos
    .filter((photo) => (photo.note || photo.annotations) && !cited.has(photo.ref))
    .map((photo) => ({
      kind: 'photo',
      ref: photo.ref,
      anchor: photo.anchor,
      detail: [photo.note, ...markNotes(photo)].filter((line): line is string => Boolean(line)),
    }))
  return [...items, ...photos]
}

/// Each mark's note, numbered to match the badge drawn on the photo.
export function markNotes(photo: Pick<ReportPhoto, 'annotations'>) {
  return photo.annotations?.marks.flatMap((mark, index) => (mark.note ? [`${index + 1}. ${mark.note}`] : [])) ?? []
}

/// The cache key: identical inputs draw an identical document, so a stored copy under
/// this key is correct by construction, and any change at all produces a new key.
export function reportHash(model: ReportModel) {
  return createHash('sha256').update(JSON.stringify({ RENDER_VERSION, model })).digest('hex').slice(0, 32)
}

/// "Check-in report 02-05 27 Jalan Merah Saga.pdf". Letters, digits, spaces, dots and
/// hyphens only: Supabase Storage encodes anything else in Content-Disposition twice,
/// so a "#" or "," would reach the reader's disk as "%23" or "%2C".
export function reportFilename(model: Pick<ReportModel, 'kind' | 'unit' | 'line1'>) {
  const kind = model.kind === 'CHECK_OUT' ? 'Check-out' : 'Check-in'
  const place = [model.unit, model.line1].filter(Boolean).join(' ')
  return `${kind} report ${place}`.replace(/[^A-Za-z0-9 .-]/g, '').replace(/\s+/g, ' ').trim() + '.pdf'
}
