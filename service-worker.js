const CACHE = "tuvi-battu-web-v1.18";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./styles-autonomous.css",
  "./app.js",
  "./autonomous.js",
  "./offline-summary.js",
  "./engine-worker.js",
  "./engine.zip",
  "./manifest.webmanifest",
  "./vendor/pyodide/pyodide.js",
  "./vendor/pyodide/pyodide.asm.js",
  "./vendor/pyodide/pyodide.asm.wasm",
  "./vendor/pyodide/python_stdlib.zip",
  "./vendor/pyodide/pyodide-lock.json",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    for (const asset of CORE_ASSETS) {
      const response = await fetch(asset, { cache: "no-store" });
      if (!response.ok) throw new Error(`Cannot cache ${asset}: HTTP ${response.status}`);
      await cache.put(asset, response);
    }
  })());
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  const isDocument = event.request.mode === "navigate";
  const isVersionedCore = /\/(index\.html|app\.js|autonomous\.js|offline-summary\.js|styles\.css|styles-autonomous\.css|engine-worker\.js|service-worker\.js|engine\.zip)$/.test(url.pathname);
  if (isDocument || isVersionedCore) {
    event.respondWith(fetch(event.request, { cache: "no-store" })
      .then(async (response) => {
        if (response.ok) {
          const cache = await caches.open(CACHE);
          await cache.put(event.request, response.clone());
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((hit) => hit || caches.match("./index.html"))));
    return;
  }

  event.respondWith(caches.match(event.request).then((hit) => hit || fetch(event.request).then(async (response) => {
    if (response.ok) {
      const cache = await caches.open(CACHE);
      await cache.put(event.request, response.clone());
    }
    return response;
  })));
});
