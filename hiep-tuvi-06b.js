"use strict";

(function initHiepTuVi06B(root) {
  const VERSION = "0.1.0";
  const MODEL = Object.freeze({
    id: "onnx-community/Qwen3-0.6B-ONNX",
    label: "Hiep-Tuvi 0.6B thử nghiệm · Qwen3-0.6B ONNX q4f16",
    backend: "transformers-webgpu",
    dtype: "q4f16",
  });

  let worker = null;
  let ready = false;
  let nextId = 1;
  const pending = new Map();

  function available() {
    return typeof Worker !== "undefined" && Boolean(root.navigator?.gpu);
  }

  function ensureWorker() {
    if (worker) return worker;
    if (!available()) throw new Error("Thiết bị/trình duyệt chưa có WebGPU cho Hiep-Tuvi 0.6B.");
    const url = new URL("hiep-tuvi-06b-worker.js?v=0.1.0", root.location.href);
    worker = new Worker(url, { type: "module", name: "hiep-tuvi-06b" });

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
      if (message.type === "error") task.reject(new Error(message.error || "Hiep-Tuvi 0.6B lỗi không xác định."));
      else {
        if (message.data?.ok || message.data?.model) ready = true;
        task.resolve(message.data ?? message);
      }
    };

    worker.onerror = (event) => {
      const error = new Error(event?.message || "Không khởi động được worker Hiep-Tuvi 0.6B.");
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
    const defaultTimeout = type === "init" ? 30 * 60 * 1000 : 10 * 60 * 1000;
    const timeoutMs = Math.max(60000, Number(options.timeoutMs || defaultTimeout));
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(requestId);
        reject(new Error(`Hiep-Tuvi 0.6B không phản hồi trong ${Math.round(timeoutMs / 60000)} phút.`));
      }, timeoutMs);
      pending.set(requestId, { resolve, reject, timer, onProgress: options.onProgress });
      active.postMessage({ type, requestId, ...payload });
    });
  }

  async function ensureModel(options = {}) {
    if (ready) return { ok: true, model: MODEL.id, backend: MODEL.backend, dtype: MODEL.dtype, cached: true };
    return request("init", {}, options);
  }

  async function generate(prompt, options = {}) {
    const value = String(prompt || "").trim();
    if (!value) throw new Error("Prompt Hiep-Tuvi 0.6B đang trống.");
    if (value.length > 9000) throw new Error(`Prompt thử nghiệm quá dài (${value.length} ký tự > 9000).`);
    return request("generate", {
      prompt: value,
      options: { maxTokens: Math.max(160, Math.min(560, Number(options.maxTokens || 430))) },
    }, options);
  }

  async function unload() {
    if (!worker) return { ok: true, skipped: true };
    try { await request("unload", {}, { timeoutMs: 120000 }); } catch (_) {}
    try { worker.terminate(); } catch (_) {}
    worker = null;
    ready = false;
    return { ok: true };
  }

  root.HiepTuVi06B = Object.freeze({
    VERSION,
    MODEL,
    available,
    ensureModel,
    generate,
    unload,
    get ready() { return ready; },
  });
})(typeof globalThis !== "undefined" ? globalThis : this);
