import { describe, expect, it } from 'vitest'
import { templateRows } from './room-templates'

const names = (roomName: string) => templateRows(roomName).map((row) => row.name)
const EVERY_ROOM = ['Walls', 'Ceiling', 'Floor', 'Door', 'Lights and switches']

describe('templateRows', () => {
  it('gives every room its surfaces, door and lights', () => {
    expect(names('Balcony')).toEqual(EVERY_ROOM)
    expect(names('Hallway')).toEqual(EVERY_ROOM)
    expect(templateRows('Store room').map((row) => row.category)).toEqual([
      'SURFACE',
      'SURFACE',
      'SURFACE',
      'FIXTURE',
      'FIXTURE',
    ])
  })

  it('adds the kitchen fittings to a room named as a kitchen, in any case', () => {
    const kitchen = [...EVERY_ROOM, 'Cabinets', 'Sink and tap', 'Hob', 'Cooker hood', 'Fridge', 'Washing machine']
    expect(names('Kitchen')).toEqual(kitchen)
    expect(names('DRY KITCHEN')).toEqual(kitchen)
    expect(templateRows('Kitchen').slice(-2).map((row) => row.category)).toEqual(['APPLIANCE', 'APPLIANCE'])
  })

  it('adds furniture to the rooms where it belongs without duplicate combined-room rows', () => {
    expect(names('Bedroom 2')).toEqual([...EVERY_ROOM, 'Bed', 'Wardrobe'])
    expect(names('Living / dining room')).toEqual([...EVERY_ROOM, 'Sofa', 'Table'])
    expect(names('Lounge / dining room')).toEqual([...EVERY_ROOM, 'Sofa', 'Table'])
    expect(names('Dining room')).toEqual([...EVERY_ROOM, 'Table'])
    expect(templateRows('Bedroom').slice(-2).map((row) => row.category)).toEqual(['FURNITURE', 'FURNITURE'])
  })

  it('adds the sanitary fittings to a bathroom, toilet, shower room or WC', () => {
    const bathroom = [...EVERY_ROOM, 'Toilet', 'Basin and tap', 'Shower', 'Mirror']
    for (const name of ['Master bathroom', 'Common Bath', 'Guest toilet', 'Shower room', 'WC']) {
      expect(names(name)).toEqual(bathroom)
    }
  })

  it('varies editable starter rows by furnishing level', () => {
    expect(templateRows('Kitchen', 'UNFURNISHED').map((row) => row.name)).toEqual([
      ...EVERY_ROOM, 'Cabinets', 'Sink and tap',
    ])
    expect(templateRows('Bedroom', 'PARTIALLY_FURNISHED').map((row) => row.name)).toEqual([
      ...EVERY_ROOM, 'Wardrobe',
    ])
    expect(templateRows('Living / dining room', 'PARTIALLY_FURNISHED').map((row) => row.name)).toEqual(EVERY_ROOM)
    expect(templateRows('Bedroom', 'FULLY_FURNISHED').map((row) => row.name)).toEqual([
      ...EVERY_ROOM, 'Bed', 'Wardrobe',
    ])
  })
})
