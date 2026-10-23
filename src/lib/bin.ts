import { Prisma } from '@/generated/prisma'
import { BIN_DAYS, type BinKind } from '@/lib/bin-rules'

/// Deleting from a working report takes the rows out, exactly as they were, and keeps
/// them here for BIN_DAYS. Nothing but Restore reads a bin item, so no report,
/// fingerprint, PDF or API query has to filter anything out: deleted is gone until
/// restored. The stored media stays until the bin item expires, because its
/// StoragePurge tombstone is not due before then.

type Rows = {
  rooms?: Record<string, unknown>[]
  captures?: Record<string, unknown>[]
  items?: Record<string, unknown>[]
  evidence?: Record<string, unknown>[]
  findings?: Record<string, unknown>[]
  /// Links on rows that survive the delete, which the cascade sets to null.
  findingLinks?: { id: string; itemId: string | null; baselineItemId: string | null }[]
  sourceLinks?: { itemId: string; captureId: string }[]
  findingPhotos?: { clientId: string; findingId: string | null }[]
  findingDrafts?: { id: string; open: boolean }[]
  purgePaths?: string[]
}

const plain = <T>(value: T) => JSON.parse(JSON.stringify(value)) as Record<string, unknown>[]

export function binExpiry(from = new Date()) {
  return new Date(from.getTime() + BIN_DAYS * 86_400_000)
}

async function put(
  tx: Prisma.TransactionClient,
  inspectionId: string,
  actorId: string,
  kind: BinKind,
  label: string,
  rows: Rows,
) {
  const inspection = await tx.inspection.findUniqueOrThrow({
    where: { id: inspectionId }, select: { tenancyId: true, tenancy: { select: { propertyId: true } } },
  })
  const expiresAt = binExpiry()
  // The bytes outlive the rows for as long as they can be restored.
  if (rows.purgePaths?.length) {
    await tx.storagePurge.createMany({
      data: rows.purgePaths.map((path) => ({ path, isPrefix: kind === 'ROOM' && path === rows.rooms?.[0]?.id, readyAt: expiresAt })),
      skipDuplicates: true,
    })
  }
  return tx.binItem.create({
    data: {
      propertyId: inspection.tenancy.propertyId,
      tenancyId: inspection.tenancyId,
      inspectionId,
      kind,
      label,
      rows: rows as Prisma.InputJsonValue,
      deletedById: actorId,
      expiresAt,
    },
  })
}

async function linksTo(tx: Prisma.TransactionClient, itemIds: string[]) {
  if (!itemIds.length) return []
  return tx.finding.findMany({
    where: { OR: [{ itemId: { in: itemIds } }, { baselineItemId: { in: itemIds } }] },
    select: { id: true, itemId: true, baselineItemId: true },
  })
}

export async function binRoom(tx: Prisma.TransactionClient, roomId: string, actorId: string) {
  const room = await tx.room.findUniqueOrThrow({ where: { id: roomId } })
  const [items, captures] = await Promise.all([
    tx.inspectionItem.findMany({ where: { roomId } }),
    tx.capture.findMany({ where: { roomId } }),
  ])
  const itemIds = items.map((item) => item.id)
  const evidence = await tx.itemEvidence.findMany({ where: { itemId: { in: itemIds } } })
  const contents = [
    items.length ? `${items.length} ${items.length === 1 ? 'item' : 'items'}` : null,
    captures.length ? `${captures.length} ${captures.length === 1 ? 'photo or video' : 'photos and videos'}` : null,
  ].filter(Boolean)
  const label = contents.length ? `${room.name} (${contents.join(', ')})` : room.name
  return put(tx, room.inspectionId, actorId, 'ROOM', label, {
    rooms: plain([room]),
    captures: plain(captures),
    items: plain(items),
    evidence: plain(evidence),
    findingLinks: await linksTo(tx, itemIds),
    purgePaths: [roomId],
  })
}

