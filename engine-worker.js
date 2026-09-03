/* Tu Vi + Bat Tu Web - self-hosted Pyodide worker v1.18 */
const PYODIDE_VERSION = "0.27.7";
const PYODIDE_BASE = new URL("./vendor/pyodide/", self.location.href).href;
const PYODIDE_SCRIPT = new URL("pyodide.js", PYODIDE_BASE).href;
let pyodide = null;
let ready = false;

async function fetchWithTimeout(url, options = {}, timeoutMs = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function boot() {
  try {
    postMessage({ type: "status", message: `Đang tải bộ máy cục bộ ${PYODIDE_VERSION}...`, progress: 12 });
    importScripts(PYODIDE_SCRIPT);
    if (typeof loadPyodide !== "function") throw new Error("vendor/pyodide/pyodide.js không hợp lệ");
    pyodide = await loadPyodide({ indexURL: PYODIDE_BASE });

    postMessage({ type: "status", message: "Đang nạp quy tắc Tử Vi và Bát Tự...", progress: 62 });
    const engineCandidates = [
      new URL("./engine.zip", self.location.href),
      new URL("./assets/engine.zip", self.location.href),
    ];
    let response = null;
    const errors = [];
    for (const url of engineCandidates) {
      try {
        const candidate = await fetchWithTimeout(url, { cache: "no-store" }, 30000);
        if (candidate.ok) { response = candidate; break; }
        errors.push(`${url.pathname}: HTTP ${candidate.status}`);
      } catch (error) {
        errors.push(`${url.pathname}: ${String(error?.message || error)}`);
      }
    }
    if (!response) throw new Error(`Không tải được engine.zip. ${errors.join(" | ")}`);

    const archive = new Uint8Array(await response.arrayBuffer());
    pyodide.FS.writeFile("/tmp/engine.zip", archive);
    await pyodide.runPythonAsync(`
import os, sys, zipfile
os.makedirs('/app', exist_ok=True)
with zipfile.ZipFile('/tmp/engine.zip') as z:
    for member in z.infolist():
        target = os.path.realpath(os.path.join('/app', member.filename))
        if not target.startswith('/app/'):
            raise ValueError('engine.zip contains an unsafe path')
    z.extractall('/app')
if '/app' not in sys.path:
    sys.path.insert(0, '/app')
import web_api
`);
    ready = true;
    postMessage({ type: "ready", message: "Bộ máy cục bộ đã sẵn sàng", progress: 100 });
  } catch (error) {
    postMessage({
      type: "fatal",
      error: `Khởi động thất bại: ${String(error?.message || error)}. Kiểm tra thư mục vendor/pyodide.`,
    });
  }
}

boot();

self.onmessage = async (event) => {
  const { id, action, payload } = event.data || {};
  if (!ready) {
    postMessage({ type: "response", id, ok: false, error: "Bộ máy chưa sẵn sàng" });
    return;
  }
  try {
    let raw;
    if (action === "generate") {
      pyodide.globals.set("_web_payload", JSON.stringify(payload));
      raw = await pyodide.runPythonAsync("web_api.generate_chart_json(_web_payload)");
    } else if (action === "prompt") {
      pyodide.globals.set("_web_kind", String(payload.kind));
      pyodide.globals.set("_web_index", Number(payload.index || 0));
      raw = await pyodide.runPythonAsync("web_api.build_prompt_json(_web_kind, _web_index)");
    } else if (action === "health") {
      raw = await pyodide.runPythonAsync("web_api.health_json()");
    } else {
      throw new Error("Hành động không hợp lệ");
    }
    const result = JSON.parse(String(raw));
    postMessage({ type: "response", id, ...result });
  } catch (error) {
    postMessage({ type: "response", id, ok: false, error: String(error?.message || error) });
  }
};
