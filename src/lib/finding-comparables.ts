import { CAPTURE_BUCKET, serviceClient } from '@/lib/storage'
import { posterUrls } from '@/lib/poster-urls'
import { roomBaselineSchema, type CheckInLine } from '@/lib/check-in-reference'
import { toAnnotations } from '@/lib/annotations'
import type { Prisma } from '@/generated/prisma'

/// Loaded with the inspection, not once per room or item. URLs are minted only after
/// selecting at most two linked, agreed photos per item below.
export const comparableItemSelect = {
  id: true,
  roomId: true,
  name: true,
  category: true,
  condition: true,
  quantity: true,
  identifier: true,
  meterReading: true,
  notes: true,
  baselineKey: true,
  evidence: {
    where: { capture: { kind: 'PHOTO', processedAt: { not: null } } },
    orderBy: [{ createdAt: 'asc' }, { captureId: 'asc' }],
    select: {
      capture: { select: { id: true, roomId: true, storagePath: true, note: true, annotations: true } },
    },
  },
} satisfies Prisma.InspectionItemSelect

type Item = Prisma.InspectionItemGetPayload<{ select: typeof comparableItemSelect }>
type Photo = { id: string; storagePath: string; note: string | null; annotations: unknown }
type Room = { id: string; name: string; baseline?: Prisma.JsonValue; items: Item[] }
type OriginalRoom = { id: string; name: string; items: Item[]; captures: { id: string }[] }
type Source = {
  kind: string
  status: string
  rooms: Room[]
  /// The route scopes this relation with inspectionScope independently of check-out.
  baseline: { rooms: OriginalRoom[] } | null
}

