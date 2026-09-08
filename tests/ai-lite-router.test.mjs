import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const source = readFileSync(join(root, "ai-lite-router.js"), "utf8");

assert.match(source, /VERSION = "1\.0\.0"/);
assert.match(source, /GPU_LITE_MODEL = "Qwen3-1\.7B-q4f16_1-MLC"/);
assert.match(source, /buildBrowserSummaryPrompt/);
assert.match(source, /buildCompactEvidenceText/);
assert.match(source, /AI TỔNG HỢP BỔ SUNG/);
assert.match(source, /Không viết lại 12 cung/);
assert.match(source, /maxTokens:\s*700/);
assert.match(source, /maxTokens:\s*280/);
assert.match(source, /chrome-built-in/);
assert.match(source, /webgpu-lite/);
assert.match(source, /cpu-wasm-lite/);
assert.match(source, /browser-cpu-ai\.js\?v=1\.1\.0/);
assert.match(source, /browser-ai\.js\?v=1\.1\.1/);
assert.match(source, /isMobileLike/);
assert.match(source, /isLowMemoryDevice/);
assert.match(source, /webGpuBlocked/);
assert.match(source, /AI tăng cường chưa khả dụng/);
assert.match(source, /root\.runGeminiAnalysis = runLite/);
assert.doesNotMatch(source, /fullReportPlan/);
assert.doesNotMatch(source, /buildFullReportSectionPrompt/);
assert.doesNotMatch(source, /Qwen3-4B-q4f16_1-MLC/);
assert.doesNotMatch(source, /Qwen3-8B-q4f16_1-MLC/);
assert.doesNotMatch(source, /runCpuReport/);

console.log("PASS: AI Lite router bounds each model to one compact synthesis and preserves Local Rules");
