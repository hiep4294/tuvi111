import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const source = readFileSync(join(root, "service-worker.js"), "utf8");

function createHarness(failingAsset = "") {
  const handlers = new Map();
  const stored = [];
  const context = {
    URL,
    console,
    Promise,
    self: {
      location: { origin: "https://example.test" },
      skipWaiting() {},
      clients: { claim: async () => {} },
      addEventListener(type, handler) { handlers.set(type, handler); },
    },
    caches: {
      async open() { return { async put(asset) { stored.push(String(asset)); } }; },
      async keys() { return []; },
      async delete() { return true; },
      async match() { return undefined; },
    },
    async fetch(asset) {
      const value = String(asset);
      return {
        ok: value !== failingAsset,
        status: value === failingAsset ? 404 : 200,
        clone() { return this; },
      };
    },
  };
  vm.runInNewContext(source, context, { filename: "service-worker.js" });
  return { handlers, stored };
}

async function runInstall(harness) {
  let task;
  harness.handlers.get("install")({ waitUntil(promise) { task = promise; } });
  assert.ok(task, "install handler must provide a waitUntil promise");
  await task;
}

const success = createHarness();
await runInstall(success);
assert.ok(success.stored.includes("./engine.zip"));
assert.ok(success.stored.includes("./offline-summary.js"));
assert.ok(success.stored.includes("./hiep-tuvi-ai.js"));
assert.ok(success.stored.includes("./hiep-tuvi-knowledge.js"));
assert.ok(success.stored.includes("./browser-ai.js"));
assert.ok(success.stored.includes("./browser-ai-worker.js"));
assert.ok(success.stored.includes("./vendor/pyodide/pyodide.asm.wasm"));

const failure = createHarness("./hiep-tuvi-knowledge.js");
await assert.rejects(runInstall(failure), /Cannot cache/);

console.log("PASS: service worker requires deterministic engine, Hiep Tuvi knowledge, and browser AI runtime files");