/// Enriches an already-authorized inspection's chooser without writing anything.
/// Only its independently authorized check-in may expose frozen reference content.
export async function findingComparables(inspection: Source) {
  if (inspection.kind !== 'CHECK_OUT' || inspection.status !== 'COMPLETED') {
    return { checkOutItems: [], checkInItems: [] }
  }
  const originalRooms = inspection.baseline?.rooms ?? []
  const originalItems = originalRooms.flatMap((room) => room.items.map((item) => ({ item, room })))
  const originalByKey = new Map(originalItems.map(({ item, room }) => [`item:${item.id}`, { item, room }]))
  const originalPhotoRooms = new Map(originalRooms.flatMap((room) => room.captures.map((photo) => [photo.id, room.id] as const)))
  const frozenRooms = new Map(inspection.rooms.flatMap((room) =>
    inspection.baseline && room.baseline !== null && room.baseline !== undefined
      ? [[room.id, roomBaselineSchema.parse(room.baseline)] as const]
      : [],
  ))
  const frozenByKey = new Map<string, { line: CheckInLine; photos: Photo[] }>()
  const frozenOriginalRoomIds = new Set<string>()
  for (const frozen of frozenRooms.values()) {
    for (const line of frozen.lines) {
      const original = originalByKey.get(line.key)
      if (original) frozenOriginalRoomIds.add(original.room.id)
      // On older snapshots photoIds is absent. Do not guess which room photo shows it.
      const photoIds = new Set(line.photoIds ?? [])
      const photos = frozen.photos.filter((photo) => photoIds.has(photo.id)).slice(0, 2).map((photo) => ({
        id: photo.id, storagePath: photo.storagePath, note: photo.caption, annotations: photo.annotations,
      }))
      frozenByKey.set(line.key, { line, photos })
    }
    // Photos identify the source room even if every original line was retired. Names
    // cannot do this: rooms can be renamed or share one name.
    for (const photo of frozen.photos) {
      const roomId = originalPhotoRooms.get(photo.id)
      if (roomId) frozenOriginalRoomIds.add(roomId)
    }
  }

  const representedByItemIds = new Map<string, string[]>()
  for (const room of inspection.rooms) {
    for (const item of room.items) {
      // Exact keys survive renaming. Only pre-key rows use the same fallback as
      // createFinding, so duplicate names with keys never stand in for each other.
      const legacy = item.baselineKey === null ? originalItems.find(({ item: original, room: originalRoom }) =>
        original.name.toLowerCase() === item.name.toLowerCase() && originalRoom.name.toLowerCase() === room.name.toLowerCase(),
      ) : null
      const key = item.baselineKey ?? (legacy ? `item:${legacy.item.id}` : null)
      if (!key || !originalByKey.has(key)) continue
      const represented = representedByItemIds.get(key) ?? []
      represented.push(item.id)
      representedByItemIds.set(key, represented)
    }
  }

  const linkedPhotos = (item: Item) => item.evidence
    .filter(({ capture }) => capture.roomId === item.roomId)
    .slice(0, 2)
    .map(({ capture }) => ({ id: capture.id, storagePath: capture.storagePath, note: capture.note, annotations: capture.annotations }))

  const checkout = inspection.rooms.flatMap((room) => room.items.map((item) => {
    const frozen = frozenRooms.get(room.id)
    const line = item.baselineKey ? frozen?.lines.find((line) => line.key === item.baselineKey) : null
    const photoIds = new Set(line?.photoIds ?? [])
    return {
      item,
      room,
      photos: linkedPhotos(item),
      checkIn: line ? {
        ...line,
        photos: frozen!.photos.filter((photo) => photoIds.has(photo.id)).slice(0, 2).map((photo) => ({
          id: photo.id, storagePath: photo.storagePath, note: photo.caption, annotations: photo.annotations,
        })),
      } : null,
    }
  }))
  const checkin = originalItems.map(({ item, room }) => {
    const frozen = frozenByKey.get(`item:${item.id}`)
    return {
      item,
      room,
      frozen,
      photos: frozen ? frozen.photos : linkedPhotos(item),
      represented: representedByItemIds.get(`item:${item.id}`) ?? [],
      // A deleted whole check-out room removes its snapshot too. When ownership is
      // unknown, keep Missing available rather than treating deletion as retirement.
      includedAtCheckOutStart: frozen ? true : frozenOriginalRoomIds.has(room.id) ? false : null,
    }
  })

  const paths = [...new Set([
    ...checkout.flatMap((entry) => [...entry.photos, ...(entry.checkIn?.photos ?? [])]),
    ...checkin.flatMap((entry) => entry.photos),
  ].map((photo) => photo.storagePath))]
  const signed = new Map<string, string>()
  if (paths.length) {
    const { data, error } = await serviceClient().storage.from(CAPTURE_BUCKET).createSignedUrls(paths, 3600)
    if (error) throw error
    for (const photo of data) {
      if (photo.error || !photo.path || !photo.signedUrl) throw new Error('Could not sign a finding photo')
      signed.set(photo.path, photo.signedUrl)
    }
    if (paths.some((path) => !signed.has(path))) throw new Error('Could not sign a finding photo')
  }
  const posters = await posterUrls(paths)
  const photoView = (photo: Photo) => ({
    id: photo.id,
    url: signed.get(photo.storagePath)!,
    posterUrl: posters.get(photo.storagePath) ?? null,
    note: photo.note,
    annotations: toAnnotations(photo.annotations),
  })
  const itemView = (item: Item, room: { id: string; name: string }) => ({
    id: item.id,
    label: `${room.name} · ${item.name}`,
    roomId: room.id,
    roomName: room.name,
    name: item.name,
    category: item.category,
    condition: item.condition,
    quantity: item.quantity,
    identifier: item.identifier,
    meterReading: item.meterReading,
    notes: item.notes,
    baselineKey: item.baselineKey,
  })
  return {
    checkOutItems: checkout.map(({ item, room, photos, checkIn }) => ({
      ...itemView(item, room),
      photos: photos.map(photoView),
      checkIn: checkIn ? { ...checkIn, photos: checkIn.photos.map(photoView) } : null,
      representedAtCheckOut: true,
      representedByItemIds: [item.id],
      includedAtCheckOutStart: checkIn ? true : null,
    })),
    checkInItems: checkin.map(({ item, room, frozen, photos, represented, includedAtCheckOutStart }) => ({
      ...itemView(item, room),
      // Where an acknowledged condition notice changed the copied line, that frozen
      // condition/description is the check-in comparison, not its older signed value.
      ...(frozen ? {
        name: frozen.line.name,
        condition: frozen.line.condition,
        quantity: frozen.line.quantity,
        identifier: frozen.line.identifier,
        meterReading: frozen.line.meterReading,
        notes: frozen.line.notes,
      } : {}),
      photos: photos.map(photoView),
      checkIn: null,
      representedAtCheckOut: represented.length > 0,
      representedByItemIds: represented,
      includedAtCheckOutStart,
    })),
  }
}
