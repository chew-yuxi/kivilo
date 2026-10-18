import { describe, expect, it } from 'vitest'
import { applyAddenda, type StateChange, type StateLine, type StateRoom } from './addenda-state'

function line(key: string, name: string, extra: Partial<StateLine> = {}): StateLine {
  return {
    key, name, category: 'APPLIANCE', condition: 'GOOD', quantity: 1, identifier: null,
    notes: null, meterReading: null, propertyAssetId: null, createdAt: new Date('2026-01-01'), ...extra,
  }
}

function added(key: string, name: string): StateChange['line'] {
  return { key, name, category: 'APPLIANCE', condition: 'NEW', quantity: 1, identifier: null, notes: null, propertyAssetId: null }
}

const signed: StateRoom[] = [
  { name: 'Kitchen', lines: [line('item:hob', 'Hob'), line('item:dishwasher', 'Dishwasher', { identifier: 'Bosch SMS2' })], addendumPhotos: [] },
  { name: 'Utility', lines: [line('item:dryer', 'Dryer')], addendumPhotos: [] },
]

describe('applyAddenda', () => {
  it('adds, replaces in place and removes, in order', () => {
    const state = applyAddenda(signed, [
      { at: new Date('2026-03-01'), changes: [
        { change: 'REPLACED', roomName: 'Kitchen', targetKey: 'item:dishwasher', line: added('entry:dw2', 'Dishwasher'), photos: [] },
        { change: 'ADDED', roomName: 'helper room', targetKey: null, line: added('entry:fan', 'Ceiling fan'), photos: [] },
      ] },
      { at: new Date('2026-04-01'), changes: [
        { change: 'REMOVED', roomName: 'Utility', targetKey: 'item:dryer', line: null, photos: [] },
        { change: 'ADDED', roomName: 'kitchen', targetKey: null, line: added('entry:oven', 'Oven'), photos: [] },
      ] },
    ])

    expect(state.map((room) => [room.name, room.lines.map((l) => l.key)])).toEqual([
      ['Kitchen', ['item:hob', 'entry:dw2', 'entry:oven']],
      ['Utility', []],
      ['helper room', ['entry:fan']],
    ])
    // The replacement keeps the replaced line's place in the room.
    expect(state[0].lines[1].createdAt).toEqual(new Date('2026-01-01'))
    expect(state[0].lines[2].createdAt).toEqual(new Date('2026-04-01T00:00:00.001Z'))
    // The input is not touched.
    expect(signed[0].lines.map((l) => l.key)).toEqual(['item:hob', 'item:dishwasher'])
  })

  it('still adds a replacement whose target never arrived, and ignores a removal of one', () => {
    const state = applyAddenda(signed, [
      { at: new Date('2026-03-01'), changes: [
        { change: 'REPLACED', roomName: 'Kitchen', targetKey: 'entry:missing', line: added('entry:new', 'New hob'), photos: [] },
        { change: 'REMOVED', roomName: 'Kitchen', targetKey: 'entry:gone', line: null, photos: [] },
      ] },
    ])
    expect(state[0].lines.map((l) => l.key)).toEqual(['item:hob', 'item:dishwasher', 'entry:new'])
  })

  it('puts each entry\'s photos in the room its change lands in, by target before name', () => {
    const photo = (id: string) => ({ id, storagePath: `addenda/a/${id}.jpg`, label: null, note: null })
    const bedrooms: StateRoom[] = [
      { name: 'Bedroom', lines: [line('item:bed', 'Bed')], addendumPhotos: [] },
      { name: 'Bedroom', lines: [line('item:wardrobe', 'Wardrobe')], addendumPhotos: [] },
    ]
    const state = applyAddenda(bedrooms, [
      { at: new Date('2026-03-01'), changes: [
        { change: 'REPLACED', roomName: 'Bedroom', targetKey: 'item:wardrobe', line: added('entry:w2', 'Wardrobe'), photos: [photo('new-wardrobe')] },
        { change: 'ADDED', roomName: 'bedroom', targetKey: null, line: added('entry:lamp', 'Lamp'), photos: [photo('lamp')] },
        { change: 'REMOVED', roomName: 'Bedroom', targetKey: 'entry:gone', line: null, photos: [photo('nothing')] },
      ] },
    ])
    expect(state.map((room) => room.addendumPhotos.map((each) => each.id))).toEqual([['lamp'], ['new-wardrobe']])
    expect(bedrooms[1].addendumPhotos).toEqual([])
  })

  it('keeps one physical item for frozen condition notices and never resurrects a replaced item', () => {
    const first = {
      change: 'REPLACED' as const, roomName: 'Kitchen', targetKey: 'item:hob',
      line: { ...added('entry:first-notice', 'Hob')!, condition: 'FAIR' as const },
      photos: [], conditionOnly: true, conditionNote: 'Scratch at move-in',
    }
    const second = {
      ...first, line: { ...added('entry:second-notice', 'Hob')!, condition: 'DAMAGED' as const },
      conditionNote: 'Broken switch at move-in',
    }
    const state = applyAddenda(signed, [
      { at: new Date('2026-03-01'), changes: [first] },
      { at: new Date('2026-03-02'), changes: [second] },
    ])
    expect(state[0].lines.map((item) => item.key)).toEqual(['item:hob', 'item:dishwasher'])
    expect(state[0].lines[0]).toMatchObject({ condition: 'DAMAGED', notes: 'Scratch at move-in\nBroken switch at move-in', updatedByAddendum: true })
    const replaced = applyAddenda(signed, [
      { at: new Date('2026-03-01'), changes: [{ change: 'REPLACED', roomName: 'Kitchen', targetKey: 'item:hob', line: added('entry:new-hob', 'New hob'), photos: [] }] },
      { at: new Date('2026-03-02'), changes: [second] },
    ])
    expect(replaced[0].lines.map((item) => item.key)).toEqual(['entry:new-hob', 'item:dishwasher'])
    expect(replaced[0].lines[0]).toMatchObject({ name: 'New hob', condition: 'NEW', notes: null })
  })
})
