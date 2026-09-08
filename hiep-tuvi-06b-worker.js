"use strict";

const TRANSFORMERS_URL = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1";
const MODEL_ID = "onnx-community/Qwen3-0.6B-ONNX";
const DEVICE = "webgpu";
const DTYPE = "q4f16";

let generator = null;
let loadingPromise = null;
let transformersPromise = null;

async function loadTransformers() {
  if (!transformersPromise) {
    transformersPromise = import(TRANSFORMERS_URL).then((mod) => {
      try {
        mod.env.useBrowserCache = true;
        mod.env.allowRemoteModels = true;
      } catch (_) {}
      return mod;
    }).catch((error) => {
      transformersPromise = null;
      throw error;
    });
  }
  return transformersPromise;
}

function progressText(info = {}) {
  const raw = Number(info.progress);
  const pct = Number.isFinite(raw) ? Math.max(0, Math.min(100, raw > 1 ? raw : raw * 100)) : null;
  const file = String(info.file || "");
  if (pct !== null) return `Đang tải Hiep-Tuvi 0.6B ${pct.toFixed(0)}%${file ? ` · ${file}` : ""}`;
  return "Đang chuẩn bị Hiep-Tuvi 0.6B...";
}

function postProgress(requestId, info = {}) {
  const raw = Number(info.progress);
  self.postMessage({
    type: "progress",
    requestId,
    progress: {
      status: String(info.status || "loading"),
      file: String(info.file || ""),
      progress: Number.isFinite(raw) ? Math.max(0, Math.min(1, raw > 1 ? raw / 100 : raw)) : undefined,
      text: progressText(info),
    },
  });
}

async function ensureGenerator(requestId) {
  if (generator) return generator;
  if (loadingPromise) return loadingPromise;

  if (!self.navigator?.gpu) throw new Error("WebGPU không khả dụng cho thử nghiệm Hiep-Tuvi 0.6B.");

  const { pipeline } = await loadTransformers();
  loadingPromise = pipeline("text-generation", MODEL_ID, {
    device: DEVICE,
    dtype: DTYPE,
    progress_callback(info) {
      postProgress(requestId, info || {});
    },
  }).then((value) => {
    generator = value;
    self.postMessage({
      type: "ready",
      requestId,
      data: { ok: true, model: MODEL_ID, backend: "transformers-webgpu", dtype: DTYPE },
    });
    return value;
  }).finally(() => {
    loadingPromise = null;
  });

  return loadingPromise;
}

function extractText(output) {
  const generated = output?.[0]?.generated_text;
  if (Array.isArray(generated)) {
    for (let index = generated.length - 1; index >= 0; index -= 1) {
      const item = generated[index];
      if (item?.role === "assistant" && typeof item.content === "string") return item.content.trim();
    }
    const last = generated.at(-1);
    if (typeof last?.content === "string") return last.content.trim();
  }
  if (typeof generated === "string") return generated.trim();
  if (typeof output?.[0]?.text === "string") return output[0].text.trim();
  return "";
}

function stripThinking(text) {
  return String(text || "")
    .replace(/<think>[\s\S]*?<\/think>\s*/gi, "")
    .replace(/^\s*<think>\s*/i, "")
    .trim();
}

async function generate(requestId, prompt, options = {}) {
  const pipe = await ensureGenerator(requestId);
  const maxNewTokens = Math.max(160, Math.min(560, Number(options.maxTokens || 430)));
  const messages = [
    {
      role: "system",
      content: "Bạn là Hiep TuVi 0.6B. Chỉ diễn giải FACT/CALC và Knowledge Base được cung cấp. Không tự an sao, không sửa dữ kiện, không một sao = một kết luận. Viết tiếng Việt ngắn, có cơ chế nhân-quả và phản biện. /no_think",
    },
    { role: "user", content: `${String(prompt || "")}\n/no_think` },
  ];

  self.postMessage({
    type: "progress",
    requestId,
    progress: { status: "generating", text: "Hiep-Tuvi 0.6B đang luận cung..." },
  });

  const output = await pipe(messages, {
    max_new_tokens: maxNewTokens,
    do_sample: true,
    temperature: 0.7,
    top_p: 0.8,
    top_k: 20,
    repetition_penalty: 1.08,
  });

  const text = stripThinking(extractText(output));
  if (!text) throw new Error("Hiep-Tuvi 0.6B không trả về nội dung.");
  return {
    text,
    model: MODEL_ID,
    backend: "transformers-webgpu",
    dtype: DTYPE,
    local: true,
  };
}

self.onmessage = async (event) => {
  const message = event.data || {};
  const requestId = Number(message.requestId || 0);
  try {
    if (message.type === "init") {
      await ensureGenerator(requestId);
      self.postMessage({ type: "result", requestId, data: { ok: true, model: MODEL_ID, backend: "transformers-webgpu", dtype: DTYPE } });
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
    throw new Error(`Hiep-Tuvi 0.6B request không hỗ trợ: ${String(message.type || "")}`);
  } catch (error) {
    self.postMessage({
      type: "error",
      requestId,
      error: String(error?.message || error),
    });
  }
};
