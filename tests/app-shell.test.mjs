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

assert.match(html, /Web v1\.18 tổng luận offline/);
assert.match(html, /styles-autonomous\.css\?v=1\.18/);
assert.match(html, /autonomous\.js\?v=1\.18/);
assert.match(html, /offline-summary\.js\?v=1\.18/);
assert.match(html, /Content-Security-Policy/);
assert.match(html, /connect-src 'self' http:\/\/localhost/);
assert.doesNotMatch(html, /connect-src[^;]*https:/);
assert.match(html, /class="card gemini-panel" hidden/);

assert.match(app, /const WEB_VERSION = "1\.18"/);
assert.match(app, /renderOfflineSummary\(state\.chart\)/);
assert.match(app, /service-worker\.js\?v=1\.18/);
assert.doesNotMatch(app, /runGeminiAnalysis\(\{ automatic: true \}\)/);

assert.match(worker, /vendor\/pyodide/);
assert.doesNotMatch(html + app + worker, /spring-bonus-6dfb|cdn\.jsdelivr\.net/);
assert.match(serviceWorker, /vendor\/pyodide\/pyodide\.asm\.wasm/);
assert.match(autonomousStyles, /\[hidden\]\s*\{\s*display:\s*none\s*!important/);
assert.match(autonomousStyles, /overflow-x:\s*hidden/);

console.log("PASS: production shell is version-aligned and has no mandatory external endpoint");
