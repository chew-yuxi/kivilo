import { db } from '@/lib/db'
import { productEventBatch } from '@/lib/product-event-keys'

export async function recordProductEvents(stakeholderId: string, body: unknown) {
  const { source, events } = productEventBatch.parse(body)
  const now = Date.now()
  const { count } = await db.productEvent.createMany({
    data: events.map((event) => ({
      ...event,
      source,
      stakeholderId,
      occurredAt: new Date(Math.min(Date.parse(event.occurredAt), now)),
    })),
    skipDuplicates: true,
  })
  return count
}

export async function pruneProductEvents(now = new Date()) {
  return db.productEvent.deleteMany({
    where: { createdAt: { lt: new Date(now.getTime() - 90 * 86_400_000) } },
  })
}
