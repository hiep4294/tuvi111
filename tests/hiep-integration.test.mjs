import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const autonomous = readFileSync(join(root, "autonomous.js"), "utf8");
const serviceWorker = readFileSync(join(root, "service-worker.js"), "utf8");
const specialist = readFileSync(join(root, "hiep-tuvi-ai.js"), "utf8");
const knowledge = readFileSync(join(root, "hiep-tuvi-knowledge.js"), "utf8");
const stars = readFileSync(join(root, "knowledge/stars.js"), "utf8");
const minorStars = readFileSync(join(root, "knowledge/minor-stars.js"), "utf8");
const allStars = readFileSync(join(root, "knowledge/all-stars.js"), "utf8");
const palaces = readFileSync(join(root, "knowledge/palaces.js"), "utf8");
const combinations = readFileSync(join(root, "knowledge/combinations.js"), "utf8");
const structures = readFileSync(join(root, "knowledge/structures.js"), "utf8");
const bazi = readFileSync(join(root, "knowledge/bazi.js"), "utf8");
const schools = readFileSync(join(root, "knowledge/schools.js"), "utf8");
const browserAi = readFileSync(join(root, "browser-ai.js"), "utf8");
const browserWorker = readFileSync(join(root, "browser-ai-worker.js"), "utf8");
const nativeAi = readFileSync(join(root, "browser-native-ai.js"), "utf8");
const liteRouter = readFileSync(join(root, "ai-lite-router.js"), "utf8");
const cpuAi = readFileSync(join(root, "browser-cpu-ai.js"), "utf8");
const cpuWorker = readFileSync(join(root, "browser-cpu-ai-worker.js"), "utf8");
const hiep06b = readFileSync(join(root, "hiep-tuvi-06b.js"), "utf8");
const hiep06bWorker = readFileSync(join(root, "hiep-tuvi-06b-worker.js"), "utf8");
const hiep06bDomain = readFileSync(join(root, "hiep-tuvi-06b-domain.js"), "utf8");
const offline = readFileSync(join(root, "offline-summary.js"), "utf8");
const guard = readFileSync(join(root, "webgpu-failure-guard.js"), "utf8");

// Legacy autonomous path still captures the chart. The router loaded later owns execution.
assert.match(autonomous, /__HIEP_TUVI_CHART__/);
assert.match(autonomous, /scheduleAutomaticReport/);
assert.match(liteRouter, /root\.runGeminiAnalysis = runLite/);
assert.match(liteRouter, /VERSION = "1\.1\.0"/);
assert.match(liteRouter, /manual-ai-only/);
assert.match(liteRouter, /if \(automatic\)/);
assert.match(liteRouter, /Local Rules đã sẵn sàng · AI 0\.6B chạy theo yêu cầu/);
assert.match(liteRouter, /buildBrowserSummaryPrompt/);
assert.match(liteRouter, /buildCompactEvidenceText/);
assert.doesNotMatch(liteRouter, /fullReportPlan/);
assert.doesNotMatch(liteRouter, /buildFullReportSectionPrompt/);
assert.match(liteRouter, /chrome-built-in/);
assert.match(liteRouter, /webgpu-lite/);
assert.match(liteRouter, /cpu-wasm-lite/);
assert.match(liteRouter, /Qwen3-1\.7B-q4f16_1-MLC/);
assert.match(liteRouter, /maxTokens:\s*700/);
assert.match(liteRouter, /maxTokens:\s*280/);
assert.doesNotMatch(liteRouter, /Qwen3-4B-q4f16_1-MLC/);
assert.doesNotMatch(liteRouter, /Qwen3-8B-q4f16_1-MLC/);

