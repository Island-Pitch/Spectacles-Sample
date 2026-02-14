/* ============================================================
   sw.js — Service Worker
   SW-02: Versioned cache name
   SW-03: Navigation → network-first with /offline.html fallback
   SW-04: Static assets → stale-while-revalidate
   SW-05: Precache critical resources
   SW-06: skipWaiting + clients.claim
   SW-07: Broadcast update-available via postMessage
   SW-08: Listen for SKIP_WAITING message
   SW-11: Clean up old caches on activation
   ============================================================ */

// SW-02: Versioned cache name — bump this to bust cache
const CACHE_NAME = "pitch-world-v1";

// SW-05: Critical resources to precache
const PRECACHE_URLS = [
  "/",
  "/offline.html",
  "/assets/images/favicon/site.webmanifest",
];

// Static asset extensions for stale-while-revalidate (SW-04)
const STATIC_EXTENSIONS = [
  ".png", ".jpg", ".jpeg", ".webp", ".svg", ".gif",
  ".css", ".js", ".woff2", ".woff", ".ttf"
];

// ---- Install ----
self.addEventListener("install", (event) => {
  // SW-06: Skip waiting
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    })
  );
});

// ---- Activate ----
self.addEventListener("activate", (event) => {
  // SW-06: Claim all clients
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // SW-11: Delete old caches
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      ),
    ])
  );

  // SW-07: Broadcast update-available to all clients
  self.clients.matchAll().then((clients) => {
    clients.forEach((client) => {
      client.postMessage({ type: "SW_UPDATED", version: CACHE_NAME });
    });
  });
});

// ---- Fetch ----
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin requests
  if (request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  // Check if this is a static asset
  const isStaticAsset = STATIC_EXTENSIONS.some((ext) =>
    url.pathname.endsWith(ext)
  );

  if (request.mode === "navigate") {
    // SW-03: Navigation → network-first with offline fallback
    event.respondWith(
      fetch(request).catch(() => caches.match("/offline.html"))
    );
  } else if (isStaticAsset) {
    // SW-04: Static assets → stale-while-revalidate
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request)
          .then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return response;
          })
          .catch(() => cached);

        return cached || fetchPromise;
      })
    );
  }
});

// SW-08: Listen for SKIP_WAITING message from client
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
