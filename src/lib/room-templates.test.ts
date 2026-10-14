import { describe, expect, it } from 'vitest'
import { templateRows } from './room-templates'

const names = (roomName: string) => templateRows(roomName).map((row) => row.name)
const EVERY_ROOM = ['Walls', 'Ceiling', 'Floor', 'Door', 'Lights and switches']

describe('templateRows', () => {
  it('gives every room its surfaces, door and lights', () => {
    expect(names('Bedroom 2')).toEqual(EVERY_ROOM)
    expect(names('Balcony')).toEqual(EVERY_ROOM)
    expect(templateRows('Living room').map((row) => row.category)).toEqual([
      'SURFACE',
      'SURFACE',
      'SURFACE',
      'FIXTURE',
      'FIXTURE',
    ])
  })

  it('adds the kitchen fittings to a room named as a kitchen, in any case', () => {
    const kitchen = [...EVERY_ROOM, 'Cabinets', 'Sink and tap', 'Hob', 'Cooker hood']
    expect(names('Kitchen')).toEqual(kitchen)
    expect(names('DRY KITCHEN')).toEqual(kitchen)
    expect(templateRows('Kitchen').slice(-2).map((row) => row.category)).toEqual(['APPLIANCE', 'APPLIANCE'])
  })

  it('adds the sanitary fittings to a bathroom, toilet, shower room or WC', () => {
    const bathroom = [...EVERY_ROOM, 'Toilet', 'Basin and tap', 'Shower', 'Mirror']
    for (const name of ['Master bathroom', 'Common Bath', 'Guest toilet', 'Shower room', 'WC']) {
      expect(names(name)).toEqual(bathroom)
    }
  })
})
