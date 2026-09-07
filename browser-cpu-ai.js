"use strict";

(function initHiepCpuAI(root) {
  const VERSION = "1.0.0";
  const MODEL = Object.freeze({
    id: "onnx-community/Qwen2.5-0.5B-Instruct",
    label: "Qwen2.5 0.5B — CPU/WASM dự phòng (~0.5 GB model)",
    backend: "cpu-wasm",
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
    if (!available()) throw new Error("Trình duyệt không hỗ trợ Web Worker/WebAssembly cho AI CPU.");
    const url = new URL("browser-cpu-ai-worker.js?v=1.0.0", location.href);
    worker = new Worker(url, { type: "module", name: "hiep-tuvi-cpu-ai" });
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
      if (message.type === "error") task.reject(new Error(message.error || "AI CPU lỗi không xác định."));
      else {
        if (message.data?.ok && message.data?.backend === "cpu-wasm") ready = true;
        task.resolve(message.data ?? message);
      }
    };
    worker.onerror = (event) => {
      const error = new Error(event?.message || "Không khởi động được AI CPU/WASM.");
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
    const timeoutMs = Math.max(60000, Number(options.timeoutMs || 45 * 60 * 1000));
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(requestId);
        reject(new Error("AI CPU/WASM không phản hồi trong giới hạn thời gian."));
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
    if (!String(prompt || "").trim()) throw new Error("Prompt AI CPU đang trống.");
    const maxTokens = Math.max(128, Math.min(850, Number(options.maxTokens || 600)));
    const data = await request("generate", {
      prompt: String(prompt),
      options: { maxTokens },
    }, options);
    ready = true;
    return data;
  }

  async function unload() {
    if (!worker) return;
    try { await request("unload", {}, { timeoutMs: 60000 }); } catch (_) {}
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