export async function binItem(tx: Prisma.TransactionClient, itemId: string, inspectionId: string, actorId: string) {
  const item = await tx.inspectionItem.findUniqueOrThrow({ where: { id: itemId } })
  return put(tx, inspectionId, actorId, 'ITEM', item.name, {
    items: plain([item]),
    evidence: plain(await tx.itemEvidence.findMany({ where: { itemId } })),
    findingLinks: await linksTo(tx, [itemId]),
  })
}

export async function binCapture(tx: Prisma.TransactionClient, captureId: string, inspectionId: string, actorId: string) {
  const capture = await tx.capture.findUniqueOrThrow({ where: { id: captureId }, include: { room: { select: { name: true } } } })
  const { room, ...row } = capture
  const [evidence, sources] = await Promise.all([
    tx.itemEvidence.findMany({ where: { captureId } }),
    tx.inspectionItem.findMany({ where: { sourceCaptureId: captureId }, select: { id: true } }),
  ])
  return put(tx, inspectionId, actorId, 'CAPTURE', `${capture.kind === 'PHOTO' ? 'A photo' : 'A video'} in ${room.name}`, {
    captures: plain([row]),
    evidence: plain(evidence),
    sourceLinks: sources.map((item) => ({ itemId: item.id, captureId })),
    purgePaths: [capture.storagePath, capture.posterPath].filter((path): path is string => path !== null),
  })
}

/// Call before retiring the finding's photos, so the bin knows which ones to bring back.
export async function binFinding(tx: Prisma.TransactionClient, findingId: string, label: string, actorId: string) {
  const finding = await tx.finding.findUniqueOrThrow({ where: { id: findingId } })
  // Deleting the finding unlinks every draft that names it, saved or not, and
  // retirement discards the open ones; restore undoes exactly that.
  const drafts = await tx.findingPhotoDraft.findMany({
    where: { inspectionId: finding.inspectionId, findingId }, select: { id: true, savedAt: true, discardedAt: true },
  })
  const photos = await tx.findingPhoto.findMany({
    where: {
      OR: [{ findingId }, { draftId: { in: drafts.map((draft) => draft.id) } }],
      deletedAt: null,
    },
    select: { clientId: true, findingId: true },
  })
  return put(tx, finding.inspectionId, actorId, 'FINDING', label, {
    findings: plain([finding]),
    findingPhotos: photos,
    findingDrafts: drafts.map((draft) => ({ id: draft.id, open: !draft.savedAt && !draft.discardedAt })),
  })
}

/// Json? columns need DbNull to write SQL NULL; a bare null is rejected.
function revive(row: Record<string, unknown>, jsonColumns: string[]) {
  const data = { ...row }
  for (const column of jsonColumns) if (data[column] === null) data[column] = Prisma.DbNull
  return data
}

