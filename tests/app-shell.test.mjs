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

assert.match(html, /Web v1\.19 Local AI/);
assert.match(html, /WEB v1\.19 · TUVI111 CỤC BỘ · AI LOCAL WEBGPU/);
assert.match(html, /Hiep TuVi Local AI — kết luận & tổng kết/);
assert.match(html, /WEBGPU · SUMMARY_ONLY/);
assert.match(html, /styles-autonomous\.css\?v=1\.19/);
assert.match(html, /autonomous\.js\?v=1\.19/);
assert.match(html, /offline-summary\.js\?v=1\.19/);
assert.match(html, /AI local kết luận & tổng kết/);
assert.match(html, /Kiểm tra WebGPU/);
assert.match(html, /Content-Security-Policy/);
assert.match(html, /connect-src 'self' http:\/\/localhost/);
assert.doesNotMatch(html, /connect-src[^;]*https:/);
assert.doesNotMatch(html, /Phân tích lại toàn bộ — 15 bước/);

// Engine deterministic version stays v1.18; v1.19 is the visible local-AI shell/cache release.
assert.match(app, /const WEB_VERSION = "1\.18"/);
assert.match(app, /renderOfflineSummary\(state\.chart\)/);
assert.doesNotMatch(app, /runGeminiAnalysis\(\{ automatic: true \}\)/);

assert.match(worker, /vendor\/pyodide/);
assert.doesNotMatch(html + app + worker, /spring-bonus-6dfb|cdn\.jsdelivr\.net/);
assert.match(serviceWorker, /tuvi-battu-web-v1\.19-browser-ai-1/);
assert.match(serviceWorker, /browser-ai-worker\.js/);
assert.match(serviceWorker, /vendor\/pyodide\/pyodide\.asm\.wasm/);
assert.match(autonomousStyles, /\[hidden\]\s*\{\s*display:\s*none\s*!important/);
assert.match(autonomousStyles, /overflow-x:\s*hidden/);

console.log("PASS: v1.19 shell visibly exposes local WebGPU AI without changing deterministic engine");
