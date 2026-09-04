"use strict";

(function initHiepBrowserAI(root) {
  const VERSION = "1.1.1";
  const DEFAULT_MODEL = "Qwen3-4B-q4f16_1-MLC";
  const MODELS = Object.freeze([
    {
      id: "Qwen3-1.7B-q4f16_1-MLC",
      label: "Qwen3 1.7B — máy yếu (~2.0 GB VRAM)",
      tier: "lite",
      vramMB: 2037,
    },
    {
      id: "Qwen3-4B-q4f16_1-MLC",
      label: "Qwen3 4B — mặc định (~3.4 GB VRAM)",
      tier: "standard",
      vramMB: 3432,
    },
    {
      id: "Qwen3-8B-q4f16_1-MLC",
      label: "Qwen3 8B — máy mạnh (~5.7 GB VRAM)",
      tier: "strong",
      vramMB: 5696,
    },
  ]);

  let worker = null;
  let nextId = 1;
  let loadedModel = "";
  const pending = new Map();

  function webGpuAvailable() {
    return typeof navigator !== "undefined" && Boolean(navigator.gpu);
  }

  function modelRecord(modelId) {
    return MODELS.find((model) => model.id === modelId) || MODELS.find((model) => model.id === DEFAULT_MODEL) || MODELS[0];
  }

  async function inspectGpu() {
    if (!webGpuAvailable()) return { ok: false, reason: "Trình duyệt không hỗ trợ WebGPU." };
    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) return { ok: false, reason: "Không lấy được WebGPU adapter." };
      const info = typeof adapter.requestAdapterInfo === "function"
        ? await adapter.requestAdapterInfo().catch(() => null)
        : null;
      return {
        ok: true,
        vendor: info?.vendor || "",
        architecture: info?.architecture || "",
        device: info?.device || "",
        description: info?.description || "",
        limits: {
          maxStorageBufferBindingSize: Number(adapter.limits?.maxStorageBufferBindingSize || 0),
          maxBufferSize: Number(adapter.limits?.maxBufferSize || 0),
        },
      };
    } catch (error) {
      return { ok: false, reason: String(error?.message || error) };
    }
  }

  function ensureWorker() {
    if (worker) return worker;
    if (typeof Worker === "undefined") throw new Error("Trình duyệt không hỗ trợ Web Worker.");
    const url = new URL("browser-ai-worker.js?v=1.1.0", location.href);
    worker = new Worker(url, { type: "module", name: "hiep-tuvi-browser-ai" });

    worker.onmessage = (event) => {
      const message = event.data || {};
      const requestId = Number(message.requestId || 0);
      if (message.type === "progress") {
        const task = pending.get(requestId);
        if (task?.onProgress) task.onProgress(message.progress || {});
        return;
      }
      if (message.type === "ready") {
        loadedModel = String(message.model || loadedModel || "");
      }
      const task = pending.get(requestId);
      if (!task) return;
      pending.delete(requestId);
      clearTimeout(task.timer);
      if (message.type === "error") task.reject(new Error(message.error || "AI local lỗi không xác định."));
      else task.resolve(message.data ?? message);
    };

    worker.onerror = (event) => {
      const error = new Error(event?.message || "Không khởi động được WebLLM worker.");
      for (const [id, task] of pending) {
        clearTimeout(task.timer);
        task.reject(error);
        pending.delete(id);
      }
      try { worker.terminate(); } catch (_) {}
      worker = null;
      loadedModel = "";
    };
    return worker;
  }

  function request(type, payload = {}, options = {}) {
    const activeWorker = ensureWorker();
    const requestId = nextId++;
    const timeoutMs = Math.max(30000, Number(options.timeoutMs || 20 * 60 * 1000));
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(requestId);
        reject(new Error("AI local không phản hồi trong giới hạn an toàn."));
      }, timeoutMs);
      pending.set(requestId, { resolve, reject, timer, onProgress: options.onProgress });
      activeWorker.postMessage({ type, requestId, ...payload });
    });
  }

  async function ensureModel(modelId = DEFAULT_MODEL, options = {}) {
    if (!webGpuAvailable()) throw new Error("WebGPU chưa sẵn sàng. Hãy dùng Chrome/Edge/Safari mới trên máy có GPU hỗ trợ WebGPU.");
    const selected = modelRecord(modelId).id;
    if (loadedModel === selected) return { ok: true, model: selected, cached: true };
    const result = await request("init", { model: selected }, options);
    loadedModel = String(result?.model || selected);
    return result;
  }

  async function generate(prompt, options = {}) {
    if (!String(prompt || "").trim()) throw new Error("Prompt AI local đang trống.");
    const selected = modelRecord(options.model || DEFAULT_MODEL).id;
    const maxTokens = Math.max(256, Math.min(1800, Number(options.maxTokens || 1300)));
    const temperature = Number.isFinite(Number(options.temperature)) ? Number(options.temperature) : 0.2;
    const data = await request("generate", {
      model: selected,
      prompt: String(prompt),
      maxTokens,
      temperature,
    }, options);
    loadedModel = String(data?.model || selected);
    return data;
  }

  async function unload() {
    if (!worker) return;
    try { await request("unload", {}, { timeoutMs: 60000 }); } catch (_) {}
    try { worker.terminate(); } catch (_) {}
    worker = null;
    loadedModel = "";
  }

  root.HiepBrowserAI = Object.freeze({
    VERSION,
    DEFAULT_MODEL,
    MODELS,
    webGpuAvailable,
    inspectGpu,
    ensureModel,
    generate,
    unload,
    modelRecord,
    get loadedModel() { return loadedModel; },
  });
})(typeof globalThis !== "undefined" ? globalThis : this);
