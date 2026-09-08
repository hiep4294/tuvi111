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
const router = readFileSync(join(root, "ai-lite-router.js"), "utf8");
const cpuController = readFileSync(join(root, "browser-cpu-ai.js"), "utf8");
const nativeAi = readFileSync(join(root, "browser-native-ai.js"), "utf8");

assert.match(html, /Web v1\.24 Hiep TuVi AI Lite/);
assert.match(html, /WEB v1\.24 · TUVI111 FACT\/CALC · LOCAL RULES FULL · AI LITE/);
assert.match(html, /Hiep TuVi — 12 cung đầy đủ \+ AI tổng hợp Lite/);
assert.match(html, /v1\.24 · STABILITY FIRST/);
assert.match(html, /styles-autonomous\.css\?v=1\.24/);
assert.match(html, /autonomous\.js\?v=1\.24/);
assert.match(html, /webgpu-failure-guard\.js\?v=1\.24/);
assert.match(html, /browser-native-ai\.js\?v=1\.0\.1/);
assert.match(html, /browser-cpu-ai\.js\?v=1\.1\.0/);
assert.match(html, /ai-lite-router\.js\?v=1\.0\.0/);
assert.doesNotMatch(html, /<script src="cpu-ai-fallback\.js/);
assert.match(html, /AI tổng hợp lại/);
assert.match(html, /Kiểm tra AI cục bộ/);
assert.match(html, /SmolLM2 135M one-shot/);
assert.match(html, /không còn tải Qwen 4B\/8B/);
assert.match(html, /Content-Security-Policy/);
assert.match(html, /connect-src 'self' http:\/\/localhost/);
assert.doesNotMatch(html, /connect-src[^;]*https:/);

// Deterministic engine remains the FACT/CALC authority and always renders Local Rules first.
assert.match(app, /renderOfflineSummary\(state\.chart\)/);
assert.match(worker, /vendor\/pyodide/);
assert.match(serviceWorker, /tuvi-battu-web-v1\.24-ai-lite-1/);
assert.match(serviceWorker, /browser-native-ai\.js/);
assert.match(serviceWorker, /ai-lite-router\.js/);
assert.match(serviceWorker, /browser-cpu-ai\.js/);
assert.match(serviceWorker, /browser-cpu-ai-worker\.js/);
assert.doesNotMatch(serviceWorker, /"\.\/cpu-ai-fallback\.js"/);
assert.match(serviceWorker, /vendor\/pyodide\/pyodide\.asm\.wasm/);
assert.match(guard, /Invalid ShaderModule|index_kernel/);
assert.match(router, /Qwen3-1\.7B-q4f16_1-MLC/);
assert.match(router, /AI TỔNG HỢP BỔ SUNG/);
assert.match(cpuController, /SmolLM2-135M-Instruct-ONNX-MHA/);
assert.match(nativeAi, /LanguageModel\.create/);
assert.match(nativeAi, /Translator\.create/);
assert.match(autonomousStyles, /\[hidden\]\s*\{\s*display:\s*none\s*!important/);
assert.match(autonomousStyles, /overflow-x:\s*hidden/);
assert.match(autonomousStyles, /ai-lite-enhancement/);

console.log("PASS: v1.24 keeps full Local Rules and limits AI to one-shot synthesis backends");
