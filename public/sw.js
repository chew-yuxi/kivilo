// Keeps the app openable with no signal. Deliberately small: the queue in IndexedDB
// is what protects captures, and this only makes sure the inspector can still reach
// the screen that reads from it.
//
// Network-first for pages so an online inspector never sees a stale room list, with
// the cached shell as the fallback. Cache-first for build assets, which are
// content-hashed and so can never go stale within a build.

// The cache is named after the build that registered this worker. A new build
// registers /sw.js?v=<new build>, which is a different script, so it installs fresh
// and the activate handler below drops every cache from earlier builds. Without this
// the static cache would grow for the life of the install and never evict anything.
const BUILD = new URL(self.location.href).searchParams.get('v') || 'dev'
const CACHE = `kivilo-${BUILD}`
const SHELL = '/offline'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll([SHELL]))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key.startsWith('kivilo-') && key !== CACHE).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Never cache Server Action responses or route handlers.
  if (url.pathname.startsWith('/api/')) return

  // Reports are somebody else's private document reached by a bearer token. Keeping a
  // copy on this device after the agent has moved on is not something to do quietly.
  if (url.pathname.startsWith('/reports/')) return

  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ??
          fetch(request).then((response) => {
            const copy = response.clone()
            void caches.open(CACHE).then((cache) => cache.put(request, copy))
            return response
          }),
      ),
    )
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(SHELL).then((hit) => hit ?? Response.error())),
    )
  }
})