/// Puts the rows back with their original ids. The caller has authorized the actor,
/// taken the inspection's locks and checked that the bin item is still restorable.
export async function reinsert(tx: Prisma.TransactionClient, binItemId: string) {
  const bin = await tx.binItem.findUniqueOrThrow({ where: { id: binItemId } })
  const rows = bin.rows as Rows
  const kind = bin.kind as BinKind

  if (kind === 'ITEM' || kind === 'CAPTURE') {
    const roomId = (rows.items?.[0] ?? rows.captures?.[0])?.roomId as string
    const room = await tx.room.findFirst({ where: { id: roomId, inspectionId: bin.inspectionId }, select: { id: true } })
    if (!room) throw new Error('Its room was deleted. Restore the room first.')
  }
  if (kind === 'FINDING' && rows.findings?.[0]?.inspectionId !== bin.inspectionId) {
    throw new Error('Bin item not found')
  }

  const restoredIntoRoom = kind === 'ITEM' || kind === 'CAPTURE'
  if (rows.rooms?.length) await tx.room.createMany({ data: rows.rooms.map((row) => revive(row, ['baseline'])) as Prisma.RoomCreateManyInput[] })
  if (rows.captures?.length) {
    await tx.capture.createMany({
      // A photo coming back into a room someone already reviewed has not been reviewed
      // with that room, so it is unstamped like any new capture.
      data: rows.captures.map((row) => revive(restoredIntoRoom ? { ...row, processedAt: null } : row, ['annotations'])) as Prisma.CaptureCreateManyInput[],
    })
  }
  if (rows.items?.length) {
    // An item's source photo may have been deleted since; keep the line, drop the link.
    const sources = new Set((await tx.capture.findMany({
      where: { id: { in: rows.items.flatMap((row) => row.sourceCaptureId ? [row.sourceCaptureId as string] : []) } },
      select: { id: true },
    })).map((capture) => capture.id))
    await tx.inspectionItem.createMany({
      data: rows.items.map((row) => ({
        ...row,
        sourceCaptureId: row.sourceCaptureId && sources.has(row.sourceCaptureId as string) ? row.sourceCaptureId : null,
      })) as Prisma.InspectionItemCreateManyInput[],
    })
  }
  if (rows.evidence?.length) {
    const [items, captures] = await Promise.all([
      tx.inspectionItem.findMany({ where: { id: { in: rows.evidence.map((row) => row.itemId as string) } }, select: { id: true } }),
      tx.capture.findMany({ where: { id: { in: rows.evidence.map((row) => row.captureId as string) } }, select: { id: true } }),
    ])
    const itemIds = new Set(items.map((item) => item.id))
    const captureIds = new Set(captures.map((capture) => capture.id))
    await tx.itemEvidence.createMany({
      data: rows.evidence.filter((row) => itemIds.has(row.itemId as string) && captureIds.has(row.captureId as string)) as Prisma.ItemEvidenceCreateManyInput[],
      skipDuplicates: true,
    })
  }
  if (rows.findings?.length) await tx.finding.createMany({ data: rows.findings as Prisma.FindingCreateManyInput[] })

  // Relink rows that survived the delete, only where nothing has replaced the link since.
  for (const link of rows.findingLinks ?? []) {
    if (link.itemId) await tx.finding.updateMany({ where: { id: link.id, itemId: null }, data: { itemId: link.itemId } })
    if (link.baselineItemId) await tx.finding.updateMany({ where: { id: link.id, baselineItemId: null }, data: { baselineItemId: link.baselineItemId } })
  }
  for (const link of rows.sourceLinks ?? []) {
    await tx.inspectionItem.updateMany({ where: { id: link.itemId, sourceCaptureId: null }, data: { sourceCaptureId: link.captureId } })
  }
  if (rows.findingPhotos?.length) {
    for (const photo of rows.findingPhotos) {
      await tx.findingPhoto.updateMany({
        where: { clientId: photo.clientId },
        data: { deletedAt: null, ...(photo.findingId ? { findingId: photo.findingId } : {}) },
      })
    }
    const paths = await tx.findingPhoto.findMany({
      where: { clientId: { in: rows.findingPhotos.map((photo) => photo.clientId) } }, select: { storagePath: true },
    })
    await tx.storagePurge.deleteMany({ where: { path: { in: paths.map((photo) => photo.storagePath) }, completedAt: null } })
  }
  if (rows.findingDrafts?.length) {
    const findingId = rows.findings?.[0]?.id as string
    await tx.findingPhotoDraft.updateMany({ where: { id: { in: rows.findingDrafts.map((draft) => draft.id) } }, data: { findingId } })
    const reopened = rows.findingDrafts.filter((draft) => draft.open).map((draft) => draft.id)
    if (reopened.length) await tx.findingPhotoDraft.updateMany({ where: { id: { in: reopened } }, data: { discardedAt: null } })
  }
  if (rows.purgePaths?.length) {
    await tx.storagePurge.deleteMany({ where: { path: { in: rows.purgePaths }, completedAt: null } })
  }

  // A reviewed room that gains a line or a photo has to be reviewed again, as it does
  // when a new capture arrives.
  if (restoredIntoRoom) {
    const roomId = (rows.items?.[0] ?? rows.captures?.[0])?.roomId as string
    await tx.room.updateMany({ where: { id: roomId, status: 'REVIEWED' }, data: { status: 'REVIEW' } })
  }
  return bin
}
