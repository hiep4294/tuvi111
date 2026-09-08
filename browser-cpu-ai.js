"use strict";

(function initHiepCpuAI(root) {
  const VERSION = "1.1.0";
  const MODEL = Object.freeze({
    id: "onnx-community/SmolLM2-135M-Instruct-ONNX-MHA",
    label: "SmolLM2 135M — CPU Lite/WASM (~0.14 GB q8)",
    backend: "cpu-wasm-lite",
  });

  let worker = null;
  let nextId = 1;
  let ready = false;
  const pending = new Map();

  function available() {
    return typeof Worker !== "undefined" && typeof WebAssembly !== "undefined";
  }

  function ensureWorker() {
    if (worker) return worker;
    if (!available()) throw new Error("Trình duyệt không hỗ trợ Web Worker/WebAssembly cho AI CPU Lite.");
    const url = new URL("browser-cpu-ai-worker.js?v=1.1.0", location.href);
    worker = new Worker(url, { type: "module", name: "hiep-tuvi-cpu-ai-lite" });
    worker.onmessage = (event) => {
      const message = event.data || {};
      const id = Number(message.requestId || 0);
      if (message.type === "progress") {
        pending.get(id)?.onProgress?.(message.progress || {});
        return;
      }
      if (message.type === "ready") {
        ready = true;
        return;
      }
      const task = pending.get(id);
      if (!task) return;
      pending.delete(id);
      clearTimeout(task.timer);
      if (message.type === "error") task.reject(new Error(message.error || "AI CPU Lite lỗi không xác định."));
      else {
        if (message.data?.ok && /cpu-wasm/.test(String(message.data?.backend || ""))) ready = true;
        task.resolve(message.data ?? message);
      }
    };
    worker.onerror = (event) => {
      const error = new Error(event?.message || "Không khởi động được AI CPU Lite/WASM.");
      for (const [id, task] of pending) {
        clearTimeout(task.timer);
        task.reject(error);
        pending.delete(id);
      }
      try { worker.terminate(); } catch (_) {}
      worker = null;
      ready = false;
    };
    return worker;
  }

  function request(type, payload = {}, options = {}) {
    const active = ensureWorker();
    const requestId = nextId++;
    const timeoutMs = Math.max(30000, Number(options.timeoutMs || 12 * 60 * 1000));
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(requestId);
        reject(new Error("AI CPU Lite/WASM không phản hồi trong giới hạn thời gian."));
      }, timeoutMs);
      pending.set(requestId, { resolve, reject, timer, onProgress: options.onProgress });
      active.postMessage({ type, requestId, ...payload });
    });
  }

  async function ensureModel(options = {}) {
    if (ready) return { ok: true, model: MODEL.id, backend: MODEL.backend, cached: true };
    const data = await request("init", {}, options);
    ready = true;
    return data;
  }

  async function generate(prompt, options = {}) {
    if (!String(prompt || "").trim()) throw new Error("Prompt AI CPU Lite đang trống.");
    const maxTokens = Math.max(96, Math.min(360, Number(options.maxTokens || 280)));
    const data = await request("generate", {
      prompt: String(prompt).slice(0, 8000),
      options: { maxTokens },
    }, options);
    ready = true;
    return data;
  }

  async function unload() {
    if (!worker) return;
    try { await request("unload", {}, { timeoutMs: 30000 }); } catch (_) {}
    try { worker.terminate(); } catch (_) {}
    worker = null;
    ready = false;
  }

  root.HiepCpuAI = Object.freeze({
    VERSION,
    MODEL,
    available,
    ensureModel,
    generate,
    unload,
    get ready() { return ready; },
  });
})(typeof globalThis !== "undefined" ? globalThis : this);
