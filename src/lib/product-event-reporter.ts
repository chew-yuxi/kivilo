import type { ScreenName } from '@/lib/product-event-keys'

type PendingEvent = {
  id: string
  name: 'screen_viewed'
  properties: { screen: ScreenName }
  release: string | null
  occurredAt: string
}

const keyFor = (owner: string) => `kivilo:usage:${owner}`
const memory = new Map<string, PendingEvent[]>()
let memoryOnly = false

function pending(owner: string): PendingEvent[] {
  if (!memoryOnly) {
    try {
      const events: unknown = JSON.parse(localStorage.getItem(keyFor(owner)) ?? '[]')
      if (!Array.isArray(events)) throw new SyntaxError('Invalid usage queue')
      memory.set(owner, events)
    } catch (error) {
      // Browsers can deny storage, or keep a corrupt value. Keep this session's
      // usage in bounded memory so analytics cannot stop the inspection screen.
      if (!(error instanceof SyntaxError) && !(error instanceof DOMException)) throw error
      memoryOnly = true
    }
  }
  return memory.get(owner) ?? []
}

function save(owner: string, events: PendingEvent[]) {
  memory.set(owner, events)
  if (memoryOnly) return
  try {
    localStorage.setItem(keyFor(owner), JSON.stringify(events))
  } catch (error) {
    if (!(error instanceof DOMException)) throw error
    memoryOnly = true
  }
}

export function reportScreen(owner: string, screen: ScreenName) {
  const event: PendingEvent = {
    id: crypto.randomUUID(),
    name: 'screen_viewed',
    properties: { screen },
    release: process.env.NEXT_PUBLIC_BUILD_ID ?? null,
    occurredAt: new Date().toISOString(),
  }
  save(owner, [...pending(owner), event].slice(-20))
  void flushProductEvents(owner)
}

export async function flushProductEvents(owner: string) {
  const events = pending(owner)
  if (!events.length) return
  let response: Response
  try {
    response = await fetch('/api/v1/events', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-kivilo-owner': owner },
      body: JSON.stringify({ source: 'WEB', events }),
    })
  } catch {
    // Offline events wait for the next page load or online event.
    return
  }
  if (!response.ok && response.status !== 400) return
  const sent = new Set(events.map((event) => event.id))
  save(owner, pending(owner).filter((event) => !sent.has(event.id)))
}
