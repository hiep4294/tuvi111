const WEBLLM_URL = "https://esm.run/@mlc-ai/web-llm@0.2.84";

let webllmPromise = null;
let engine = null;
let loadedModel = "";

function post(type, requestId, payload = {}) {
  self.postMessage({ type, requestId, ...payload });
}

async function loadWebLLM() {
  if (!webllmPromise) {
    webllmPromise = import(WEBLLM_URL).catch((error) => {
      webllmPromise = null;
      throw error;
    });
  }
  return webllmPromise;
}

async function ensureModel(model, requestId) {
  const selected = String(model || "").trim();
  if (!selected) throw new Error("Chưa chọn model WebLLM.");
  if (engine && loadedModel === selected) return engine;

  const webllm = await loadWebLLM();
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
      post("progress", requestId, {
        progress: {
          text: String(report?.text || "Đang tải model..."),
          progress: Number(report?.progress || 0),
          timeElapsed: Number(report?.timeElapsed || 0),
        },
      });
    },
  });
  loadedModel = selected;
  return engine;
}

async function handleInit(message) {
  await ensureModel(message.model, message.requestId);
  return { ok: true, model: loadedModel };
}

async function handleGenerate(message) {
  const current = await ensureModel(message.model, message.requestId);
  post("progress", message.requestId, {
    progress: { text: "Model đã sẵn sàng, đang tổng kết...", progress: 1 },
  });

  const request = {
    messages: [{ role: "user", content: String(message.prompt || "") }],
    temperature: Number.isFinite(Number(message.temperature)) ? Number(message.temperature) : 0.2,
    top_p: 0.9,
    max_tokens: Math.max(256, Math.min(1800, Number(message.maxTokens || 1300))),
  };
  if (String(message.model || "").startsWith("Qwen3-")) request.enable_thinking = false;

  const response = await current.chat.completions.create(request);
  const text = String(response?.choices?.[0]?.message?.content || "").trim();
  if (!text) throw new Error("Model WebLLM không trả về nội dung.");

  return {
    text,
    model: loadedModel,
    local: true,
    usage: response?.usage || {},
  };
}

async function handleUnload() {
  if (engine) {
    try { await engine.unload(); } catch (_) {}
  }
  engine = null;
  loadedModel = "";
  return { ok: true };
}

self.onmessage = async (event) => {
  const message = event.data || {};
  const requestId = Number(message.requestId || 0);
  try {
    let data;
    if (message.type === "init") data = await handleInit(message);
    else if (message.type === "generate") data = await handleGenerate(message);
    else if (message.type === "unload") data = await handleUnload();
    else if (message.type === "ping") data = { ok: true, model: loadedModel };
    else throw new Error(`Lệnh AI local không hỗ trợ: ${String(message.type || "")}`);
    post(message.type === "init" ? "ready" : "result", requestId, { data, model: loadedModel });
  } catch (error) {
    post("error", requestId, { error: String(error?.message || error) });
  }
};
