import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const html = readFileSync(join(root, "index.html"), "utf8");
const app = readFileSync(join(root, "app.js"), "utf8");
const worker = readFileSync(join(root, "engine-worker.js"), "utf8");
const serviceWorker = readFileSync(join(root, "service-worker.js"), "utf8");
const autonomousStyles = readFileSync(join(root, "styles-autonomous.css"), "utf8");
const guard = readFileSync(join(root, "webgpu-failure-guard.js"), "utf8");
const cpuRouter = readFileSync(join(root, "cpu-ai-fallback.js"), "utf8");
const cpuController = readFileSync(join(root, "browser-cpu-ai.js"), "utf8");

assert.match(html, /Web v1\.23 Hiep TuVi AI WebGPU \+ CPU/);
assert.match(html, /WEB v1\.23 · TUVI111 FACT\/CALC · WEBGPU → CPU\/WASM → LOCAL RULES/);
assert.match(html, /Hiep TuVi AI — tự luận giải đầy đủ/);
assert.match(html, /AUTO FALLBACK v1\.23/);
assert.match(html, /styles-autonomous\.css\?v=1\.23/);
assert.match(html, /autonomous\.js\?v=1\.23/);
assert.match(html, /webgpu-failure-guard\.js\?v=1\.23/);
assert.match(html, /browser-cpu-ai\.js\?v=1\.0\.0/);
assert.match(html, /cpu-ai-fallback\.js\?v=1\.0\.0/);
assert.match(html, /offline-summary\.js\?v=2\.2\.0/);
assert.match(html, /knowledge\/minor-stars\.js\?v=2\.2\.0/);
assert.match(html, /AI luận giải lại/);
assert.match(html, /Kiểm tra AI cục bộ/);
assert.match(html, /CPU dự phòng cố định: Qwen2\.5 0\.5B q8 chạy WASM/);
assert.match(html, /Content-Security-Policy/);
assert.match(html, /connect-src 'self' http:\/\/localhost/);
assert.doesNotMatch(html, /connect-src[^;]*https:/);
assert.doesNotMatch(html, /SUMMARY_ONLY/);
assert.doesNotMatch(html, /Phân tích lại toàn bộ — 15 bước/);

// Deterministic engine remains the FACT/CALC authority.
assert.match(app, /renderOfflineSummary\(state\.chart\)/);
assert.doesNotMatch(app, /runGeminiAnalysis\(\{ automatic: true \}\)/);
assert.match(worker, /vendor\/pyodide/);
assert.match(serviceWorker, /tuvi-battu-web-v1\.23-cpu-wasm-fallback-1/);
assert.match(serviceWorker, /browser-cpu-ai\.js/);
assert.match(serviceWorker, /browser-cpu-ai-worker\.js/);
assert.match(serviceWorker, /cpu-ai-fallback\.js/);
assert.match(serviceWorker, /vendor\/pyodide\/pyodide\.asm\.wasm/);
assert.match(guard, /Invalid ShaderModule|index_kernel/);
assert.match(guard, /chuyển sang AI CPU\/WASM/);
assert.match(guard, /webGpuBlocked/);
assert.match(cpuRouter, /WebGPU không dùng được → đang chuyển sang AI CPU\/WASM/);
assert.match(cpuRouter, /Local Rules/);
assert.match(cpuController, /onnx-community\/Qwen2\.5-0\.5B-Instruct/);
assert.match(autonomousStyles, /\[hidden\]\s*\{\s*display:\s*none\s*!important/);
assert.match(autonomousStyles, /overflow-x:\s*hidden/);

console.log("PASS: v1.23 routes WebGPU failures to CPU/WASM before Local Rules");
