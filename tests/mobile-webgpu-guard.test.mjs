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
  return { context, statuses, toasts, get originalCalls() { return originalCalls; } };
}

{
  const h = makeContext({
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1",
  });
  const result = await h.context.runGeminiAnalysis({ automatic: true });
  assert.equal(h.originalCalls, 0, "iPhone automatic AI must never start the WebGPU model");
  assert.equal(result.reason, "mobile-memory-guard");
  assert.ok(h.statuses.some((x) => /Điện thoại/.test(x)));
}

{
  const h = makeContext({
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/18 Safari/605.1.15",
    maxTouchPoints: 5,
  });
  await h.context.runGeminiAnalysis({ automatic: true });
  assert.equal(h.originalCalls, 0, "iPad desktop UA must still be treated as mobile-like");
}

{
  const h = makeContext({ userAgent: "Mozilla/5.0 (X11; Linux x86_64) Chrome/140 Safari/537.36", deviceMemory: 4 });
  const result = await h.context.runGeminiAnalysis({ automatic: true });
  assert.equal(h.originalCalls, 0, "low-memory desktop must skip automatic AI");
  assert.equal(result.reason, "low-memory");
}

{
  const h = makeContext({ userAgent: "Mozilla/5.0 (X11; Linux x86_64) Chrome/140 Safari/537.36", deviceMemory: 16 });
  const result = await h.context.runGeminiAnalysis({ automatic: true });
  assert.equal(h.originalCalls, 1, "capable desktop may continue to original WebGPU AI");
  assert.equal(result.ok, true);
}

console.log("PASS: mobile/low-memory WebGPU guard prevents post-chart OOM crashes");
