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

assert.match(html, /Web v1\.20 Hiep TuVi AUTO/);
assert.match(html, /WEB v1\.20 · TUVI111 FACT\/CALC · HIEP TUVI AI AUTO/);
assert.match(html, /Hiep TuVi AI — tự luận giải đầy đủ/);
assert.match(html, /AUTO · HIEP_TUVI/);
assert.match(html, /styles-autonomous\.css\?v=1\.20/);
assert.match(html, /autonomous\.js\?v=1\.20/);
assert.match(html, /offline-summary\.js\?v=1\.20/);
assert.match(html, /AI luận giải lại/);
assert.match(html, /Kiểm tra WebGPU/);
assert.match(html, /AI tự chạy: Data Quality → đủ 12 cung → Bát Tự → Ngũ Hành/);
assert.match(html, /Content-Security-Policy/);
assert.match(html, /connect-src 'self' http:\/\/localhost/);
assert.doesNotMatch(html, /connect-src[^;]*https:/);
assert.doesNotMatch(html, /SUMMARY_ONLY/);
assert.doesNotMatch(html, /Phân tích lại toàn bộ — 15 bước/);

// Deterministic calculation engine remains unchanged; v1.20 is the AI/report shell release.
assert.match(app, /renderOfflineSummary\(state\.chart\)/);
assert.doesNotMatch(app, /runGeminiAnalysis\(\{ automatic: true \}\)/);
assert.match(worker, /vendor\/pyodide/);
assert.doesNotMatch(html + app + worker, /spring-bonus-6dfb|cdn\.jsdelivr\.net/);
assert.match(serviceWorker, /tuvi-battu-web-v1\.20-hiep-tuvi-auto-1/);
assert.match(serviceWorker, /browser-ai-worker\.js/);
assert.match(serviceWorker, /vendor\/pyodide\/pyodide\.asm\.wasm/);
assert.match(autonomousStyles, /\[hidden\]\s*\{\s*display:\s*none\s*!important/);
assert.match(autonomousStyles, /overflow-x:\s*hidden/);

console.log("PASS: v1.20 shell visibly exposes automatic Hiep Tuvi full-report AI");
