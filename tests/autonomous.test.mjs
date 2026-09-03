import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const source = readFileSync(join(root, "autonomous.js"), "utf8");
const listeners = new Map();
const storage = new Map();
let aiCalls = 0;
let silentTests = 0;

const nodes = {
  geminiEndpoint: { value: "preset" },
  geminiModel: { value: "" },
  birthForm: { reportValidity: () => true },
  birthDate: { value: "2023-05-18" },
  generateButton: { disabled: false, textContent: "old" },
  geminiResultPanel: {
    querySelector(selector) {
      return selector === ".section-kicker" ? { textContent: "" }
        : selector === "h2" ? { textContent: "" }
          : { textContent: "" };
    },
  },
};

const context = {
  console,
  Promise,
  setTimeout,
  clearTimeout,
  Error,
  MutationObserver: class { observe() {} },
  localStorage: {
    getItem(key) { return storage.get(key) ?? null; },
    setItem(key, value) { storage.set(key, String(value)); },
  },
  navigator: {},
  document: {
    getElementById(id) { return nodes[id] || null; },
    createElement() { return {}; },
  },
  setGeminiStatus(message) { context.lastStatus = message; },
  runGeminiAnalysis() { aiCalls += 1; return Promise.resolve(); },
  testGeminiConnection() { silentTests += 1; return Promise.resolve(); },
  callWorker() { return Promise.resolve({ ok: true }); },
  parseForm() {
    return { year: 2023, annual_year: 2026, gender: 1, name: "Mau" };
  },
  toast(message) { context.lastToast = message; },
  addEventListener(type, handler) { listeners.set(type, handler); },
};
context.window = context;
vm.runInNewContext(source, context, { filename: "autonomous.js" });

context.restoreGeminiSettings();
assert.equal(nodes.geminiEndpoint.value, "");
assert.equal(context.lastStatus, "AI đang tắt");

await context.runGeminiAnalysis({ automatic: true });
assert.equal(aiCalls, 0, "automatic AI must stay disabled");
await context.runGeminiAnalysis({});
assert.equal(aiCalls, 1, "manual AI must remain available");

await context.testGeminiConnection({ silent: true });
assert.equal(silentTests, 0, "startup must not probe an external AI endpoint");

const form = context.parseForm();
assert.equal(form.year, 2023);
nodes.birthDate.value = "2023-02-31";
assert.throws(() => context.parseForm(), /Ngày sinh không hợp lệ/);
nodes.birthDate.value = "2023-05-18";
listeners.get("DOMContentLoaded")();
assert.equal(nodes.generateButton.textContent, "Lập lá số");

console.log("PASS: AI is opt-in and form validation layer is active");
