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
const cpuAi = readFileSync(join(root, "browser-cpu-ai.js"), "utf8");
const cpuWorker = readFileSync(join(root, "browser-cpu-ai-worker.js"), "utf8");
const cpuRouter = readFileSync(join(root, "cpu-ai-fallback.js"), "utf8");
const offline = readFileSync(join(root, "offline-summary.js"), "utf8");
const guard = readFileSync(join(root, "webgpu-failure-guard.js"), "utf8");

assert.match(autonomous, /hiep-tuvi-ai\.js\?v=2\.0\.0/);
assert.match(autonomous, /hiep-tuvi-knowledge\.js\?v=1\.0\.0/);
assert.match(autonomous, /__HIEP_TUVI_CHART__/);
assert.match(autonomous, /fullReportPlan/);
assert.match(autonomous, /buildFullReportSectionPrompt/);
assert.match(autonomous, /validateFullReportSection/);
assert.match(autonomous, /requestLocalWithFallback/);
assert.match(autonomous, /automatic:\s*true/);
assert.match(autonomous, /scheduleAutomaticReport/);
assert.match(autonomous, /AI luận giải lại/);
assert.match(autonomous, /webGpuAvailable/);
assert.doesNotMatch(autonomous, /Phân tích chuyên sâu — 15 bước/);

assert.match(browserAi, /Qwen3-4B-q4f16_1-MLC/);
assert.match(browserAi, /Qwen3-8B-q4f16_1-MLC/);
assert.match(browserAi, /new Worker/);
assert.match(browserWorker, /@mlc-ai\/web-llm@0\.2\.84/);
assert.match(browserWorker, /CreateMLCEngine/);

assert.match(cpuAi, /onnx-community\/Qwen2\.5-0\.5B-Instruct/);
assert.match(cpuAi, /cpu-wasm/);
assert.match(cpuAi, /browser-cpu-ai-worker\.js\?v=1\.0\.0/);
assert.match(cpuWorker, /@huggingface\/transformers@3\.8\.1/);
assert.match(cpuWorker, /device:\s*"wasm"/);
assert.match(cpuWorker, /dtype:\s*DTYPE/);
assert.match(cpuWorker, /DTYPE = "q8"/);
assert.match(cpuWorker, /do_sample:\s*false/);
assert.match(cpuRouter, /gpuPathFailed/);
assert.match(cpuRouter, /runCpuReport/);
assert.match(cpuRouter, /WebGPU không dùng được → đang chuyển sang AI CPU\/WASM/);
assert.match(cpuRouter, /AI WebGPU và AI CPU\/WASM đều không chạy được/);
assert.match(cpuRouter, /cpuSafeEnough/);
assert.match(cpuRouter, /buildFullReportSectionPrompt/);
assert.match(cpuRouter, /validateFullReportSection/);

assert.match(serviceWorker, /\.\/browser-cpu-ai\.js/);
assert.match(serviceWorker, /\.\/browser-cpu-ai-worker\.js/);
assert.match(serviceWorker, /\.\/cpu-ai-fallback\.js/);
assert.match(serviceWorker, /tuvi-battu-web-v1\.23-cpu-wasm-fallback-1/);

assert.match(specialist, /VERSION = "2\.1\.0"/);
assert.match(specialist, /HIEP_TUVI_FULL_REPORT/);
assert.match(specialist, /palaces-6/);
assert.match(specialist, /DATA QUALITY CARD/);
assert.match(specialist, /TỨ TRỤ BÁT TỰ \+ NGŨ HÀNH/);
assert.match(specialist, /RED-TEAM \/ PHẢN BIỆN/);

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
assert.match(offline, /có tình cảm và nhu cầu gắn kết/);
assert.match(guard, /Invalid ShaderModule|index_kernel/);
assert.match(guard, /webGpuBlocked/);
assert.match(guard, /markGpuBlocked/);
assert.match(guard, /mobile-memory-guard/);
assert.doesNotMatch(specialist + knowledge + offline, /NHIỆM VỤ BƯỚC/);

console.log("PASS: Hiep TuVi AI uses WebGPU first, CPU/WASM second, detailed Local Rules last");
