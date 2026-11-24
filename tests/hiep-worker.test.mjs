import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import worker from "../worker/index.js";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const source = readFileSync(join(root, "worker", "index.js"), "utf8");

assert.match(source, /GEMINI_API_KEY/);
assert.match(source, /x-goog-api-key/);
assert.match(source, /generativelanguage\.googleapis\.com\/v1beta\/models/);
assert.match(source, /ALLOWED_ORIGIN/);
assert.match(source, /maxOutputTokens/);
assert.match(source, /Access-Control-Allow-Origin/);
assert.doesNotMatch(source, /AIza[0-9A-Za-z_-]{20,}/, "repository must not contain a Gemini API key");

console.log("PASS: Hiep TuVi AI Worker keeps secrets external and uses guarded Gemini REST calls");

async function analyze(env, body = {}) {
  const request = new Request("https://worker.test/analyze", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: "test", max_output_tokens: 1800, ...body }),
  });
  return worker.fetch(request, env);
}

test("health exposes only provider availability", async () => {
  const response = await worker.fetch(new Request("https://worker.test/health"), {
    ANTHROPIC_API_KEY: "private-example-a", GEMINI_API_KEY: "private-example-g", OPENAI_API_KEY: " ",
  });
  const raw = await response.text();
  assert.doesNotMatch(raw, /private-example|API_KEY/);
  assert.equal(JSON.parse(raw).version, "1.1.0");
  assert.deepEqual(JSON.parse(raw).providers, { anthropic: true, openai: false, gemini: true });
});

test("auto skips missing keys and stops after Anthropic success", async t => {
  const fetch = t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url, "https://api.anthropic.com/v1/messages");
    assert.equal(options.headers["x-api-key"], "example-a");
    assert.equal(options.headers["anthropic-version"], "2023-06-01");
    assert.deepEqual(JSON.parse(options.body), {
      model: "custom-claude", messages: [{ role: "user", content: "test" }], max_tokens: 1800, temperature: 0.35,
    });
    return Response.json({ content: [{ text: "one" }, { text: "two" }], usage: { input_tokens: 7, output_tokens: 4 } });
  });
  const data = await (await analyze({ ANTHROPIC_MODEL: "custom-claude", ANTHROPIC_API_KEY: "example-a" }, { provider: "auto" })).json();
  assert.equal(data.provider, "anthropic");
  assert.equal(data.text, "one\ntwo");
  assert.deepEqual(data.usage, { prompt_token_count: 7, candidates_token_count: 4, total_token_count: 11 });
  assert.equal(fetch.mock.callCount(), 1);
});

test("auto skips Anthropic without a key and falls back to OpenAI after an upstream failure", async t => {
  const attempts = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    attempts.push(new URL(url).hostname);
    if (url.includes("anthropic.com")) return Response.json({}, { status: 429 });
    assert.equal(url, "https://api.openai.com/v1/chat/completions");
    assert.equal(options.headers.Authorization, "Bearer example-o");
    assert.deepEqual(JSON.parse(options.body), {
      messages: [{ role: "user", content: "test" }], model: "custom-gpt", max_completion_tokens: 1800,
    });
    return Response.json({ choices: [{ message: { content: "ok" } }], usage: { prompt_tokens: 8, completion_tokens: 3 } });
  });
  const env = { OPENAI_API_KEY: "example-o", OPENAI_MODEL: "custom-gpt" };
  for (const anthropicKey of ["", "example-a"]) {
    const response = await analyze({ ...env, ANTHROPIC_API_KEY: anthropicKey }, { provider: "auto" });
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.provider, "openai");
    assert.equal(data.model, "custom-gpt");
    assert.deepEqual(data.usage, { prompt_token_count: 8, candidates_token_count: 3, total_token_count: 11 });
  }
  assert.deepEqual(attempts, ["api.openai.com", "api.anthropic.com", "api.openai.com"]);
});

test("Gemini accepts legacy model requests and also serves as the last auto provider", async t => {
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.match(url, /googleapis\.com.*gemini-3\.[58]-flash/);
    assert.equal(options.headers["x-goog-api-key"], "example-g");
    return Response.json({ candidates: [{ content: { parts: [{ text: "Gemini output" }] } }] });
  });
  const env = { GEMINI_API_KEY: "example-g" };
  for (const body of [{ provider: "auto" }, { model: "gemini-3.5-flash" }]) {
    const data = await (await analyze(env, body)).json();
    assert.equal(data.provider, "gemini");
    assert.equal(data.text, "Gemini output");
    assert.equal(data.model, body.model || "gemini-3.8-flash");
  }
  assert.equal((await analyze(env, { provider: "openai" })).status, 503);
});
