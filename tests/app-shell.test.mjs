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

assert.match(html, /Web v1\.22 Hiep TuVi Local Full/);
assert.match(html, /WEB v1\.22 · TUVI111 FACT\/CALC · HIEP TUVI LOCAL FULL · AI OPTIONAL/);
assert.match(html, /Hiep TuVi — báo cáo cục bộ đầy đủ/);
assert.match(html, /LOCAL RULES v2\.2/);
assert.match(html, /styles-autonomous\.css\?v=1\.22/);
assert.match(html, /autonomous\.js\?v=1\.22/);
assert.match(html, /webgpu-failure-guard\.js\?v=1\.22/);
assert.match(html, /offline-summary\.js\?v=2\.2\.0/);
assert.match(html, /knowledge\/stars\.js\?v=2\.0\.0/);
assert.match(html, /knowledge\/minor-stars\.js\?v=2\.2\.0/);
assert.match(html, /knowledge\/all-stars\.js\?v=2\.2\.0/);
assert.match(html, /knowledge\/palaces\.js\?v=2\.0\.0/);
assert.match(html, /AI luận giải lại/);
assert.match(html, /Kiểm tra WebGPU/);
assert.match(html, /Báo cáo cục bộ đầy đủ luôn được tạo trước/);
assert.match(html, /Content-Security-Policy/);
assert.match(html, /connect-src 'self' http:\/\/localhost/);
assert.doesNotMatch(html, /connect-src[^;]*https:/);
assert.doesNotMatch(html, /SUMMARY_ONLY/);
assert.doesNotMatch(html, /Phân tích lại toàn bộ — 15 bước/);

// Deterministic calculation engine remains unchanged; v1.22 changes only the report/fallback shell.
assert.match(app, /renderOfflineSummary\(state\.chart\)/);
assert.doesNotMatch(app, /runGeminiAnalysis\(\{ automatic: true \}\)/);
assert.match(worker, /vendor\/pyodide/);
assert.doesNotMatch(html + app + worker, /spring-bonus-6dfb|cdn\.jsdelivr\.net/);
assert.match(serviceWorker, /tuvi-battu-web-v1\.22-local-full-1/);
assert.match(serviceWorker, /knowledge\/minor-stars\.js/);
assert.match(serviceWorker, /knowledge\/all-stars\.js/);
assert.match(serviceWorker, /webgpu-failure-guard\.js/);
assert.match(serviceWorker, /vendor\/pyodide\/pyodide\.asm\.wasm/);
assert.match(guard, /Invalid ShaderModule|index_kernel/);
assert.match(guard, /báo cáo Hiep TuVi cục bộ đầy đủ/);
assert.match(autonomousStyles, /\[hidden\]\s*\{\s*display:\s*none\s*!important/);
assert.match(autonomousStyles, /overflow-x:\s*hidden/);

console.log("PASS: v1.22 guarantees a detailed local Hiep TuVi report and treats WebGPU AI as optional");
