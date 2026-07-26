const CACHE_NAME = "karuma-pwa-v4";
const OFFLINE_URL = "/offline.html";

// Tope de assets de /_next/static guardados. Sin él la caché crecía sin límite
// (137 entradas de builds distintos el 26/07) y la app podía quedarse mezclando
// código de despliegues viejos.
const MAX_STATIC_ENTRIES = 150;

const PRECACHE_URLS = [
  OFFLINE_URL,
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
];

/** Deja como mucho `max` assets, tirando los más antiguos (nunca el precache). */
async function trimCache(cache, max) {
  const keys = await cache.keys();
  const sobran = keys.length - max;
  if (sobran <= 0) return;
  // cache.keys() devuelve las entradas en orden de inserción.
  const descartables = keys.filter(
    (req) => !PRECACHE_URLS.includes(new URL(req.url).pathname),
  );
  await Promise.all(descartables.slice(0, sobran).map((req) => cache.delete(req)));
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Los assets de /_next/static llevan hash en el nombre: son inmutables y se
  // pueden servir desde caché. Se guardan sin la query (?dpl=<despliegue>) para
  // no acumular una copia por cada deploy del mismo fichero.
  if (url.pathname.startsWith("/_next/static/")) {
    if (event.request.method !== "GET") return;
    const cacheKey = new Request(url.origin + url.pathname);
    event.respondWith(
      caches.match(cacheKey).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            void caches.open(CACHE_NAME).then(async (cache) => {
              await cache.put(cacheKey, copy);
              await trimCache(cache, MAX_STATIC_ENTRIES);
            });
          }
          return response;
        });
      }),
    );
    return;
  }

  // El resto de /_next/ (payloads RSC, /_next/image…) depende del despliegue
  // activo: siempre a red, para no servir respuestas de un build anterior.
  if (url.pathname.startsWith("/_next/")) return;

  if (event.request.method !== "GET") return;

  if (event.request.mode === "navigate") {
    if (url.pathname === "/kiosk" || url.pathname.startsWith("/kiosk/")) {
      event.respondWith(
        fetch(event.request)
          .then((response) => {
            if (response.ok) {
              const copy = response.clone();
              void caches.open(CACHE_NAME).then((cache) => cache.put("/kiosk", copy));
            }
            return response;
          })
          .catch(() =>
            caches
              .match("/kiosk")
              .then((cached) => cached || caches.match(OFFLINE_URL))
              .then((cached) => cached || Response.error()),
          ),
      );
      return;
    }
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match(OFFLINE_URL).then((cached) => cached || Response.error()),
      ),
    );
    return;
  }

  if (url.origin === self.location.origin && PRECACHE_URLS.includes(url.pathname)) {
    event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
  }
});
