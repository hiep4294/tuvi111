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
const offline = readFileSync(join(root, "offline-summary.js"), "utf8");
const guard = readFileSync(join(root, "webgpu-failure-guard.js"), "utf8");

// Legacy autonomous path still captures the chart, but v1.24 loads the Lite router last and overrides AI execution.
assert.match(autonomous, /__HIEP_TUVI_CHART__/);
assert.match(autonomous, /scheduleAutomaticReport/);
assert.match(liteRouter, /root\.runGeminiAnalysis = runLite/);
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
assert.match(liteRouter, /Không viết lại 12 cung/);
assert.doesNotMatch(liteRouter, /Qwen3-4B-q4f16_1-MLC/);
assert.doesNotMatch(liteRouter, /Qwen3-8B-q4f16_1-MLC/);

// WebGPU remains available only as a one-shot 1.7B fallback selected by the router.
assert.match(browserAi, /Qwen3-1\.7B-q4f16_1-MLC/);
assert.match(browserWorker, /@mlc-ai\/web-llm@0\.2\.84/);
assert.match(browserWorker, /CreateMLCEngine/);

// Chrome browser-native path: English LanguageModel plus vi<->en Translator and protected astrology terms.
assert.match(nativeAi, /VERSION = "1\.0\.1"/);
assert.match(nativeAi, /LanguageModel\.availability/);
assert.match(nativeAi, /LanguageModel\.create/);
assert.match(nativeAi, /Translator\.availability/);
assert.match(nativeAi, /Translator\.create/);
assert.match(nativeAi, /sourceLanguage:\s*"vi"/);
assert.match(nativeAi, /targetLanguage:\s*"vi"/);
assert.match(nativeAi, /HIEPTERM/);
assert.match(nativeAi, /destroyModelSession/);

// CPU fallback is deliberately tiny and one-shot instead of a full eight-stage report generator.
assert.match(cpuAi, /VERSION = "1\.1\.0"/);
assert.match(cpuAi, /onnx-community\/SmolLM2-135M-Instruct-ONNX-MHA/);
assert.match(cpuAi, /cpu-wasm-lite/);
assert.match(cpuAi, /browser-cpu-ai-worker\.js\?v=1\.1\.0/);
assert.match(cpuAi, /Math\.min\(360/);
assert.match(cpuAi, /slice\(0, 8000\)/);
assert.match(cpuWorker, /@huggingface\/transformers@3\.8\.1/);
assert.match(cpuWorker, /SmolLM2-135M-Instruct-ONNX-MHA/);
assert.match(cpuWorker, /device:\s*"wasm"/);
assert.match(cpuWorker, /DTYPE = "q8"/);
assert.match(cpuWorker, /Math\.min\(360/);
assert.match(cpuWorker, /slice\(0, 8000\)/);
assert.match(cpuWorker, /Do not invent|Never recalculate/i);
assert.doesNotMatch(cpuAi + cpuWorker, /Qwen2\.5-0\.5B-Instruct/);

assert.match(serviceWorker, /\.\/browser-native-ai\.js/);
assert.match(serviceWorker, /\.\/ai-lite-router\.js/);
assert.match(serviceWorker, /\.\/browser-cpu-ai\.js/);
assert.match(serviceWorker, /\.\/browser-cpu-ai-worker\.js/);
assert.doesNotMatch(serviceWorker, /"\.\/cpu-ai-fallback\.js"/);
assert.match(serviceWorker, /tuvi-battu-web-v1\.24-ai-lite-1/);

// Core Hiep TuVi knowledge/report layers remain unchanged.
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

console.log("PASS: Hiep TuVi v1.24 keeps full Local Rules and uses only bounded one-shot AI synthesis");
