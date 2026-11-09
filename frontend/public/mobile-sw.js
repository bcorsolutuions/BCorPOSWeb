// Waiter Mobile Ordering §36/§37 — deliberately minimal: app-shell + static
// asset caching only, no API/data caching (every screen already re-fetches
// live via react-query, and Open Item/price/tax must never be served stale).
// Scoped to /mobile only (see the <script> registration in
// app/[locale]/mobile/(app)/layout.tsx), so it never intercepts the desktop
// POS's own requests.
const CACHE_NAME = "bcor-waiter-shell-v1";
const SHELL_URLS = ["/mobile", "/mobile-manifest.json", "/branding/logo.jpeg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

// Network-first for navigations/API calls (always want fresh data when
// online); cache-first fallback only kicks in when the network is actually
// unreachable — this is what lets the app SHELL still open offline, it does
// not mean stale order/menu data is ever preferred over live data.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request).then((cached) => cached ?? caches.match("/mobile"))),
  );
});
