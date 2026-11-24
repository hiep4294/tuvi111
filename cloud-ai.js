"use strict";

(function installCloudAI(root) {
  const ENDPOINT = "tuvi-gemini-worker-endpoint";
  const PROVIDER = "tuvi-cloud-provider";
  const KEY = "tuvi-cloud-key";
  const DEFAULT_TIMEOUT_MS = 90000;
  const MODELS = { anthropic: "claude-sonnet-5-5", openai: "gpt-5-mini" };

  function workerBase(value) {
    if (!value) return "";
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) {
      throw new Error("Địa chỉ Worker phải là URL HTTPS.");
    }
    return url.href.replace(/\/+$/, "").replace(/\/(health|analyze)$/, "");
  }

  function settings() {
    try {
      const provider = root.localStorage.getItem(PROVIDER);
      if (provider === "anthropic" || provider === "openai") {
        return { mode: "direct", provider, key: root.localStorage.getItem(KEY) || "", endpoint: "" };
      }
      return { mode: "worker", endpoint: workerBase(root.localStorage.getItem(ENDPOINT)), provider: "anthropic", key: "" };
    } catch (_) {
      return { mode: "worker", endpoint: "", provider: "anthropic", key: "" };
    }
  }

  function save({ mode, endpoint, provider, key }) {
    const storage = root.localStorage;
    if (mode === "direct") {
      if (provider !== "anthropic" && provider !== "openai") throw new Error("Nhà cung cấp không hợp lệ.");
      storage.removeItem(KEY);
      storage.setItem(PROVIDER, provider);
      if (key.trim()) storage.setItem(KEY, key.trim());
      storage.removeItem(ENDPOINT);
    } else {
      let base;
      try { base = workerBase(endpoint.trim()); }
      catch (_) { throw new Error("Địa chỉ Worker phải là URL HTTPS hợp lệ."); }
      if (base) storage.setItem(ENDPOINT, base);
      else storage.removeItem(ENDPOINT);
      storage.removeItem(KEY);
      storage.removeItem(PROVIDER);
    }
  }

  function configured(config) {
    return Boolean(config.mode === "direct" ? config.key : config.endpoint);
  }

  function isAvailable() {
    return root.navigator.onLine === true && configured(settings());
  }

  function activeSettings() {
    if (root.navigator.onLine !== true) throw new Error("Offline · dùng AI cục bộ/Local Rules");
    const config = settings();
    if (!configured(config)) throw new Error("Chưa cấu hình AI Cloud.");
    return config;
  }

  async function request(url, headers, body, signal, timeoutMs = DEFAULT_TIMEOUT_MS) {
    const controller = new AbortController();
    const abort = () => controller.abort();
    if (signal?.aborted) abort();
    else signal?.addEventListener("abort", abort, { once: true });
    const timer = setTimeout(abort, timeoutMs);
    try {
      const response = await root.fetch(url, {
        method: body ? "POST" : "GET",
        headers: body ? { ...headers, "Content-Type": "application/json" } : headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
        cache: "no-store",
        redirect: "error",
        credentials: "omit",
      });
      if (!response.ok) throw new Error(`AI Cloud HTTP ${response.status}`);
      return await response.json();
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
    }
  }

  function directApi({ provider, key }) {
    if (provider === "anthropic") {
      return { base: "https://api.anthropic.com/v1", headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      } };
    }
    return { base: "https://api.openai.com/v1", headers: { Authorization: `Bearer ${key}` } };
  }

  async function analyze(prompt, { maxTokens = 1800, signal, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
    const config = activeSettings();
    let { provider } = config;
    let model = MODELS[provider];
    let text;
    if (config.mode === "worker") {
      const data = await request(config.endpoint + "/analyze", {}, {
        prompt, provider: "auto", max_output_tokens: maxTokens,
        ...(timeoutMs !== DEFAULT_TIMEOUT_MS ? { timeout_ms: timeoutMs } : {}),
      }, signal, timeoutMs);
      text = data.text;
      provider = data.provider || "gemini";
      model = data.model;
    } else {
      const { base, headers } = directApi(config);
      const messages = [{ role: "user", content: prompt }];
      let data;
      if (provider === "anthropic") {
        data = await request(base + "/messages", headers, { model, messages, max_tokens: maxTokens, temperature: 0.35 }, signal, timeoutMs);
        text = data.content?.map(part => part.text).filter(Boolean).join("\n");
      } else {
        data = await request(base + "/chat/completions", headers, { model, messages, max_completion_tokens: maxTokens }, signal, timeoutMs);
        text = data.choices?.[0]?.message?.content;
      }
      model = data.model || model;
    }
    if (typeof text !== "string" || !text.trim()) throw new Error("AI Cloud không trả về văn bản.");
    return { text: text.trim(), provider, model };
  }

  async function test() {
    const config = activeSettings();
    if (config.mode === "worker") {
      const health = await request(config.endpoint + "/health", {});
      if (!health.ok) throw new Error("Worker chưa sẵn sàng.");
      if (health.providers && !Object.values(health.providers).some(Boolean)) throw new Error("Worker chưa cấu hình khóa API.");
      return "Worker";
    }
    const { base, headers } = directApi(config);
    const model = MODELS[config.provider];
    await request(base + "/models/" + model, headers);
    return model;
  }

  root.HiepCloudAI = Object.freeze({ settings, save, isAvailable, analyze, test });
})(window);
