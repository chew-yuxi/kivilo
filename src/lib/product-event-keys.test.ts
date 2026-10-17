import { describe, expect, it } from 'vitest'
import { productEventBatch, screenForPath } from '@/lib/product-event-keys'

const event = {
  id: '123e4567-e89b-42d3-a456-426614174000',
  name: 'screen_viewed',
  properties: { screen: 'inspection' },
  occurredAt: '2026-10-17T00:00:00.000Z',
}

describe('usage allowlist', () => {
  it('reduces working paths to categories and excludes bearer report paths', () => {
    expect(screenForPath('/inspections/private-id/rooms/room-id/capture')).toBe('capture')
    expect(screenForPath('/inspections/private-id/rooms/room-id')).toBe('room')
    expect(screenForPath('/inspections/new')).toBe('new_inspection')
    expect(screenForPath('/reports/secret-token')).toBeNull()
    expect(screenForPath('/sign/private-id')).toBeNull()
    expect(screenForPath('/admin')).toBeNull()
  })

  it('rejects names and properties outside the allowlist, including client identity', () => {
    expect(productEventBatch.safeParse({ events: [event] }).success).toBe(true)
    expect(productEventBatch.safeParse({ events: [{ ...event, name: 'arbitrary' }] }).success).toBe(false)
    expect(productEventBatch.safeParse({ events: [{ ...event, properties: { screen: 'inspection', path: '/reports/secret' } }] }).success).toBe(false)
    expect(productEventBatch.safeParse({ events: [event], stakeholderId: 'someone-else' }).success).toBe(false)
    expect(productEventBatch.safeParse({ events: [{ ...event, properties: { screen: 'arbitrary' } }] }).success).toBe(false)
  })
})
