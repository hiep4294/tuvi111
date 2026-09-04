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

function extractText(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts || [];
  return parts.map((part) => String(part?.text || "")).filter(Boolean).join("\n").trim();
}

async function callGemini(prompt, model, maxOutputTokens, env) {
  const apiKey = String(env.GEMINI_API_KEY || "").trim();
  if (!apiKey) throw new Error("Worker chưa có secret GEMINI_API_KEY.");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 150000);
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.35,
            maxOutputTokens,
          },
        }),
        signal: controller.signal,
      }
    );

    const raw = await response.text();
    let data = {};
    try { data = raw ? JSON.parse(raw) : {}; }
    catch (_) { data = { raw }; }
    if (!response.ok) {
      const message = data?.error?.message || data?.message || raw || `Gemini HTTP ${response.status}`;
      const error = new Error(message);
      error.status = response.status;
      throw error;
    }

    const text = extractText(data);
    if (!text) throw new Error("Gemini không trả về nội dung văn bản.");
    const usage = data.usageMetadata || {};
    return {
      text,
      usage: {
        prompt_token_count: Number(usage.promptTokenCount || 0),
        candidates_token_count: Number(usage.candidatesTokenCount || 0),
        total_token_count: Number(usage.totalTokenCount || 0),
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
        version: "1.0.1",
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

      const models = allowedModels(env);
      const requestedModel = String(body?.model || env.DEFAULT_MODEL || DEFAULT_MODEL).trim();
      const model = models.includes(requestedModel) ? requestedModel : String(env.DEFAULT_MODEL || DEFAULT_MODEL);
      if (!models.includes(model)) return json({ error: `Model không được phép: ${requestedModel}` }, 400, origin);

      const requestedTokens = Number(body?.max_output_tokens || 2800);
      const maxOutputTokens = Math.max(256, Math.min(8192, Number.isFinite(requestedTokens) ? requestedTokens : 2800));
      const result = await callGemini(prompt, model, maxOutputTokens, env);
      return json({ ...result, model, metadata: body?.metadata || null }, 200, origin);
    } catch (error) {
      const status = Number(error?.status || 0);
      const safeStatus = status >= 400 && status <= 599 ? status : 502;
      return json({ error: String(error?.message || error) }, safeStatus, origin);
    }
  },
};
