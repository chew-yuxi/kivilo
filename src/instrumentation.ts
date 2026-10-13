import type { Instrumentation } from 'next'

/// Records every server error Next catches: renders, server actions, route handlers and
/// the proxy. Node only, because the recorder writes through Prisma. Next catches and
/// logs anything this throws, so a database outage costs the record, not the request.
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  const { recordServerError } = await import('@/lib/errors')
  const userAgent = request.headers['user-agent']
  await recordServerError(error, {
    context: context.routeType,
    path: request.path,
    userAgent: typeof userAgent === 'string' ? userAgent : null,
  })
}
