import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const controllerSource = readFileSync(join(root, "browser-ai.js"), "utf8");
const workerSource = readFileSync(join(root, "browser-ai-worker.js"), "utf8");

assert.match(controllerSource, /Qwen3-4B-q4f16_1-MLC/);
assert.match(controllerSource, /Qwen3-1\.7B-q4f16_1-MLC/);
assert.match(controllerSource, /DeepSeek-R1-Distill-Qwen-7B-q4f16_1-MLC/);
assert.match(controllerSource, /new Worker/);
assert.match(controllerSource, /type:\s*"module"/);
assert.match(controllerSource, /browser-ai-worker\.js\?v=1\.1\.0/);
assert.match(workerSource, /https:\/\/esm\.run\/@mlc-ai\/web-llm@0\.2\.84/);
assert.match(workerSource, /CreateMLCEngine/);
assert.match(workerSource, /cacheBackend:\s*"indexeddb"/);
assert.match(workerSource, /enable_thinking\s*=\s*false/);
assert.match(workerSource, /local:\s*true/);

const context = {
  console,
  Promise,
  URL,
  Error,
  setTimeout,
  clearTimeout,
  navigator: {},
  location: { href: "https://example.test/tuvi111/" },
};
context.globalThis = context;
vm.runInNewContext(controllerSource, context, { filename: "browser-ai.js" });

assert.equal(context.HiepBrowserAI.DEFAULT_MODEL, "Qwen3-4B-q4f16_1-MLC");
assert.equal(context.HiepBrowserAI.MODELS.length, 3);
assert.equal(context.HiepBrowserAI.webGpuAvailable(), false);
const gpu = await context.HiepBrowserAI.inspectGpu();
assert.equal(gpu.ok, false);
assert.match(gpu.reason, /WebGPU/);

console.log("PASS: browser AI controller is WebGPU-only and uses verified WebLLM model IDs");
