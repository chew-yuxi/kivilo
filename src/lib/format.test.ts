import { describe, expect, it } from 'vitest'
import { propertyLabel, timecode } from './format'

describe('propertyLabel', () => {
  it('puts the unit first, as a Singapore address is written', () => {
    expect(
      propertyLabel({ line1: '2 Marina Boulevard', unit: '#28-05', postalCode: '018987' }),
    ).toBe('#28-05, 2 Marina Boulevard, Singapore 018987')
  })

  it('omits the unit for landed property', () => {
    expect(propertyLabel({ line1: '12 Jalan Kembang Melati', unit: null, postalCode: '598234' })).toBe(
      '12 Jalan Kembang Melati, Singapore 598234',
    )
  })
})

describe('timecode', () => {
  it('formats seconds into the video position an agent can scrub to', () => {
    expect(timecode(0)).toBe('0:00')
    expect(timecode(9)).toBe('0:09')
    expect(timecode(142)).toBe('2:22')
    expect(timecode(600)).toBe('10:00')
  })

  it('truncates fractional seconds rather than rounding past the frame', () => {
    expect(timecode(59.9)).toBe('0:59')
  })
})
