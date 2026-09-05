import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const source = readFileSync(join(root, "autonomous.js"), "utf8");
const listeners = new Map();
const storage = new Map();

assert.match(source, /hiep-tuvi-ai\.js\?v=2\.0\.0/);
assert.match(source, /browser-ai\.js\?v=1\.1\.1/);
assert.match(source, /fullReportPlan/);
assert.match(source, /buildFullReportSectionPrompt/);
assert.match(source, /validateFullReportSection/);
assert.match(source, /requestLocalWithFallback/);
assert.match(source, /automatic:\s*true/);
assert.match(source, /chartGeneration/);
assert.match(source, /AI luận giải lại/);
assert.match(source, /webGpuAvailable/);
assert.doesNotMatch(source, /if\s*\(options\.automatic\)\s*return/);
assert.doesNotMatch(source, /15 bước/);

const nodes = {
  geminiEndpoint: { value: "preset" },
  geminiModel: { value: "", innerHTML: "", disabled: true },
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
    removeItem(key) { storage.delete(key); },
  },
  navigator: {},
  document: {
    head: null,
    getElementById(id) { return nodes[id] || null; },
    createElement() { return {}; },
    querySelectorAll() { return []; },
    querySelector() { return null; },
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
assert.equal(context.lastStatus, "AI tự động · đang kiểm tra WebGPU");

await context.runGeminiAnalysis({ automatic: true });
assert.equal(context.lastAlert, undefined, "automatic mode with no chart must fail silently");

const form = context.parseForm();
assert.equal(form.year, 2023);
nodes.birthDate.value = "2023-02-31";
assert.throws(() => context.parseForm(), /Ngày sinh không hợp lệ/);

console.log("PASS: AI full report is automatic, local-first, and form validation remains active");
