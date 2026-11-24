import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(new URL("../cloud-ai.js", import.meta.url), "utf8");
const endpoint = "https://tuvi.example.workers.dev";
const endpointKey = "tuvi-gemini-worker-endpoint";

function browser(values = {}, payload = {}, status = 200, timers = { setTimeout, clearTimeout }) {
  const storage = new Map(Object.entries(values));
  const calls = [];
  const window = {
    navigator: { onLine: true },
    localStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: key => storage.delete(key),
    },
    async fetch(url, options) {
      calls.push({ url, ...options, body: options.body && JSON.parse(options.body) });
      options.signal.throwIfAborted();
      return Response.json(payload, { status });
    },
  };
  vm.runInNewContext(source, { window, URL, AbortController, ...timers });
  return { api: window.HiepCloudAI, calls, window, storage };
}

test("offline, missing settings and insecure Worker URLs disable cloud", async () => {
  assert.equal(browser().api.isAvailable(), false);
  assert.equal(browser({ [endpointKey]: "http://insecure.test" }).api.isAvailable(), false);
  const { api, calls, window } = browser({ [endpointKey]: endpoint });
  window.navigator.onLine = false;
  assert.equal(api.isAvailable(), false);
  await assert.rejects(api.analyze("prompt"), /Offline/);
  assert.equal(calls.length, 0);
});

test("legacy Worker setting sends auto to /analyze without browser credentials", async () => {
  const data = { provider: "openai", model: "worker-model", text: "tổng hợp" };
  const { api, calls } = browser({ [endpointKey]: endpoint + "/analyze/" }, data);
  assert.equal(api.isAvailable(), true);
  assert.deepEqual({ ...await api.analyze("prompt", { maxTokens: 1370 }) }, data);
  assert.equal(calls[0].url, endpoint + "/analyze");
  assert.deepEqual(calls[0].body, { prompt: "prompt", provider: "auto", max_output_tokens: 1370 });
  assert.deepEqual({ ...calls[0].headers }, { "Content-Type": "application/json" });
  assert.equal(calls[0].credentials, "omit");
});

test("analyze uses the default and custom timeouts to abort fetch and forwards the Worker limits", async () => {
  const delays = [];
  const timers = {
    setTimeout(abort, delay) {
      delays.push(delay);
      abort();
      return delay;
    },
    clearTimeout() {},
  };
  const { api, calls } = browser({ [endpointKey]: endpoint }, {}, 200, timers);
  await assert.rejects(api.analyze("prompt"), { name: "AbortError" });
  await assert.rejects(api.analyze("prompt", { maxTokens: 8000, timeoutMs: 240000 }), { name: "AbortError" });
  assert.deepEqual(delays, [90000, 240000]);
  assert.deepEqual(calls[1].body, { prompt: "prompt", provider: "auto", max_output_tokens: 8000, timeout_ms: 240000 });
});

for (const provider of ["anthropic", "openai"]) {
  test(`direct ${provider} request uses its own headers, model and token limit`, async () => {
    const anthropic = provider === "anthropic";
    const payload = anthropic ? { content: [{ text: "một" }, { text: "hai" }] } : { choices: [{ message: { content: "một" } }] };
    const { api, calls, storage } = browser({ [endpointKey]: endpoint }, payload);
    api.save({ mode: "direct", provider, key: "example-only" });
    assert.equal(storage.has(endpointKey), false);
    assert.equal(api.settings().provider, provider);
    const result = await api.analyze("dữ liệu", { maxTokens: 1400 });
    assert.equal(result.provider, provider);
    assert.equal(result.text, anthropic ? "một\nhai" : "một");
    const call = calls[0];
    assert.equal(call.url, anthropic ? "https://api.anthropic.com/v1/messages" : "https://api.openai.com/v1/chat/completions");
    assert.deepEqual(call.body.messages, [{ role: "user", content: "dữ liệu" }]);
    assert.equal(call.body.model, anthropic ? "claude-sonnet-5-5" : "gpt-5-mini");
    if (anthropic) {
      assert.equal(call.headers["anthropic-dangerous-direct-browser-access"], "true");
      assert.equal(call.headers["anthropic-version"], "2023-06-01");
      assert.equal(call.headers["x-api-key"], "example-only");
      assert.equal(call.body.max_tokens, 1400);
      assert.equal(call.body.temperature, 0.35);
    } else {
      assert.equal(call.headers.Authorization, "Bearer example-only");
      assert.equal(call.body.max_completion_tokens, 1400);
    }
    await api.test();
    assert.equal(calls[1].method, "GET");
    assert.ok(calls[1].url.endsWith("/models/" + call.body.model));
    api.save({ mode: "worker", endpoint });
    assert.equal(storage.has("tuvi-cloud-key"), false);
    assert.equal(api.settings().endpoint, endpoint);
  });
}

test("HTTP failures, empty output and caller cancellation reject", async () => {
  const config = { [endpointKey]: endpoint };
  await assert.rejects(browser(config, {}, 503).api.analyze("prompt"), /HTTP 503/);
  await assert.rejects(browser(config).api.analyze("prompt"), /văn bản/);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(browser(config).api.analyze("prompt", { signal: controller.signal }), { name: "AbortError" });
});

test("Worker health reports an unconfigured Worker without invoking analysis", async () => {
  const { api, calls } = browser({ [endpointKey]: endpoint }, { ok: true, providers: { anthropic: false, openai: false, gemini: false } });
  await assert.rejects(api.test(), /chưa cấu hình khóa/);
  assert.equal(calls[0].url, endpoint + "/health");
  assert.equal(calls[0].method, "GET");
});
