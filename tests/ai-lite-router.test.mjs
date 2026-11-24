import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import test from "node:test";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const source = readFileSync(join(root, "ai-lite-router.js"), "utf8");
const autonomous = readFileSync(join(root, "autonomous.js"), "utf8");

assert.match(source, /VERSION = "1.7.0"/);
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
    tag, dataset: {}, style: {}, childNodes: [], value: "",
    addEventListener(event, handler) { this[event] = handler; },
    setAttribute(name, value) { this[name] = value; },
    focus() { this.focused = true; },
    select() { this.selected = true; },
    appendChild(node) { this.append(node); },
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

function router({ cloudFails = false, online = true, configured = true, storage = new Map() } = {}) {
  const calls = [];
  const alerts = [];
  const toasts = [];
  const clip = [];
  const tabs = [];
  const body = element("body");
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
  const nodes = {
    geminiOutput: output,
    geminiResultPanel: panel,
    chatGptPaste: { ...element("div"), hidden: true },
    chatGptReply: element("textarea"),
  };
  for (const id of ["sendChatGptButton", "pasteChatGptButton", "readChatGptClipboardButton",
    "applyChatGptButton", "cancelChatGptButton", "clearChatGptButton"]) nodes[id] = element("button");
  nodes.clearChatGptButton.hidden = true;
  const window = {
    navigator: { onLine: online, clipboard: { async writeText(text) { clip.push(text); } } },
    document: {
      getElementById: id => nodes[id],
      createElement: element,
      body,
      execCommand(command) {
        assert.equal(command, "copy");
        assert.equal(body.childNodes[0].selected, true);
        clip.push(body.childNodes[0].value);
        return true;
      },
    },
    localStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: key => storage.delete(key),
    },
    open: (...args) => tabs.push(args),
    alert: message => alerts.push(message),
    toast: message => toasts.push(message),
    addEventListener() {},
    __HIEP_TUVI_CHART__: { chart_id: "1" },
    HiepTuViAI: { buildBrowserSummaryPrompt: () => "full prompt", buildCompactEvidenceText: () => "CPU prompt" },
    HiepTuViKnowledge: {},
    HiepCloudAI: {
      settings: () => ({ mode: "direct" }),
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
  vm.runInNewContext(autonomous, window);
  vm.runInNewContext(source, window);
  return { window, calls, output, local, heading, nodes, storage, alerts, toasts, clip, tabs };
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

test("automatic local choice bypasses cloud and the pasted reply but still allows manual analysis", async () => {
  const storage = new Map([["tuvi-chatgpt-reply:1", "Bản ChatGPT đã dán"]]);
  const { window, calls, output, local } = router({ storage });
  window.__HIEP_ANALYSIS_CHOICE__ = "local";
  let availabilityChecks = 0;
  window.HiepCloudAI.isAvailable = () => { availabilityChecks++; return true; };
  assert.deepEqual({ ...await window.runGeminiAnalysis({ automatic: true }) }, { skipped: true, reason: "user-chose-local" });
  assert.equal(availabilityChecks, 0);
  assert.deepEqual(calls, []);
  assert.equal(output.childNodes[0].textContent, "Đã chọn lá số cục bộ");
  assert.equal(output.childNodes[1], local);
  assert.equal(output.dataset.raw, localRaw);
  assert.equal(window.status, "Đã chọn lá số cục bộ");
  assert.equal(storage.get("tuvi-chatgpt-reply:1"), "Bản ChatGPT đã dán");
  assert.equal((await window.runGeminiAnalysis()).backend, "cloud");
  assert.deepEqual(calls, ["cloud"]);
});

test("scheduled AI choice uses the bridge even if a newer selection is local", async () => {
  const { window } = router();
  window.__HIEP_ANALYSIS_CHOICE__ = "local";
  window.HiepCloudAI.isAvailable = ({ bridge }) => bridge;
  window.HiepCloudAI.settings = ({ bridge }) => ({ mode: bridge ? "worker" : "direct", token: "demo" });
  window.HiepCloudAI.analyze = async (_, { bridge, timeoutMs }) => {
    assert.equal(bridge, true);
    assert.equal(timeoutMs, 650000);
    return { text: "Luận giải", provider: "chatgpt-desktop" };
  };
  assert.equal((await window.runGeminiAnalysis({ automatic: true, analysisChoice: "ai" })).backend, "cloud");
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

test("desktop bridge displays the waiting message, safe reply and provider label", async () => {
  const { window, output, local } = router();
  window.HiepCloudAI.settings = () => ({ mode: "worker", token: "demo" });
  window.HiepCloudAI.analyze = async (prompt, { timeoutMs }) => {
    assert.ok(prompt.includes(localRaw));
    assert.equal(timeoutMs, 650000);
    return { text: "<kết quả>", model: "ChatGPT", provider: "chatgpt-desktop" };
  };
  const pending = window.runGeminiAnalysis({ automatic: true });
  assert.equal(output.querySelector(".ai-lite-status").textContent, "ChatGPT đang luận giải trên máy nhà (có thể mất 1–5 phút)...");
  await pending;
  assert.equal(output.childNodes[0].textContent, "LUẬN GIẢI AI · ChatGPT (trò chuyện)");
  assert.equal(output.childNodes[1].innerHTML, "&lt;kết quả&gt;");
  assert.equal(output.querySelector("details").childNodes[1], local);
});

test("failed bridge health restores the report and identifies the offline home PC", async () => {
  const { window, output, local, storage } = router();
  storage.set("tuvi-bridge-token", "demo");
  Object.assign(window, { URL, AbortController, setTimeout, clearTimeout });
  const calls = [];
  window.fetch = async url => { calls.push(url); return new Response(null, { status: 502 }); };
  vm.runInNewContext(readFileSync(join(root, "cloud-ai.js"), "utf8"), window);
  assert.equal((await window.runGeminiAnalysis({ automatic: true })).backend, "local-rules");
  assert.equal(calls.length, 1);
  assert.ok(calls[0].endsWith("/health"));
  assert.equal(output.childNodes[0].textContent, "Máy ChatGPT đang tắt · hiển thị báo cáo cục bộ");
  assert.equal(output.childNodes[1], local);
  assert.equal(output.dataset.raw, localRaw);
});

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

test("sending to ChatGPT copies the original report even when it is inside closed details", async () => {
  const { window, nodes, clip, tabs, toasts } = router();
  await window.runGeminiAnalysis({ automatic: true });
  await nodes.sendChatGptButton.click();
  assert.match(clip[0], /BẮT ĐẦU BÁO CÁO CỤC BỘ/);
  assert.ok(clip[0].includes(localRaw));
  assert.doesNotMatch(clip[0], /<synthesis>/);
  assert.deepEqual(tabs, [["https://chatgpt.com/", "_blank", "noopener"]]);
  assert.equal(nodes.chatGptPaste.hidden, false);
  assert.match(toasts.at(-1), /^Đã sao chép báo cáo\. Dán vào ChatGPT/);
});

test("sending falls back to textarea copy and requires a chart", async () => {
  const { window, nodes, clip, tabs, alerts } = router({ configured: false });
  window.navigator.clipboard.writeText = async () => { throw new Error("denied"); };
  await nodes.sendChatGptButton.click();
  assert.ok(clip[0].includes(localRaw));
  assert.equal(window.document.body.childNodes.length, 0);
  delete window.__HIEP_TUVI_CHART__;
  await nodes.sendChatGptButton.click();
  assert.deepEqual(alerts, ["Chưa lập lá số."]);
  assert.equal(clip.length, 1);
  assert.equal(tabs.length, 1);
});

test("applying ChatGPT uses safe rendering with closed details and removes the previous cloud error", async () => {
  const { window, nodes, output, local, heading } = router({ cloudFails: true });
  await window.runGeminiAnalysis({ automatic: true });
  assert.ok(output.querySelector(".ai-lite-fallback-note"));

  nodes.pasteChatGptButton.click();
  assert.equal(nodes.chatGptPaste.hidden, false);
  const text = "## Luận giải từ ChatGPT\n<img src=x onerror=alert(1)>";
  nodes.chatGptReply.value = text;
  nodes.applyChatGptButton.click();
  const [label, body, details] = output.childNodes;
  assert.equal(label.textContent, "LUẬN GIẢI AI · ChatGPT (trò chuyện)");
  assert.match(body.innerHTML, /Luận giải từ ChatGPT\n&lt;img/);
  assert.doesNotMatch(body.innerHTML, /<img/);
  assert.equal(details.tag, "details");
  assert.equal(details.open, false);
  assert.equal(details.childNodes[1], local);
  assert.equal(output.querySelector(".ai-lite-fallback-note"), null);
  assert.equal(output.dataset.raw, `${text}\n\n---\n\n${localRaw}`);
  assert.equal(heading.textContent, "Hiep TuVi — luận giải AI");
  assert.equal(nodes.chatGptPaste.hidden, true);
});

test("empty replies leave the report intact and clipboard permissions allow manual paste", async () => {
  const { window, nodes, output, alerts, toasts } = router({ configured: false });
  nodes.pasteChatGptButton.click();
  nodes.chatGptReply.value = " \n ";
  nodes.applyChatGptButton.click();
  assert.deepEqual(alerts, ["Chưa dán luận giải từ ChatGPT."]);
  assert.equal(output.dataset.raw, localRaw);
  assert.equal(nodes.chatGptPaste.hidden, false);

  window.navigator.clipboard.readText = async () => { throw new Error("denied"); };
  await nodes.readChatGptClipboardButton.click();
  assert.match(toasts.at(-1), /Ctrl\+V/);
  window.navigator.clipboard.readText = async () => "Luận giải từ clipboard";
  await nodes.readChatGptClipboardButton.click();
  assert.equal(nodes.chatGptReply.value, "Luận giải từ clipboard");
  nodes.cancelChatGptButton.click();
  assert.equal(nodes.chatGptReply.value, "");
  assert.equal(nodes.chatGptPaste.hidden, true);
});

test("saved replies restore only for the same chart when cloud is unavailable and can be deleted", async () => {
  const first = router({ configured: false });
  first.nodes.pasteChatGptButton.click();
  first.nodes.chatGptReply.value = "Bản đã lưu";
  first.nodes.applyChatGptButton.click();
  assert.equal(first.storage.get("tuvi-chatgpt-reply:1"), "Bản đã lưu");

  const options = { configured: false, storage: first.storage };
  const other = router(options);
  other.window.__HIEP_TUVI_CHART__ = { chart_id: "2" };
  await other.window.runGeminiAnalysis({ automatic: true });
  assert.equal(other.output.dataset.raw, localRaw);
  assert.equal(other.nodes.clearChatGptButton.hidden, true);

  const cloud = router({ storage: first.storage });
  assert.equal((await cloud.window.runGeminiAnalysis({ automatic: true })).backend, "cloud");

  const same = router(options);
  assert.equal((await same.window.runGeminiAnalysis({ automatic: true })).backend, "chatgpt-paste");
  assert.equal(same.output.dataset.raw, `Bản đã lưu\n\n---\n\n${localRaw}`);
  assert.equal(same.nodes.clearChatGptButton.hidden, false);
  same.nodes.clearChatGptButton.click();
  assert.equal(same.output.dataset.raw, localRaw);
  assert.equal(same.heading.textContent, localTitle);
  assert.equal(same.nodes.clearChatGptButton.hidden, true);
  assert.equal(first.storage.has("tuvi-chatgpt-reply:1"), false);
});

test("only the 20 most recently saved chart replies are kept", () => {
  const { window, nodes, storage } = router({ configured: false });
  for (const id of [1, 2, 1, ...Array.from({ length: 19 }, (_, i) => i + 3)]) {
    window.__HIEP_TUVI_CHART__ = { chart_id: id };
    nodes.pasteChatGptButton.click();
    nodes.chatGptReply.value = `Luận giải ${id}`;
    nodes.applyChatGptButton.click();
  }
  assert.equal([...storage.keys()].filter(key => key.startsWith("tuvi-chatgpt-reply:")).length, 20);
  assert.equal(storage.get("tuvi-chatgpt-reply:1"), "Luận giải 1");
  assert.equal(storage.has("tuvi-chatgpt-reply:2"), false);
  assert.equal(storage.get("tuvi-chatgpt-reply:21"), "Luận giải 21");
});

test("a cloud request already in flight cannot replace a reply applied by the user", async () => {
  const { window, nodes, output } = router();
  let rejectCloud;
  window.HiepCloudAI.analyze = () => new Promise((_, reject) => { rejectCloud = reject; });
  const cloud = window.runGeminiAnalysis({ automatic: true });
  nodes.pasteChatGptButton.click();
  nodes.chatGptReply.value = "Bản ChatGPT";
  nodes.applyChatGptButton.click();
  rejectCloud(new Error("HTTP 503"));
  assert.equal((await cloud).reason, "chatgpt-replaced");
  assert.equal(output.querySelector(".ai-lite-fallback-note"), null);
  assert.equal(output.dataset.raw, `Bản ChatGPT\n\n---\n\n${localRaw}`);
});
