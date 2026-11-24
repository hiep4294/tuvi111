import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import test from "node:test";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const source = readFileSync(join(root, "ai-lite-router.js"), "utf8");

assert.match(source, /VERSION = "1\.3\.0"/);
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

function element(tag) {
  return {
    tag, dataset: {}, childNodes: [],
    remove() {
      if (this.parent) this.parent.childNodes = this.parent.childNodes.filter(node => node !== this);
      this.parent = null;
    },
    append(...nodes) {
      for (const node of nodes) {
        node.remove();
        node.parent = this;
        this.childNodes.push(node);
      }
    },
    prepend(node) { this.replaceChildren(node, ...this.childNodes); },
    replaceChildren(...nodes) {
      for (const child of this.childNodes) child.parent = null;
      this.childNodes = [];
      this.append(...nodes);
    },
    querySelectorAll(selector) {
      const selectors = selector.split(", ");
      return this.childNodes.flatMap(node => [
        ...(selectors.some(part => part === node.tag || part === "." + node.className) ? [node] : []),
        ...node.querySelectorAll(selector),
      ]);
    },
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; },
  };
}

const localRaw = "Local Rules 12 cung\n\n---\n\nDữ liệu Bát Tự";
const localTitle = "Hiep TuVi — báo cáo cục bộ đầy đủ";

function router({ cloudFails = false, online = true, configured = true } = {}) {
  const calls = [];
  const output = element("div");
  const panel = element("section");
  const heading = element("h2");
  heading.textContent = localTitle;
  panel.append(heading, output);
  const local = element("div");
  local.className = "full-offline-reading";
  local.innerHTML = "<p>Báo cáo Local Rules</p>";
  output.append(local);
  output.dataset.raw = localRaw;
  const window = {
    navigator: { onLine: online },
    document: {
      getElementById: id => ({ geminiOutput: output, geminiResultPanel: panel })[id],
      createElement: element,
    },
    __HIEP_TUVI_CHART__: { chart_id: "1" },
    HiepTuViAI: { buildBrowserSummaryPrompt: () => "full prompt", buildCompactEvidenceText: () => "CPU prompt" },
    HiepTuViKnowledge: {},
    HiepCloudAI: {
      isAvailable: () => online && configured,
      async analyze(prompt, { maxTokens, timeoutMs }) {
        calls.push("cloud");
        assert.ok(prompt.includes(`--- BẮT ĐẦU BÁO CÁO CỤC BỘ ---\n${localRaw}\n--- KẾT THÚC BÁO CÁO CỤC BỘ ---`));
        assert.equal(maxTokens, 8000);
        assert.equal(timeoutMs, 240000);
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
  return { window, calls, output, local, heading };
}

test("automatic and manual cloud read the full local report and display safe HTML above a closed source", async () => {
  const { window, calls, output, local, heading } = router();
  for (const automatic of [true, false]) {
    const pending = window.runGeminiAnalysis({ automatic });
    assert.match(output.querySelector(".ai-lite-status").textContent, /Đang luận giải/);
    assert.equal((await pending).backend, "cloud");
    const [label, body, details] = output.childNodes;
    assert.equal(label.textContent, "LUẬN GIẢI AI · Claude · cloud-model");
    assert.equal(body.innerHTML, "&lt;synthesis&gt;");
    assert.equal(details.tag, "details");
    assert.equal(details.className, "local-report-source");
    assert.equal(details.open, false);
    assert.equal(details.childNodes[0].textContent, "Xem báo cáo cục bộ gốc (dữ liệu AI đã dùng)");
    assert.equal(details.childNodes[1], local);
    assert.equal(details.childNodes.length, 2);
    assert.equal(output.dataset.raw, `<synthesis>\n\n---\n\n${localRaw}`);
    assert.equal(heading.textContent, "Hiep TuVi — luận giải AI");
  }
  assert.deepEqual(calls, ["cloud", "cloud"]);
});

for (const [options, reason] of [
  [{ online: false }, "Offline"],
  [{ configured: false }, "Chưa cấu hình AI Cloud"],
  [{ cloudFails: true }, "AI Cloud gặp lỗi"],
]) {
  test(`automatic preserves the local report and skips local models when ${reason}`, async () => {
    const { window, calls, output, local, heading } = router(options);
    await window.runGeminiAnalysis({ automatic: true });
    assert.deepEqual(calls, options.cloudFails ? ["cloud"] : []);
    assert.equal(output.childNodes[0].textContent, `${reason} · đang hiển thị báo cáo cục bộ`);
    assert.equal(output.childNodes[1], local);
    assert.equal(output.childNodes.length, 2);
    assert.equal(output.dataset.raw, localRaw);
    assert.equal(heading.textContent, localTitle);
  });
}

test("cloud failure restores the original report after an earlier successful interpretation", async () => {
  const { window, output, local, heading } = router();
  await window.runGeminiAnalysis({ automatic: true });
  window.HiepCloudAI.analyze = async () => { throw new Error("HTTP 503"); };
  await window.runGeminiAnalysis({ automatic: true });
  assert.match(output.childNodes[0].textContent, /AI Cloud gặp lỗi/);
  assert.equal(output.childNodes[1], local);
  assert.equal(output.childNodes.length, 2);
  assert.equal(output.dataset.raw, localRaw);
  assert.equal(heading.textContent, localTitle);
});

test("new charts start their own cloud analysis and ignore older results", async () => {
  const { window, output } = router();
  const finish = [];
  window.HiepCloudAI.analyze = () => new Promise(resolve => finish.push(resolve));
  const oldRun = window.runGeminiAnalysis({ automatic: true });
  window.__HIEP_TUVI_CHART__ = { chart_id: "1" };
  const newReport = element("div");
  newReport.className = "full-offline-reading";
  output.replaceChildren(newReport);
  delete output.dataset.localRulesRaw;
  output.dataset.raw = "Báo cáo mới";
  const newRun = window.runGeminiAnalysis({ automatic: true });
  finish[1]({ text: "Luận giải mới", provider: "openai", model: "test" });
  await newRun;
  finish[0]({ text: "Luận giải cũ", provider: "anthropic", model: "test" });
  assert.equal((await oldRun).reason, "chart-changed");
  assert.equal(output.dataset.raw, "Luận giải mới\n\n---\n\nBáo cáo mới");
  assert.match(output.childNodes[0].textContent, /ChatGPT/);
  assert.equal(output.querySelector(".full-offline-reading"), newReport);
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
