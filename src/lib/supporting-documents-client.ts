'use client'

export async function documentRequest<T>(path: string, ownerId: string, body?: unknown): Promise<T> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 25_000)
  try {
    const response = await fetch(path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { 'content-type': 'application/json', 'x-kivilo-owner': ownerId },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      cache: 'no-store',
      signal: controller.signal,
    })
    if (!response.ok) {
      if (response.status === 401) throw new Error('Sign in with the account that selected this file to continue.')
      if (response.status === 404) throw new Error('This account no longer has access to these documents.')
      if (response.status === 400 || response.status === 409) {
        const detail = await response.json() as { message?: unknown }
        throw new Error(typeof detail.message === 'string' ? detail.message : 'Check the file or details and try again.')
      }
      throw new Error('Could not finish this request. Please try again.')
    }
    // Keep the deadline through the response body, not just its headers.
    return await response.json() as T
  } catch (error) {
    if (controller.signal.aborted) throw new Error('This request timed out. Please try again.')
    throw error
  } finally {
    window.clearTimeout(timeout)
  }
}
