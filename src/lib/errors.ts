import { createHash } from 'node:crypto'
import { z } from 'zod'
import { db } from '@/lib/db'
import { sendErrorAlert } from '@/lib/email'
import type { ErrorSource } from '@/generated/prisma'

/// Error tracking, in our own database. The server records what it throws through
/// `src/instrumentation.ts` and `authed`; an agent's browser and the app post the rest to
/// `/api/v1/errors`. Every occurrence is a row, grouped by fingerprint when read, and a
/// cron emails each kind of error the first time it is seen.

const RETENTION_DAYS = 90

/// Ids, counts and hashes change between occurrences of one bug, so they come out before
/// hashing. Otherwise every inspection would be its own error.
export function normalize(text: string) {
  return text
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':uuid')
    .replace(/\bc[a-z0-9]{24}\b/g, ':id')
    .replace(/\d+/g, ':n')
}

/// A signed storage URL carries its token as a JWT, and the app's errors quote URLs: an
/// upload or a photo that failed to load names the link it failed on. The link expires,
/// but it is still a credential, so it is cut before anything is stored or mailed.
export function redactSecrets(text: string) {
  return text.replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, ':jwt')
}

/// A report path carries its share token, which is a bearer credential, so it never
/// reaches this table or an alert email. The query string goes for the same reason.
export function redactPath(path: string) {
  return path.split(/[?#]/)[0].replace(/^\/reports\/[^/]+/, '/reports/:token')
}

export function fingerprint(error: {
  source: ErrorSource
  name: string
  message: string
  path: string | null
}) {
  return createHash('sha256')
    .update([error.source, error.name, normalize(error.message), normalize(error.path ?? '')].join('\n'))
    .digest('hex')
    .slice(0, 16)
}

const clientErrorBatch = z.object({
  /// The browser has never sent one, so a batch without it is the web app's.
  source: z.enum(['WEB', 'ANDROID', 'IOS']).default('WEB'),
  errors: z.array(z.object({
    id: z.uuid(),
    context: z.enum(['boundary', 'window', 'rejection', 'flutter', 'platform', 'caught']),
    name: z.string().max(200),
    message: z.string().max(2000),
    stack: z.string().max(8000).nullable(),
    /// The app has no URL to give.
    path: z.string().max(500).nullable(),
    release: z.string().max(64).nullable(),
    occurredAt: z.iso.datetime(),
  })).min(1).max(20),
})

/// A batch from an agent's browser or the app. The ids are the client's own, so a batch
/// sent twice, because the response was lost on a bad connection, is recorded once.
export async function recordClientErrors(stakeholderId: string, body: unknown, userAgent: string | null) {
  const { source, errors } = clientErrorBatch.parse(body)
  const now = Date.now()
  const { count } = await db.errorEvent.createMany({
    data: errors.map((error) => {
      const path = error.path === null ? null : redactPath(error.path)
      const message = redactSecrets(error.message)
      return {
        id: error.id,
        source,
        context: error.context,
        name: error.name,
        message,
        stack: error.stack === null ? null : redactSecrets(error.stack),
        path,
        release: error.release,
        userAgent: userAgent?.slice(0, 300) ?? null,
        fingerprint: fingerprint({ source, name: error.name, message, path }),
        stakeholderId,
        // A report can wait days on a phone with no signal, but a phone's clock can be
        // anywhere, and nothing happened in the future.
        occurredAt: new Date(Math.min(Date.parse(error.occurredAt), now)),
      }
    }),
    skipDuplicates: true,
  })
  return count
}

/// A server error. `onRequestError` passes renders, server actions and route handlers;
/// `authed` passes its own failures, which it turns into a 500 before Next sees them.
export async function recordServerError(
  error: unknown,
  at: { context: string; path: string; userAgent: string | null; stakeholderId?: string },
) {
  const { name, message: raw, stack } = error instanceof Error
    ? error
    : { name: 'NonError', message: String(error), stack: undefined }
  const path = redactPath(at.path)
  const message = redactSecrets(raw)
  await db.errorEvent.create({
    data: {
      source: 'SERVER',
      context: at.context,
      name,
      message: message.slice(0, 2000),
      stack: stack === undefined ? null : redactSecrets(stack).slice(0, 8000),
      digest: typeof error === 'object' && error !== null && 'digest' in error
        ? String(error.digest)
        : null,
      path,
      release: process.env.NEXT_PUBLIC_BUILD_ID ?? null,
      userAgent: at.userAgent?.slice(0, 300) ?? null,
      fingerprint: fingerprint({ source: 'SERVER', name, message, path }),
      stakeholderId: at.stakeholderId ?? null,
      occurredAt: new Date(),
    },
  })
}

/// Emails each kind of error the first time it is seen, then stamps everything pending,
/// so a recurrence never mails again. Only fingerprints read here are stamped: one that
/// first arrives mid-run stays pending for the next run rather than being marked seen
/// without anyone being told.
export async function alertNewErrors(now = new Date()) {
  const to = process.env.ERROR_ALERT_TO
  if (!to) throw new Error('ERROR_ALERT_TO must be set')

  const pending = await db.errorEvent.groupBy({
    by: ['fingerprint'],
    // Billing incidents are reviewed in /admin. They must not enter the error email
    // outbox; their safe details and Stripe links stay behind the admin boundary.
    where: { notifiedAt: null, context: { not: 'stripe_billing' } },
    _count: true,
  })
  const fingerprints = pending.map((group) => group.fingerprint)
  const known = new Set((await db.errorEvent.findMany({
    where: { fingerprint: { in: fingerprints }, notifiedAt: { not: null }, context: { not: 'stripe_billing' } },
    distinct: ['fingerprint'],
    select: { fingerprint: true },
  })).map((event) => event.fingerprint))

  const fresh = await Promise.all(
    pending
      .filter((group) => !known.has(group.fingerprint))
      .map(async (group) => ({
        count: group._count,
        latest: await db.errorEvent.findFirstOrThrow({
          where: { fingerprint: group.fingerprint, context: { not: 'stripe_billing' } },
          orderBy: { occurredAt: 'desc' },
        }),
      })),
  )
  if (fresh.length) await sendErrorAlert(to, fresh)

  await db.errorEvent.updateMany({
    where: { notifiedAt: null, fingerprint: { in: fingerprints }, context: { not: 'stripe_billing' } },
    data: { notifiedAt: now },
  })
  const { count: pruned } = await db.errorEvent.deleteMany({
    where: { createdAt: { lt: new Date(now.getTime() - RETENTION_DAYS * 86_400_000) } },
  })
  return { new: fresh.length, recurring: pending.length - fresh.length, pruned }
}
