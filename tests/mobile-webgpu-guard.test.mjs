import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const source = readFileSync(join(root, "webgpu-failure-guard.js"), "utf8");

function makeContext({ userAgent, mobile = false, maxTouchPoints = 0, deviceMemory = 0 } = {}) {
  let originalCalls = 0;
  const statuses = [];
  const toasts = [];
  const session = new Map();
  const context = {
    console,
    navigator: {
      userAgent: userAgent || "Mozilla/5.0",
      userAgentData: { mobile },
      maxTouchPoints,
      deviceMemory,
    },
    sessionStorage: {
      getItem(key) { return session.get(key) ?? null; },
      setItem(key, value) { session.set(key, String(value)); },
      removeItem(key) { session.delete(key); },
    },
    document: {
      getElementById() { return null; },
      createElement() { return {}; },
    },
    setGeminiStatus(message) { statuses.push(message); },
    toast(message) { toasts.push(message); },
    async runGeminiAnalysis() {
      originalCalls += 1;
      return { ok: true };
    },
  };
  context.window = context;
  vm.runInNewContext(source, context, { filename: "webgpu-failure-guard.js" });
  return { context, statuses, toasts, session, get originalCalls() { return originalCalls; } };
}

{
  const h = makeContext({
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1",
  });
  const result = await h.context.runGeminiAnalysis({ automatic: true });
  assert.equal(h.originalCalls, 0, "iPhone automatic path must not start the multi-GB WebGPU model");
  assert.equal(result.reason, "mobile-memory-guard");
  assert.ok(h.statuses.some((x) => /Thiết bị di động/.test(x)));
  assert.ok(h.statuses.some((x) => /CPU\/WASM/.test(x)), "mobile skip must hand off toward CPU/WASM");
}

{
  const h = makeContext({
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/18 Safari/605.1.15",
    maxTouchPoints: 5,
  });
  const result = await h.context.runGeminiAnalysis({ automatic: true });
  assert.equal(h.originalCalls, 0, "iPad desktop UA must still skip the multi-GB WebGPU model");
  assert.equal(result.reason, "mobile-memory-guard");
  assert.ok(h.statuses.some((x) => /CPU\/WASM/.test(x)));
}

{
  const h = makeContext({ userAgent: "Mozilla/5.0 (X11; Linux x86_64) Chrome/140 Safari/537.36", deviceMemory: 4 });
  const result = await h.context.runGeminiAnalysis({ automatic: true });
  assert.equal(h.originalCalls, 0, "low-memory desktop must skip automatic WebGPU AI");
  assert.equal(result.reason, "low-memory");
  assert.ok(h.statuses.some((x) => /RAM thấp/.test(x)));
  assert.ok(h.statuses.some((x) => /CPU\/WASM/.test(x)));
}

{
  const h = makeContext({ userAgent: "Mozilla/5.0 (X11; Linux x86_64) Chrome/140 Safari/537.36", deviceMemory: 16 });
  const result = await h.context.runGeminiAnalysis({ automatic: true });
  assert.equal(h.originalCalls, 1, "capable desktop may continue to original WebGPU AI");
  assert.equal(result.ok, true);
}

{
  const h = makeContext({ userAgent: "Mozilla/5.0 (X11; Linux x86_64) Chrome/140 Safari/537.36", deviceMemory: 16 });
  h.context.HiepWebGpuFailureGuard.markGpuBlocked();
  const result = await h.context.runGeminiAnalysis({ automatic: true });
  assert.equal(h.originalCalls, 0, "a session-blocked WebGPU backend must not be retried");
  assert.equal(result.reason, "webgpu-session-blocked");
  assert.equal(h.context.HiepWebGpuFailureGuard.webGpuBlocked(), true);
  assert.ok(h.statuses.some((x) => /CPU\/WASM/.test(x)));
  h.context.HiepWebGpuFailureGuard.clearGpuBlocked();
  assert.equal(h.context.HiepWebGpuFailureGuard.webGpuBlocked(), false);
}

console.log("PASS: constrained devices and blocked WebGPU sessions route toward CPU/WASM without starting the large GPU model");
