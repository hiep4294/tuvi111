"use strict";

import { pipeline, env } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1";

const MODEL_ID = "onnx-community/Qwen2.5-0.5B-Instruct";
const DTYPE = "q8";
let generator = null;
let loadingPromise = null;

// GitHub Pages cannot set COOP/COEP headers, so WASM threads may be unavailable.
// Keep a single-thread compatibility path unless the browser is cross-origin isolated.
try {
  env.useBrowserCache = true;
  env.allowRemoteModels = true;
  if (env.backends?.onnx?.wasm) {
    env.backends.onnx.wasm.numThreads = self.crossOriginIsolated
      ? Math.max(1, Math.min(4, Number(self.navigator?.hardwareConcurrency || 2)))
      : 1;
  }
} catch (_) {}

function postProgress(requestId, info = {}) {
  const progress = Number(info.progress);
  self.postMessage({
    type: "progress",
    requestId,
    progress: {
      status: String(info.status || "loading"),
      file: String(info.file || ""),
      progress: Number.isFinite(progress) ? progress / (progress > 1 ? 100 : 1) : undefined,
      text: Number.isFinite(progress)
        ? `Đang tải AI CPU ${Math.max(0, Math.min(100, progress > 1 ? progress : progress * 100)).toFixed(0)}%`
        : "Đang chuẩn bị AI CPU/WASM...",
    },
  });
}

async function ensureGenerator(requestId) {
  if (generator) return generator;
  if (loadingPromise) return loadingPromise;
  loadingPromise = pipeline("text-generation", MODEL_ID, {
    device: "wasm",
    dtype: DTYPE,
    progress_callback(info) {
      postProgress(requestId, info || {});
    },
  }).then((value) => {
    generator = value;
    self.postMessage({ type: "ready", requestId, data: { ok: true, model: MODEL_ID, backend: "cpu-wasm" } });
    return value;
  }).finally(() => {
    loadingPromise = null;
  });
  return loadingPromise;
}

function extractText(output) {
  const generated = output?.[0]?.generated_text;
  if (Array.isArray(generated)) {
    const last = generated.at(-1);
    if (last && typeof last.content === "string") return last.content.trim();
  }
  if (typeof generated === "string") return generated.trim();
  if (typeof output?.[0]?.text === "string") return output[0].text.trim();
  return "";
}

async function generate(requestId, prompt, options = {}) {
  const pipe = await ensureGenerator(requestId);
  const maxNewTokens = Math.max(128, Math.min(850, Number(options.maxTokens || 600)));
  const messages = [
    {
      role: "system",
      content: "Bạn là Hiep TuVi AI. Chỉ diễn giải FACT/CALC và rule được cung cấp; không tự an lại sao; viết tiếng Việt rõ, có cơ chế, không một sao = một kết luận.",
    },
    { role: "user", content: String(prompt || "") },
  ];
  self.postMessage({
    type: "progress",
    requestId,
    progress: { status: "generating", text: "AI CPU/WASM đang viết báo cáo..." },
  });
  const output = await pipe(messages, {
    max_new_tokens: maxNewTokens,
    do_sample: false,
    repetition_penalty: 1.08,
  });
  const text = extractText(output);
  if (!text) throw new Error("AI CPU/WASM không trả về nội dung.");
  return {
    text,
    model: MODEL_ID,
    backend: "cpu-wasm",
    local: true,
  };
}

self.onmessage = async (event) => {
  const message = event.data || {};
  const requestId = Number(message.requestId || 0);
  try {
    if (message.type === "init") {
      await ensureGenerator(requestId);
      self.postMessage({ type: "result", requestId, data: { ok: true, model: MODEL_ID, backend: "cpu-wasm" } });
      return;
    }
    if (message.type === "generate") {
      const data = await generate(requestId, message.prompt, message.options || {});
      self.postMessage({ type: "result", requestId, data });
      return;
    }
    if (message.type === "unload") {
      try { await generator?.dispose?.(); } catch (_) {}
      generator = null;
      self.postMessage({ type: "result", requestId, data: { ok: true } });
      return;
    }
    throw new Error(`CPU AI request không hỗ trợ: ${String(message.type || "")}`);
  } catch (error) {
    self.postMessage({
      type: "error",
      requestId,
      error: String(error?.message || error),
    });
  }
};
