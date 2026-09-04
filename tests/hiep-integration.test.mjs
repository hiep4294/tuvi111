import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const autonomous = readFileSync(join(root, "autonomous.js"), "utf8");
const serviceWorker = readFileSync(join(root, "service-worker.js"), "utf8");
const specialist = readFileSync(join(root, "hiep-tuvi-ai.js"), "utf8");
const browserAi = readFileSync(join(root, "browser-ai.js"), "utf8");
const browserWorker = readFileSync(join(root, "browser-ai-worker.js"), "utf8");

assert.match(autonomous, /hiep-tuvi-ai\.js\?v=1\.2\.0/);
assert.match(autonomous, /browser-ai\.js\?v=1\.1\.1/);
assert.match(autonomous, /__HIEP_TUVI_CHART__/);
assert.match(autonomous, /HiepBrowserAI/);
assert.match(autonomous, /buildBrowserSummaryPrompt/);
assert.match(autonomous, /requestLocalWithFallback/);
assert.match(autonomous, /AI local kết luận & tổng kết/);
assert.match(autonomous, /webGpuAvailable/);
assert.match(autonomous, /final_summary_only/);
assert.doesNotMatch(autonomous, /Phân tích chuyên sâu — 15 bước/);
assert.doesNotMatch(autonomous, /originalRunGemini/);

assert.match(browserAi, /Qwen3-4B-q4f16_1-MLC/);
assert.match(browserAi, /Qwen3-8B-q4f16_1-MLC/);
assert.match(browserAi, /new Worker/);
assert.match(browserAi, /type:\s*"module"/);
assert.match(browserAi, /browser-ai-worker\.js/);
assert.match(browserWorker, /@mlc-ai\/web-llm@0\.2\.84/);
assert.match(browserWorker, /CreateMLCEngine/);
assert.match(browserWorker, /cacheBackend:\s*"indexeddb"/);
assert.match(browserWorker, /local:\s*true/);

assert.match(serviceWorker, /\.\/browser-ai\.js/);
assert.match(serviceWorker, /\.\/browser-ai-worker\.js/);
assert.match(serviceWorker, /__hiep_ai_proxy__\/analyze/);

assert.match(specialist, /SUMMARY_ONLY/);
assert.match(specialist, /buildBrowserSummaryPrompt/);
assert.match(specialist, /EVIDENCE NÉN TỪ TUVI111/);
assert.match(specialist, /KẾT LUẬN VÀ TỔNG KẾT TOÀN BỘ/);
assert.match(specialist, /Không viết lại 12 bài luận cung riêng/);
assert.doesNotMatch(specialist, /NHIỆM VỤ BƯỚC/);

console.log("PASS: browser WebGPU AI is local-first and isolated to final synthesis");
