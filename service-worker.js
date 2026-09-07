const CACHE = "tuvi-battu-web-v1.23-cpu-wasm-fallback-1";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./styles-autonomous.css",
  "./app.js",
  "./autonomous.js",
  "./webgpu-failure-guard.js",
  "./cpu-ai-fallback.js",
  "./offline-summary.js",
  "./hiep-tuvi-ai.js",
  "./hiep-tuvi-knowledge.js",
  "./knowledge/stars.js",
  "./knowledge/minor-stars.js",
  "./knowledge/all-stars.js",
  "./knowledge/palaces.js",
  "./knowledge/combinations.js",
  "./knowledge/structures.js",
  "./knowledge/bazi.js",
  "./knowledge/schools.js",
  "./browser-ai.js",
  "./browser-ai-worker.js",
  "./browser-cpu-ai.js",
  "./browser-cpu-ai-worker.js",
  "./engine-worker.js",
  "./engine.zip",
  "./manifest.webmanifest",
  "./vendor/pyodide/pyodide.js",
  "./vendor/pyodide/pyodide.asm.js",
  "./vendor/pyodide/pyodide.asm.wasm",
  "./vendor/pyodide/python_stdlib.zip",
  "./vendor/pyodide/pyodide-lock.json",
];

let hiepAiEndpoint = "";

function normalizeAiEndpoint(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function validAiEndpoint(value) {
  return value.startsWith("https://") || value.startsWith("http://localhost") || value.startsWith("http://127.0.0.1");
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

async function proxyAiHealth() {
  if (!hiepAiEndpoint) return jsonResponse({ error: "Chưa cấu hình AI fallback." }, 503);
  try {
    const response = await fetch(hiepAiEndpoint, {
      method: "GET",
      headers: { "Accept": "application/json" },
      cache: "no-store",
    });
    const body = await response.text();
    return new Response(body, {
      status: response.status,
      headers: { "Content-Type": response.headers.get("Content-Type") || "application/json; charset=utf-8", "Cache-Control": "no-store" },
    });
  } catch (error) {
    return jsonResponse({ error: `AI fallback health lỗi: ${String(error?.message || error)}` }, 502);
  }
}

async function proxyAiAnalyze(request) {
  if (!hiepAiEndpoint) return jsonResponse({ error: "Chưa cấu hình AI fallback." }, 503);
  try {
    const body = await request.arrayBuffer();
    const response = await fetch(`${hiepAiEndpoint}/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": request.headers.get("Content-Type") || "application/json",
        "Accept": "application/json",
      },
      body,
      cache: "no-store",
    });
    const result = await response.arrayBuffer();
    return new Response(result, {
      status: response.status,
      headers: { "Content-Type": response.headers.get("Content-Type") || "application/json; charset=utf-8", "Cache-Control": "no-store" },
    });
  } catch (error) {
    return jsonResponse({ error: `AI fallback analyze lỗi: ${String(error?.message || error)}` }, 502);
  }
}

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type !== "hiep-ai-endpoint") return;
  const endpoint = normalizeAiEndpoint(data.endpoint);
  const ok = validAiEndpoint(endpoint);
  hiepAiEndpoint = ok ? endpoint : "";
  const port = event.ports?.[0];
  if (port) {
    port.postMessage(ok
      ? { ok: true }
      : { ok: false, error: "AI fallback phải dùng HTTPS hoặc localhost." });
  }
});

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
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.endsWith("/__hiep_ai_proxy__/health")) {
    event.respondWith(proxyAiHealth());
    return;
  }
  if (url.pathname.endsWith("/__hiep_ai_proxy__/analyze")) {
    if (event.request.method !== "POST") {
      event.respondWith(jsonResponse({ error: "Method not allowed" }, 405));
      return;
    }
    event.respondWith(proxyAiAnalyze(event.request));
    return;
  }

  if (event.request.method !== "GET") return;

  const isDocument = event.request.mode === "navigate";
  const isVersionedCore = /\/(index\.html|app\.js|autonomous\.js|webgpu-failure-guard\.js|cpu-ai-fallback\.js|offline-summary\.js|hiep-tuvi-ai\.js|hiep-tuvi-knowledge\.js|browser-ai\.js|browser-ai-worker\.js|browser-cpu-ai\.js|browser-cpu-ai-worker\.js|styles\.css|styles-autonomous\.css|engine-worker\.js|service-worker\.js|engine\.zip)$/.test(url.pathname)
    || /\/knowledge\/(stars|minor-stars|all-stars|palaces|combinations|structures|bazi|schools)\.js$/.test(url.pathname);
  if (isDocument || isVersionedCore) {
    event.respondWith(fetch(event.request, { cache: "no-store" })
      .then(async (response) => {
        if (response.ok) {
          const cache = await caches.open(CACHE);
          await cache.put(event.request, response.clone());
        }
        return response;
      })
      .catch(async () => {
        const hit = await caches.match(event.request, { ignoreSearch: true });
        if (hit) return hit;
        if (isDocument) return caches.match("./index.html");
        throw new Error(`Offline core asset missing: ${url.pathname}`);
      }));
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
