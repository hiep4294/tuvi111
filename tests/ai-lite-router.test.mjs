import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import test from "node:test";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const source = readFileSync(join(root, "ai-lite-router.js"), "utf8");

assert.match(source, /VERSION = "1\.2\.0"/);
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
assert.match(source, /if \(automatic\)/);
assert.match(source, /manual-ai-only/);
assert.match(source, /không tự tải bất kỳ model AI nào sau khi lập lá số/i);
assert.doesNotMatch(source, /fullReportPlan/);
assert.doesNotMatch(source, /buildFullReportSectionPrompt/);
assert.doesNotMatch(source, /Qwen3-4B-q4f16_1-MLC/);
assert.doesNotMatch(source, /Qwen3-8B-q4f16_1-MLC/);
assert.doesNotMatch(source, /runCpuReport/);

console.log("PASS: AI Lite is manual-only in v1.25 while preserving bounded fallback paths");

function router({ cloudFails = false, online = true } = {}) {
  const calls = [];
  const output = { dataset: { raw: "Local Rules 12 cung" }, prepend(section) { this.section = section; } };
  const window = {
    navigator: { onLine: online },
    document: {
      getElementById: id => id === "geminiOutput" ? output : null,
      createElement: () => ({ append(...children) { this.children = children; } }),
    },
    __HIEP_TUVI_CHART__: { chart_id: "1" },
    HiepTuViAI: { buildBrowserSummaryPrompt: () => "full prompt", buildCompactEvidenceText: () => "CPU prompt" },
    HiepTuViKnowledge: {},
    HiepCloudAI: {
      isAvailable: () => online,
      async analyze(prompt, { maxTokens }) {
        calls.push("cloud");
        assert.match(prompt, /^full prompt/);
        assert.equal(maxTokens, 1800);
        if (cloudFails) throw new Error("HTTP 503");
        return { text: "<synthesis>", provider: "anthropic", model: "cloud-model" };
      },
    },
    HiepBrowserAI: {
      webGpuAvailable: () => true,
      generate() { calls.push("webgpu"); return { text: "local synthesis", backend: "webgpu-lite" }; },
    },
    renderMarkdownSafe: text => text.replaceAll("<", "&lt;").replaceAll(">", "&gt;"),
    setGeminiStatus(message) { this.status = message; },
  };
  window.window = window;
  vm.runInNewContext(source, window);
  return { window, calls, output };
}

test("automatic skips cloud, manual cloud synthesis renders safely alongside Local Rules", async () => {
  const { window, calls, output } = router();
  await window.runGeminiAnalysis({ automatic: true });
  assert.deepEqual(calls, []);
  assert.equal((await window.runGeminiAnalysis()).backend, "cloud");
  assert.deepEqual(calls, ["cloud"]);
  const [label, body] = output.section.children;
  assert.match(label.textContent, /Claude · cloud-model/);
  assert.equal(body.innerHTML, "&lt;synthesis&gt;");
  assert.ok(output.dataset.raw.endsWith("Local Rules 12 cung"));
});

test("manual cloud failure records diagnostics and continues through Chrome to WebGPU", async () => {
  const { window, calls } = router({ cloudFails: true });
  assert.equal((await window.runGeminiAnalysis()).backend, "webgpu-lite");
  assert.deepEqual(calls, ["cloud", "webgpu"]);
  const [cloud, chrome] = window.HiepAiLiteRouter.diagnostics;
  assert.equal(cloud.backend, "cloud");
  assert.match(cloud.error, /503/);
  assert.equal(chrome.backend, "chrome-built-in");
});

test("offline synthesis shows offline status and retains the local backend sequence", async () => {
  const { window, calls } = router({ online: false });
  window.HiepBrowserAI.webGpuAvailable = () => false;
  const result = await window.runGeminiAnalysis();
  assert.deepEqual(calls, []);
  assert.equal(result.backend, "local-rules");
  assert.deepEqual(Array.from(result.diagnostics, entry => entry.backend), ["chrome-built-in", "webgpu-lite", "cpu-wasm-lite"]);
  assert.match(window.status, /Offline · dùng AI cục bộ\/Local Rules/);
});
