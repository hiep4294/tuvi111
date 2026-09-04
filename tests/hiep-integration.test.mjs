import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const autonomous = readFileSync(join(root, "autonomous.js"), "utf8");
const serviceWorker = readFileSync(join(root, "service-worker.js"), "utf8");
const specialist = readFileSync(join(root, "hiep-tuvi-ai.js"), "utf8");

assert.match(autonomous, /hiep-tuvi-ai\.js\?v=1\.0\.0/);
assert.match(autonomous, /__HIEP_TUVI_CHART__/);
assert.match(autonomous, /MessageChannel/);
assert.match(autonomous, /hiep-ai-endpoint/);
assert.match(autonomous, /__hiep_ai_proxy__\/analyze/);
assert.match(autonomous, /Phân tích chuyên sâu — 15 bước/);

assert.match(serviceWorker, /\.\/hiep-tuvi-ai\.js/);
assert.match(serviceWorker, /event\.ports\?\.\[0\]/);
assert.match(serviceWorker, /__hiep_ai_proxy__\/health/);
assert.match(serviceWorker, /__hiep_ai_proxy__\/analyze/);
assert.match(serviceWorker, /https:\/\//);

assert.match(specialist, /LONG_INTEGRATED/);
assert.match(specialist, /TẤT CẢ SAO NGUYÊN CỤC/);
assert.match(specialist, /tam phương tứ chính/i);
assert.match(specialist, /TỨ TRỤ BÁT TỰ CHUYÊN SÂU/);
assert.match(specialist, /QUALITY GATE HIEP TUVI AI/);

console.log("PASS: Hiep TuVi AI integration wiring is present and guarded");
