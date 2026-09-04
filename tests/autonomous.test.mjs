import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const source = readFileSync(join(root, "autonomous.js"), "utf8");
const listeners = new Map();
const storage = new Map();

assert.match(source, /final_summary_only/);
assert.match(source, /summary_only:\s*true/);
assert.match(source, /AI kết luận & tổng kết/);
assert.doesNotMatch(source, /originalRunGemini/);
assert.doesNotMatch(source, /15 bước/);

const nodes = {
  geminiEndpoint: { value: "preset" },
  geminiModel: { value: "", innerHTML: "" },
  birthForm: { reportValidity: () => true },
  birthDate: { value: "2023-05-18" },
  generateButton: { disabled: false, textContent: "old" },
};

const context = {
  console,
  Promise,
  Date,
  URL,
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
    head: null,
    getElementById(id) { return nodes[id] || null; },
    createElement() { return {}; },
    querySelectorAll() { return []; },
  },
  setGeminiStatus(message) { context.lastStatus = message; },
  callWorker() { return Promise.resolve({ ok: true }); },
  parseForm() { return { year: 2023, annual_year: 2026, gender: 1, name: "Mau" }; },
  toast(message) { context.lastToast = message; },
  addEventListener(type, handler) { listeners.set(type, handler); },
  alert(message) { context.lastAlert = message; },
};
context.window = context;
vm.runInNewContext(source, context, { filename: "autonomous.js" });

context.restoreGeminiSettings();
assert.equal(nodes.geminiEndpoint.value, "");
assert.equal(nodes.geminiModel.value, "gemini-3.8-flash");
assert.equal(context.lastStatus, "AI đang tắt");

await context.runGeminiAnalysis({ automatic: true });
assert.equal(context.lastAlert, undefined, "automatic AI must stay disabled");

const form = context.parseForm();
assert.equal(form.year, 2023);
nodes.birthDate.value = "2023-02-31";
assert.throws(() => context.parseForm(), /Ngày sinh không hợp lệ/);

console.log("PASS: AI is opt-in, summary-only, and form validation remains active");
