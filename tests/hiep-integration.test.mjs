import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const autonomous = readFileSync(join(root, "autonomous.js"), "utf8");
const serviceWorker = readFileSync(join(root, "service-worker.js"), "utf8");
const specialist = readFileSync(join(root, "hiep-tuvi-ai.js"), "utf8");

assert.match(autonomous, /hiep-tuvi-ai\.js\?v=1\.1\.0/);
assert.match(autonomous, /__HIEP_TUVI_CHART__/);
assert.match(autonomous, /MessageChannel/);
assert.match(autonomous, /hiep-ai-endpoint/);
assert.match(autonomous, /__hiep_ai_proxy__\/analyze/);
assert.match(autonomous, /prompt_kind:\s*"final_summary_only"/);
assert.match(autonomous, /summary_only:\s*true/);
assert.match(autonomous, /AI kết luận & tổng kết/);
assert.doesNotMatch(autonomous, /Phân tích chuyên sâu — 15 bước/);
assert.doesNotMatch(autonomous, /originalRunGemini/);

assert.match(serviceWorker, /\.\/hiep-tuvi-ai\.js/);
assert.match(serviceWorker, /event\.ports\?\.\[0\]/);
assert.match(serviceWorker, /__hiep_ai_proxy__\/health/);
assert.match(serviceWorker, /__hiep_ai_proxy__\/analyze/);

assert.match(specialist, /SUMMARY_ONLY/);
assert.match(specialist, /summary_and_conclusion_only/);
assert.match(specialist, /KẾT LUẬN VÀ TỔNG KẾT TOÀN BỘ/);
assert.match(specialist, /Không viết lại 12 bài luận cung riêng/);
assert.match(specialist, /buildEvidencePackage/);
assert.match(specialist, /QUALITY GATE/);
assert.doesNotMatch(specialist, /NHIỆM VỤ BƯỚC/);

console.log("PASS: AI is isolated to final synthesis while tuvi111 remains deterministic");
