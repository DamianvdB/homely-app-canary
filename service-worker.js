const CACHE_NAME = "homely-cache-v1";

// Adjust this list depending on your actual build output
const OFFLINE_ASSETS = [
  "./",
  "./index.html",
  "./composeApp.js",
  "./composeApp.wasm",
  "./styles.css",
];

// Install: pre-cache core assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(OFFLINE_ASSETS);
    })
  );
});

// Activate: clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
});

// Fetch handler: network-first for navigation, cache-first for static assets
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Handle navigation requests (SPA fallback)
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() =>
        caches.match("./index.html", { cacheName: CACHE_NAME })
      )
    );
    return;
  }

  // Handle Compose resources with network-first strategy
  if (url.pathname.includes("/composeResources/") || url.pathname.includes(".cvr")) {
    event.respondWith(
      fetch(req)
        .then((networkRes) => {
          // Cache successful responses
          if (networkRes.ok) {
            return caches.open(CACHE_NAME).then((cache) => {
              cache.put(req, networkRes.clone());
              return networkRes;
            });
          }
          return networkRes;
        })
        .catch(() => {
          // Fallback to cache if network fails
          return caches.match(req);
        })
    );
    return;
  }

  // For other requests (JS, CSS, WASM, images)
  event.respondWith(
    caches.match(req).then((cacheRes) => {
      return (
        cacheRes ||
        fetch(req).then((networkRes) => {
          // Cache new files
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, networkRes.clone());
            return networkRes;
          });
        })
      );
    })
  );
});