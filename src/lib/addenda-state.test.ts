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
  { name: 'Kitchen', lines: [line('item:hob', 'Hob'), line('item:dishwasher', 'Dishwasher', { identifier: 'Bosch SMS2' })] },
  { name: 'Utility', lines: [line('item:dryer', 'Dryer')] },
]

describe('applyAddenda', () => {
  it('adds, replaces in place and removes, in order', () => {
    const state = applyAddenda(signed, [
      { at: new Date('2026-03-01'), changes: [
        { change: 'REPLACED', roomName: 'Kitchen', targetKey: 'item:dishwasher', line: added('entry:dw2', 'Dishwasher') },
        { change: 'ADDED', roomName: 'helper room', targetKey: null, line: added('entry:fan', 'Ceiling fan') },
      ] },
      { at: new Date('2026-04-01'), changes: [
        { change: 'REMOVED', roomName: 'Utility', targetKey: 'item:dryer', line: null },
        { change: 'ADDED', roomName: 'kitchen', targetKey: null, line: added('entry:oven', 'Oven') },
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
        { change: 'REPLACED', roomName: 'Kitchen', targetKey: 'entry:missing', line: added('entry:new', 'New hob') },
        { change: 'REMOVED', roomName: 'Kitchen', targetKey: 'entry:gone', line: null },
      ] },
    ])
    expect(state[0].lines.map((l) => l.key)).toEqual(['item:hob', 'item:dishwasher', 'entry:new'])
  })
})
