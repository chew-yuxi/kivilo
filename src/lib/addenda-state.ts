import type { ItemCategory, ItemCondition } from '@/generated/prisma'

/// One inventory line as it currently stands. `key` names it across addenda:
/// `item:<id>` for a signed check-in item, `entry:<id>` for a line an addendum added.
export type StateLine = {
  key: string
  name: string
  category: ItemCategory
  condition: ItemCondition
  quantity: number
  identifier: string | null
  notes: string | null
  meterReading: string | null
  propertyAssetId: string | null
  createdAt: Date
}

/// A photo an addendum entry was published with, with its label ("Before") and note.
export type StatePhoto = { id: string; storagePath: string; label: string | null; note: string | null }

/// `roomId` is the signed check-in room this is, absent on a room only an addendum added.
/// `addendumPhotos` are the photos of the entries that changed it, in the order applied;
/// the check-in's own captures are not here.
export type StateRoom = { name: string; lines: StateLine[]; addendumPhotos: StatePhoto[]; roomId?: string }

/// What an addendum entry does to the state, as its snapshot records it.
export type StateChange = {
  change: 'ADDED' | 'REPLACED' | 'REMOVED'
  roomName: string
  targetKey: string | null
  line: Omit<StateLine, 'meterReading' | 'createdAt'> | null
  photos: StatePhoto[]
}

/// The signed check-in with addenda applied in the order given. Pure, so the draft
/// editor, publishing and check-out all read the same state.
///
/// A target that is not there came from an addendum that was never acknowledged: a
/// replacement then still adds its new line, since the new thing exists, and a removal
/// does nothing.
export function applyAddenda(
  rooms: StateRoom[],
  addenda: { at: Date; changes: StateChange[] }[],
): StateRoom[] {
  const state: StateRoom[] = rooms.map((room) => ({
    ...room,
    lines: [...room.lines],
    addendumPhotos: [...room.addendumPhotos],
  }))
  const roomFor = (name: string) => {
    const found = state.find((room) => room.name.toLowerCase() === name.trim().toLowerCase())
    if (found) return found
    const created: StateRoom = { name: name.trim(), lines: [], addendumPhotos: [] }
    state.push(created)
    return created
  }
  const locate = (key: string | null) => {
    for (const room of state) {
      const index = room.lines.findIndex((line) => line.key === key)
      if (index >= 0) return { room, index }
    }
    return null
  }

  for (const addendum of addenda) {
    addendum.changes.forEach((change, order) => {
      const target = locate(change.targetKey)
      // Lines are listed by createdAt, so an added line sorts after everything signed
      // before it, in the order the addendum lists it.
      const line = change.line && {
        ...change.line,
        meterReading: null,
        createdAt: new Date(addendum.at.getTime() + order),
      }
      // An entry's photos go to the room its change lands in, which for a targeted
      // change is the room holding the target, whatever name the entry carries.
      if (change.change === 'REMOVED') {
        if (target) {
          target.room.lines.splice(target.index, 1)
          target.room.addendumPhotos.push(...change.photos)
        }
      } else if (change.change === 'REPLACED' && target && line) {
        // Takes the old line's place, and its position in the room.
        target.room.lines[target.index] = { ...line, createdAt: target.room.lines[target.index].createdAt }
        target.room.addendumPhotos.push(...change.photos)
      } else if (line) {
        const room = roomFor(change.roomName)
        room.lines.push(line)
        room.addendumPhotos.push(...change.photos)
      }
    })
  }
  return state
}
