"use strict";

const PROVIDERS = ["anthropic", "openai", "gemini"];
const DEFAULT_MODEL = "gemini-3.8-flash";
const DEFAULT_ALLOWED_MODELS = ["gemini-3.8-flash", "gemini-3.7-flash", "gemini-3.5-flash"];

function responseHeaders(origin = "*") {
  return {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Headers": "Content-Type, Accept",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Vary": "Origin",
  };
}

function json(data, status = 200, origin = "*") {
  return new Response(JSON.stringify(data), {
    status,
    headers: responseHeaders(origin),
  });
}

function allowedOrigin(request, env) {
  const configured = String(env.ALLOWED_ORIGIN || "").trim();
  if (!configured) return "*";
  const origin = String(request.headers.get("Origin") || "").trim();
  return origin === configured ? origin : "";
}

function allowedModels(env) {
  const configured = String(env.ALLOWED_MODELS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return configured.length ? configured : DEFAULT_ALLOWED_MODELS;
}

async function readJson(request) {
  const type = String(request.headers.get("Content-Type") || "");
  if (!type.includes("application/json")) throw new Error("Content-Type phải là application/json.");
  return request.json();
}

function providerKeys(env) {
  return {
    anthropic: String(env.ANTHROPIC_API_KEY || "").trim(),
    openai: String(env.OPENAI_API_KEY || "").trim(),
    gemini: String(env.GEMINI_API_KEY || "").trim(),
  };
}

async function callProvider(provider, prompt, requestedModel, maxOutputTokens, env, key, timeout) {
  let url, model, headers, body;
  const messages = [{ role: "user", content: prompt }];
  if (provider === "anthropic") {
    model = env.ANTHROPIC_MODEL || "claude-sonnet-5-5";
    url = "https://api.anthropic.com/v1/messages";
    headers = { "x-api-key": key, "anthropic-version": "2023-06-01" };
    body = { model, messages, max_tokens: maxOutputTokens, temperature: 0.35 };
  } else if (provider === "openai") {
    model = env.OPENAI_MODEL || "gpt-5-mini";
    url = "https://api.openai.com/v1/chat/completions";
    headers = { Authorization: `Bearer ${key}` };
    body = { model, messages, max_completion_tokens: maxOutputTokens };
  } else {
    const models = allowedModels(env);
    model = models.includes(requestedModel) ? requestedModel : String(env.DEFAULT_MODEL || DEFAULT_MODEL);
    if (!models.includes(model)) throw Object.assign(new Error("Model Gemini không được phép."), { status: 400 });
    url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    headers = { "x-goog-api-key": key };
    body = { contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0.35, maxOutputTokens } };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
      redirect: "error",
    });
    if (!response.ok) throw Object.assign(new Error(`${provider} HTTP ${response.status}`), { status: response.status });
    const data = await response.json();
    let text, input, output, total;
    if (provider === "gemini") {
      text = data.candidates?.[0]?.content?.parts?.map(part => part.text).filter(Boolean).join("\n");
      input = data.usageMetadata?.promptTokenCount;
      output = data.usageMetadata?.candidatesTokenCount;
      total = data.usageMetadata?.totalTokenCount;
    } else if (provider === "anthropic") {
      text = data.content?.map(part => part.text).filter(Boolean).join("\n");
      input = data.usage?.input_tokens;
      output = data.usage?.output_tokens;
    } else {
      text = data.choices?.[0]?.message?.content;
      input = data.usage?.prompt_tokens;
      output = data.usage?.completion_tokens;
      total = data.usage?.total_tokens;
    }
    if (typeof text !== "string" || !text.trim()) throw new Error(`${provider} không trả về nội dung văn bản.`);
    return {
      text: text.trim(), provider, model: data.model || model,
      usage: {
        prompt_token_count: input || 0,
        candidates_token_count: output || 0,
        total_token_count: total ?? ((input || 0) + (output || 0)),
      },
    };
  } finally {
    clearTimeout(timer);
  }
}

export default {
  async fetch(request, env) {
    const origin = allowedOrigin(request, env);
    if (!origin) return json({ error: "Origin không được phép." }, 403, String(env.ALLOWED_ORIGIN || "*"));
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: responseHeaders(origin) });
    }

    const url = new URL(request.url);
    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/health")) {
      const models = allowedModels(env);
      return json({
        ok: true,
        service: "Hiep TuVi AI Worker",
        version: "1.1.0",
        providers: Object.fromEntries(Object.entries(providerKeys(env)).map(([name, key]) => [name, Boolean(key)])),
        default_model: String(env.DEFAULT_MODEL || DEFAULT_MODEL),
        allowed_models: models,
      }, 200, origin);
    }

    if (request.method !== "POST" || url.pathname !== "/analyze") {
      return json({ error: "Not found" }, 404, origin);
    }

    try {
      const body = await readJson(request);
      const prompt = String(body?.prompt || "").trim();
      if (!prompt) return json({ error: "Prompt đang trống." }, 400, origin);
      if (prompt.length > 500000) return json({ error: "Prompt vượt giới hạn 500.000 ký tự." }, 413, origin);

      const provider = body.provider ?? (body.model ? "gemini" : "auto");
      if (provider !== "auto" && !PROVIDERS.includes(provider)) return json({ error: "Provider không hợp lệ." }, 400, origin);
      const keys = providerKeys(env);
      const candidates = (provider === "auto" ? PROVIDERS : [provider]).filter(name => keys[name]);
      if (!candidates.length) return json({ error: "Worker chưa có khóa cho nhà cung cấp đã chọn." }, 503, origin);

      const requestedTokens = Number(body.max_output_tokens || 2800);
      const maxOutputTokens = Math.max(256, Math.min(8192, Number.isFinite(requestedTokens) ? Math.floor(requestedTokens) : 2800));
      // Chừa 5 giây cho web nhận phản hồi và giới hạn timeout do client yêu cầu.
      const requestedTimeout = Number(body.timeout_ms);
      const clientTimeout = Number.isFinite(requestedTimeout)
        ? Math.max(6000, Math.min(240000, requestedTimeout))
        : 90000;
      const deadline = Date.now() + clientTimeout - 5000;
      let lastError;
      for (const [index, name] of candidates.entries()) {
        try {
          const timeout = Math.max(1, Math.floor((deadline - Date.now()) / (candidates.length - index)));
          const result = await callProvider(name, prompt, body.model, maxOutputTokens, env, keys[name], timeout);
          return json({ ...result, metadata: body.metadata || null }, 200, origin);
        } catch (error) {
          lastError = error;
        }
      }
      throw lastError;
    } catch (error) {
      const status = Number(error?.status || 0);
      const safeStatus = status >= 400 && status <= 599 ? status : 502;
      return json({ error: String(error?.message || error) }, safeStatus, origin);
    }
  },
};