// Hiep TuVi 0.6B is now the dedicated on-demand domain model.
assert.match(hiep06b, /onnx-community\/Qwen3-0\.6B-ONNX/);
assert.match(hiep06b, /hiep-tuvi-06b-worker\.js\?v=0\.1\.0/);
assert.match(hiep06bWorker, /@huggingface\/transformers@3\.8\.1/);
assert.match(hiep06bWorker, /MODEL_ID = "onnx-community\/Qwen3-0\.6B-ONNX"/);
assert.match(hiep06bWorker, /DEVICE = "webgpu"/);
assert.match(hiep06bWorker, /DTYPE = "q4f16"/);
assert.match(hiep06bDomain, /knowledgeForPalaces/);
assert.match(hiep06bDomain, /FACT\/CALC đã khóa bởi tuvi111/);
assert.match(hiep06bDomain, /180–320 từ/);
assert.match(hiep06bDomain, /resourceGuard/);

// Existing one-shot synthesis fallbacks remain manual only.
assert.match(browserAi, /Qwen3-1\.7B-q4f16_1-MLC/);
assert.match(browserWorker, /@mlc-ai\/web-llm@0\.2\.84/);
assert.match(browserWorker, /CreateMLCEngine/);
assert.match(nativeAi, /VERSION = "1\.0\.1"/);
assert.match(nativeAi, /LanguageModel\.availability/);
assert.match(nativeAi, /LanguageModel\.create/);
assert.match(nativeAi, /Translator\.availability/);
assert.match(nativeAi, /Translator\.create/);
assert.match(nativeAi, /HIEPTERM/);

assert.match(cpuAi, /VERSION = "1\.1\.0"/);
assert.match(cpuAi, /onnx-community\/SmolLM2-135M-Instruct-ONNX-MHA/);
assert.match(cpuAi, /cpu-wasm-lite/);
assert.match(cpuWorker, /@huggingface\/transformers@3\.8\.1/);
assert.match(cpuWorker, /device:\s*"wasm"/);
assert.match(cpuWorker, /DTYPE = "q8"/);
assert.doesNotMatch(cpuAi + cpuWorker, /Qwen2\.5-0\.5B-Instruct/);

assert.match(serviceWorker, /\.\/hiep-tuvi-06b\.js/);
assert.match(serviceWorker, /\.\/hiep-tuvi-06b-worker\.js/);
assert.match(serviceWorker, /\.\/hiep-tuvi-06b-domain\.js/);
assert.match(serviceWorker, /\.\/browser-native-ai\.js/);
assert.match(serviceWorker, /\.\/ai-lite-router\.js/);
assert.match(serviceWorker, /\.\/browser-cpu-ai\.js/);
assert.match(serviceWorker, /\.\/browser-cpu-ai-worker\.js/);
assert.doesNotMatch(serviceWorker, /"\.\/cpu-ai-fallback\.js"/);
assert.match(serviceWorker, /tuvi-battu-web-v1\.25-hiep-tuvi-06b-1/);

// Core knowledge/report layers remain unchanged.
assert.match(specialist, /VERSION = "2\.1\.0"/);
assert.match(specialist, /HIEP_TUVI_FULL_REPORT/);
assert.match(specialist, /buildBrowserSummaryPrompt/);
assert.match(specialist, /buildCompactEvidenceText/);
assert.match(knowledge, /VERSION = "2\.0\.1"/);
assert.match(knowledge, /STRUCTURED_LOCAL_KB/);
assert.match(stars, /STAR-PHAQUAN-001/);
assert.match(stars, /STAR-HOAKY-001/);
assert.match(minorStars, /STAR-LONGDUC-001/);
assert.match(minorStars, /STAR-DAIHAO-001/);
assert.match(allStars, /kb\.stars = Object\.freeze/);
assert.match(palaces, /PAL-MENH-001/);
assert.match(combinations, /COMBO-SATPHATHAM-001/);
assert.match(structures, /complete\|partial\|broken/i);
assert.match(bazi, /BAZI-SEASON-001/);
assert.match(schools, /MENH_LY_THIEN_CO/);
assert.match(offline, /VERSION = "2\.2\.0"/);
assert.match(offline, /XII/);
assert.match(guard, /Invalid ShaderModule|index_kernel/);
assert.match(guard, /webGpuBlocked/);

console.log("PASS: Hiep TuVi v1.25 keeps deterministic Local Rules and adds bounded 0.6B on-demand AI");
