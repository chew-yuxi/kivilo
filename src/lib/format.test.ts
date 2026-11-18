import { describe, expect, it } from 'vitest'
import { propertyLabel, timecode } from './format'
import { currency, money, shortMoney } from './country'

describe('propertyLabel', () => {
  it('puts the unit first, as a Singapore address is written', () => {
    expect(
      propertyLabel({ line1: '2 Marina Boulevard', unit: '#28-05', postalCode: '018987', country: 'SG' }),
    ).toBe('#28-05, 2 Marina Boulevard, Singapore 018987')
  })

  it('omits the unit for landed property', () => {
    expect(propertyLabel({ line1: '12 Jalan Kembang Melati', unit: null, postalCode: '598234', country: 'SG' })).toBe(
      '12 Jalan Kembang Melati, Singapore 598234',
    )
  })
})

describe('propertyLabel in Malaysia', () => {
  it('writes the postcode before the country, as a Malaysian address is written', () => {
    expect(propertyLabel({ line1: 'Residensi Sentral, Jalan Tun Sambanthan, Kuala Lumpur', unit: 'A-12-3', postalCode: '50470', country: 'MY' }))
      .toBe('A-12-3, Residensi Sentral, Jalan Tun Sambanthan, Kuala Lumpur, 50470 Malaysia')
  })
})

describe('money', () => {
  it('prints Singapore amounts exactly as reports always have', () => {
    expect(money(1234.5, 'SG')).toBe('$1,234.50')
    expect(money('-20', 'SG')).toBe('-$20.00')
  })

  it('prints Malaysian amounts in ringgit', () => {
    expect(money(1234.5, 'MY')).toBe('RM\u00a01,234.50')
    expect(shortMoney('150', 'MY')).toBe('RM150')
    expect(shortMoney('150', 'SG')).toBe('S$150')
  })

  it('names each currency for the API', () => {
    expect(currency('SG')).toBe('SGD')
    expect(currency('MY')).toBe('MYR')
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
