import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const autonomous = readFileSync(join(root, "autonomous.js"), "utf8");
const serviceWorker = readFileSync(join(root, "service-worker.js"), "utf8");
const specialist = readFileSync(join(root, "hiep-tuvi-ai.js"), "utf8");
const knowledge = readFileSync(join(root, "hiep-tuvi-knowledge.js"), "utf8");
const browserAi = readFileSync(join(root, "browser-ai.js"), "utf8");
const browserWorker = readFileSync(join(root, "browser-ai-worker.js"), "utf8");

assert.match(autonomous, /hiep-tuvi-ai\.js\?v=2\.0\.0/);
assert.match(autonomous, /hiep-tuvi-knowledge\.js\?v=1\.0\.0/);
assert.match(autonomous, /browser-ai\.js\?v=1\.1\.1/);
assert.match(autonomous, /__HIEP_TUVI_CHART__/);
assert.match(autonomous, /HiepTuViKnowledge/);
assert.match(autonomous, /fullReportPlan/);
assert.match(autonomous, /buildFullReportSectionPrompt/);
assert.match(autonomous, /validateFullReportSection/);
assert.match(autonomous, /requestLocalWithFallback/);
assert.match(autonomous, /automatic:\s*true/);
assert.match(autonomous, /scheduleAutomaticReport/);
assert.match(autonomous, /activeRun \+= 1/);
assert.match(autonomous, /AI luận giải lại/);
assert.match(autonomous, /webGpuAvailable/);
assert.doesNotMatch(autonomous, /Phân tích chuyên sâu — 15 bước/);
assert.doesNotMatch(autonomous, /if\s*\(options\.automatic\)\s*return/);

assert.match(browserAi, /Qwen3-4B-q4f16_1-MLC/);
assert.match(browserAi, /Qwen3-8B-q4f16_1-MLC/);
assert.match(browserAi, /new Worker/);
assert.match(browserAi, /type:\s*"module"/);
assert.match(browserAi, /browser-ai-worker\.js/);
assert.match(browserWorker, /@mlc-ai\/web-llm@0\.2\.84/);
assert.match(browserWorker, /CreateMLCEngine/);
assert.match(browserWorker, /cacheBackend:\s*"indexeddb"/);
assert.match(browserWorker, /local:\s*true/);

assert.match(serviceWorker, /\.\/hiep-tuvi-knowledge\.js/);
assert.match(serviceWorker, /\.\/browser-ai\.js/);
assert.match(serviceWorker, /\.\/browser-ai-worker\.js/);
assert.match(serviceWorker, /tuvi-battu-web-v1\.20-hiep-tuvi-auto-2/);

assert.match(specialist, /HIEP_TUVI_FULL_REPORT/);
assert.match(specialist, /fullReportPlan/);
assert.match(specialist, /DATA QUALITY CARD/);
assert.match(specialist, /Mệnh", "Phụ Mẫu", "Phúc Đức/);
assert.match(specialist, /TỨ TRỤ BÁT TỰ \+ NGŨ HÀNH/);
assert.match(specialist, /RED-TEAM \/ PHẢN BIỆN/);
assert.match(specialist, /HÀNH ĐỘNG THỰC TẾ/);

assert.match(knowledge, /Tử Vi/);
assert.match(knowledge, /Phá Quân/);
assert.match(knowledge, /Sát Phá Tham/);
assert.match(knowledge, /Tứ Hóa là mạng có hướng/);
assert.match(knowledge, /Tuần\/Triệt là bộ điều biến/);
assert.match(knowledge, /QUY TẮC BÁT TỰ HIEP TUVI/);
assert.doesNotMatch(specialist + knowledge, /NHIỆM VỤ BƯỚC/);

console.log("PASS: local WebGPU AI automatically generates a knowledge-grounded Hiep Tuvi full report");
