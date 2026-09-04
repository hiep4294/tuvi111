"use strict";

(function initHiepBrowserAI(root) {
  const VERSION = "1.0.0";
  const WEBLLM_URL = "https://esm.run/@mlc-ai/web-llm@0.2.84";
  const DEFAULT_MODEL = "Llama-3.2-3B-Instruct-q4f16_1-MLC";
  const MODELS = Object.freeze([
    {
      id: "Llama-3.2-3B-Instruct-q4f16_1-MLC",
      label: "Llama 3.2 3B — mặc định (~2.3 GB VRAM)",
      tier: "standard",
    },
    {
      id: "DeepSeek-R1-Distill-Qwen-7B-q4f16_1-MLC",
      label: "DeepSeek R1 Qwen 7B — máy mạnh (~5.1 GB VRAM)",
      tier: "strong",
    },
    {
      id: "Llama-3.2-1B-Instruct-q4f16_1-MLC",
      label: "Llama 3.2 1B — máy yếu (~0.9 GB VRAM)",
      tier: "lite",
    },
  ]);

  let libraryPromise = null;
  let engine = null;
  let loadedModel = "";

  function webGpuAvailable() {
    return typeof navigator !== "undefined" && Boolean(navigator.gpu);
  }

  async function loadLibrary() {
    if (libraryPromise) return libraryPromise;
    libraryPromise = import(WEBLLM_URL).catch((error) => {
      libraryPromise = null;
      throw new Error(`Không tải được WebLLM runtime: ${String(error?.message || error)}`);
    });
    return libraryPromise;
  }

  async function inspectGpu() {
    if (!webGpuAvailable()) {
      return { ok: false, reason: "Trình duyệt không hỗ trợ WebGPU." };
    }
    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) return { ok: false, reason: "Không lấy được WebGPU adapter." };
      const limits = adapter.limits || {};
      return {
        ok: true,
        maxStorageBufferBindingSize: Number(limits.maxStorageBufferBindingSize || 0),
        maxBufferSize: Number(limits.maxBufferSize || 0),
      };
    } catch (error) {
      return { ok: false, reason: String(error?.message || error) };
    }
  }

  function modelRecord(modelId) {
    return MODELS.find((model) => model.id === modelId) || MODELS[0];
  }

  async function ensureModel(modelId = DEFAULT_MODEL, options = {}) {
    const selected = modelRecord(modelId).id;
    if (!webGpuAvailable()) throw new Error("WebGPU chưa sẵn sàng. Hãy dùng Chrome/Edge mới trên máy có GPU phù hợp.");
    if (engine && loadedModel === selected) return engine;

    const webllm = await loadLibrary();
    if (engine && loadedModel !== selected) {
      try { await engine.unload(); } catch (_) {}
      engine = null;
      loadedModel = "";
    }

    const appConfig = {
      ...webllm.prebuiltAppConfig,
      cacheBackend: "indexeddb",
    };

    engine = await webllm.CreateMLCEngine(selected, {
      appConfig,
      logLevel: "WARN",
      initProgressCallback(report) {
        if (typeof options.onProgress === "function") {
          options.onProgress({
            text: String(report?.text || "Đang tải model..."),
            progress: Number(report?.progress || 0),
            timeElapsed: Number(report?.timeElapsed || 0),
          });
        }
      },
    });
    loadedModel = selected;
    return engine;
  }

  async function generate(prompt, options = {}) {
    const selected = modelRecord(options.model || DEFAULT_MODEL).id;
    const currentEngine = await ensureModel(selected, options);
    const maxTokens = Math.max(256, Math.min(1800, Number(options.maxTokens || 1400)));
    const response = await currentEngine.chat.completions.create({
      messages: [
        {
          role: "user",
          content: String(prompt || ""),
        },
      ],
      temperature: Number.isFinite(Number(options.temperature)) ? Number(options.temperature) : 0.25,
      top_p: 0.9,
      max_tokens: maxTokens,
    });

    const text = String(response?.choices?.[0]?.message?.content || "").trim();
    if (!text) throw new Error("Model cục bộ không trả về nội dung.");
    return {
      text,
      model: selected,
      local: true,
      usage: response?.usage || {},
    };
  }

  async function unload() {
    if (engine) {
      try { await engine.unload(); } catch (_) {}
    }
    engine = null;
    loadedModel = "";
  }

  root.HiepBrowserAI = Object.freeze({
    VERSION,
    DEFAULT_MODEL,
    MODELS,
    WEBLLM_URL,
    webGpuAvailable,
    inspectGpu,
    ensureModel,
    generate,
    unload,
    get loadedModel() { return loadedModel; },
  });
})(typeof globalThis !== "undefined" ? globalThis : this);
