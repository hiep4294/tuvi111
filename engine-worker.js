/* Tu Vi + Bat Tu Web - Pyodide worker v1.13 */
const PYODIDE_VERSION = "0.27.7";
const PYODIDE_SOURCES = [
  {
    name: "jsDelivr Pyodide release",
    base: `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`,
    script: `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/pyodide.js`,
  },
  {
    name: "jsDelivr npm fallback",
    base: `https://cdn.jsdelivr.net/npm/pyodide@${PYODIDE_VERSION}/`,
    script: `https://cdn.jsdelivr.net/npm/pyodide@${PYODIDE_VERSION}/pyodide.js`,
  },
];

let pyodide = null;
let ready = false;

async function loadPyodideRuntime() {
  const errors = [];
  for (const source of PYODIDE_SOURCES) {
    try {
      postMessage({
        type: "status",
        message: `Dang tai bo may Python ${PYODIDE_VERSION}...`,
        progress: 12,
      });
      importScripts(source.script);
      if (typeof loadPyodide !== "function") {
        throw new Error("Tai pyodide.js thanh cong nhung khong co ham loadPyodide");
      }
      const runtime = await loadPyodide({ indexURL: source.base });
      return runtime;
    } catch (error) {
      errors.push(`${source.name}: ${String(error?.message || error)}`);
    }
  }
  throw new Error(
    "Khong tai duoc Pyodide tu cac nguon du phong. " + errors.join(" | ")
  );
}

async function boot() {
  try {
    pyodide = await loadPyodideRuntime();
    postMessage({
      type: "status",
      message: "Dang nap quy tac Tu Vi va Bat Tu...",
      progress: 62,
    });

    // GitHub upload may preserve the assets/ folder or flatten engine.zip to repository root.
    // Try both locations so either deployment structure works.
    const engineCandidates = [
      new URL("./engine.zip", self.location.href),
      new URL("./assets/engine.zip", self.location.href),
    ];
    let response = null;
    const engineErrors = [];
    for (const engineUrl of engineCandidates) {
      try {
        const candidate = await fetch(engineUrl, { cache: "no-store" });
        if (candidate.ok) {
          response = candidate;
          break;
        }
        engineErrors.push(`${engineUrl.pathname}: HTTP ${candidate.status}`);
      } catch (error) {
        engineErrors.push(`${engineUrl.pathname}: ${String(error?.message || error)}`);
      }
    }
    if (!response) {
      throw new Error(`Khong tai duoc engine.zip. ${engineErrors.join(" | ")}`);
    }

    const archive = new Uint8Array(await response.arrayBuffer());
    pyodide.FS.writeFile("/tmp/engine.zip", archive);
    await pyodide.runPythonAsync(`
import os, sys, zipfile
os.makedirs('/app', exist_ok=True)
with zipfile.ZipFile('/tmp/engine.zip') as z:
    z.extractall('/app')
if '/app' not in sys.path:
    sys.path.insert(0, '/app')
import web_api
`);

    ready = true;
    postMessage({
      type: "ready",
      message: "Bo may da san sang",
      progress: 100,
    });
  } catch (error) {
    postMessage({
      type: "fatal",
      error: String(error?.stack || error),
    });
  }
}

boot();

self.onmessage = async (event) => {
  const { id, action, payload } = event.data || {};
  if (!ready) {
    postMessage({
      type: "response",
      id,
      ok: false,
      error: "Bo may chua san sang",
    });
    return;
  }

  try {
    let raw;
    if (action === "generate") {
      pyodide.globals.set("_web_payload", JSON.stringify(payload));
      raw = await pyodide.runPythonAsync(
        "web_api.generate_chart_json(_web_payload)"
      );
    } else if (action === "prompt") {
      pyodide.globals.set("_web_kind", String(payload.kind));
      pyodide.globals.set("_web_index", Number(payload.index || 0));
      raw = await pyodide.runPythonAsync(
        "web_api.build_prompt_json(_web_kind, _web_index)"
      );
    } else if (action === "health") {
      raw = await pyodide.runPythonAsync("web_api.health_json()");
    } else {
      throw new Error("Hanh dong khong hop le");
    }

    const result = JSON.parse(String(raw));
    postMessage({ type: "response", id, ...result });
  } catch (error) {
    postMessage({
      type: "response",
      id,
      ok: false,
      error: String(error?.stack || error),
    });
  }
};
