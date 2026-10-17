import { z } from 'zod'

export const screenName = z.enum([
  'inspections', 'new_inspection', 'inspection', 'room', 'capture',
  'account', 'renewal', 'report', 'addenda',
])

export type ScreenName = z.infer<typeof screenName>

/// Paths never leave the client. A report's token, a unit's ID and query parameters
/// cannot accidentally become analytics properties.
export function screenForPath(path: string): ScreenName | null {
  if (path === '/inspections') return 'inspections'
  if (path === '/inspections/new') return 'new_inspection'
  if (/^\/inspections\/[^/]+\/rooms\/[^/]+\/capture$/.test(path)) return 'capture'
  if (/^\/inspections\/[^/]+\/rooms\/[^/]+$/.test(path)) return 'room'
  if (/^\/inspections\/[^/]+$/.test(path)) return 'inspection'
  if (path === '/account') return 'account'
  if (/^\/renewals\/[^/]+$/.test(path)) return 'renewal'
  return null
}

export const productEventBatch = z.object({
  source: z.enum(['WEB', 'ANDROID', 'IOS']).default('WEB'),
  events: z.array(z.object({
    id: z.uuid(),
    name: z.literal('screen_viewed'),
    properties: z.object({ screen: screenName }).strict(),
    release: z.string().max(64).nullable().default(null),
    occurredAt: z.iso.datetime(),
  }).strict()).min(1).max(20),
}).strict()
