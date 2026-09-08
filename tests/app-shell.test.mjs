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
const domain06b = readFileSync(join(root, "hiep-tuvi-06b-domain.js"), "utf8");
const controller06b = readFileSync(join(root, "hiep-tuvi-06b.js"), "utf8");

assert.match(html, /Web v1\.25 Hiep TuVi 0\.6B/);
assert.match(html, /WEB v1\.25 · TUVI111 FACT\/CALC · LOCAL RULES FULL · HIEP-TUVI 0\.6B/);
assert.match(html, /Hiep TuVi 0\.6B — luận sâu từng cung/);
assert.match(html, /id="hiep06bPanel"/);
assert.match(html, /id="hiep06bPalaceSelect"/);
assert.match(html, /id="hiep06bRunButton"/);
assert.match(html, /id="hiep06bUnloadButton"/);
assert.match(html, /hiep-tuvi-knowledge\.js\?v=2\.0\.1/);
assert.match(html, /hiep-tuvi-06b\.js\?v=0\.1\.0/);
assert.match(html, /hiep-tuvi-06b-domain\.js\?v=0\.1\.1/);
assert.doesNotMatch(html, /<script src="hiep-tuvi-06b-worker\.js/);
assert.match(html, /model chỉ tải khi bạn chủ động bấm chạy/i);
assert.match(html, /Content-Security-Policy/);
assert.match(html, /script-src[^;]*https:\/\/cdn\.jsdelivr\.net/);
assert.match(html, /connect-src[^;]*https:\/\/huggingface\.co/);
assert.match(html, /connect-src[^;]*https:\/\/\*\.huggingface\.co/);
assert.match(html, /connect-src[^;]*https:\/\/\*\.xethub\.hf\.co/);

// Deterministic engine remains the FACT/CALC authority and always renders Local Rules first.
assert.match(app, /renderOfflineSummary\(state\.chart\)/);
assert.match(worker, /vendor\/pyodide/);
assert.match(serviceWorker, /tuvi-battu-web-v1\.25-hiep-tuvi-06b-1/);
assert.match(serviceWorker, /hiep-tuvi-06b\.js/);
assert.match(serviceWorker, /hiep-tuvi-06b-worker\.js/);
assert.match(serviceWorker, /hiep-tuvi-06b-domain\.js/);
assert.match(serviceWorker, /vendor\/pyodide\/pyodide\.asm\.wasm/);

// Heavy legacy AI must not auto-load after chart generation in v1.25.
assert.match(router, /VERSION = "1\.1\.0"/);
assert.match(router, /manual-ai-only/);
assert.match(router, /không tự tải bất kỳ model AI nào sau khi lập lá số/i);
assert.match(router, /Qwen3-1\.7B-q4f16_1-MLC/);
assert.match(router, /root\.runGeminiAnalysis = runLite/);

// 0.6B is lazy: controller creates its worker only when ensureModel/generate is called.
assert.match(controller06b, /new Worker/);
assert.match(controller06b, /hiep-tuvi-06b-worker\.js\?v=0\.1\.0/);
assert.match(domain06b, /knowledgeForPalaces/);
assert.match(domain06b, /180–320 từ/);

assert.match(guard, /Invalid ShaderModule|index_kernel/);
assert.match(cpuController, /SmolLM2-135M-Instruct-ONNX-MHA/);
assert.match(nativeAi, /LanguageModel\.create/);
assert.match(nativeAi, /Translator\.create/);
assert.match(autonomousStyles, /\[hidden\]\s*\{\s*display:\s*none\s*!important/);
assert.match(autonomousStyles, /overflow-x:\s*hidden/);

console.log("PASS: v1.25 integrates Hiep TuVi 0.6B on-demand without replacing deterministic Local Rules");
