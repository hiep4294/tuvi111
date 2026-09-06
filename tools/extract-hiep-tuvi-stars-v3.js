"use strict";
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function norm(v) {
  return String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function mockDocument() {
  return {
    readyState: "complete",
    addEventListener() {},
    removeEventListener() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
    getElementById() { return null; },
    createElement() { return { style: {}, dataset: {}, appendChild() {}, setAttribute() {}, addEventListener() {} }; },
    body: { appendChild() {}, classList: { add() {}, remove() {} } },
    documentElement: { classList: { add() {}, remove() {} } },
  };
}

const ctx = {
  console,
  document: mockDocument(),
  navigator: { userAgent: "github-actions" },
  location: { href: "https://example.invalid/", pathname: "/" },
  setTimeout() { return 0; }, clearTimeout() {}, setInterval() { return 0; }, clearInterval() {},
  requestAnimationFrame(fn) { if (typeof fn === "function") fn(0); return 0; },
  cancelAnimationFrame() {},
  fetch: async () => ({ ok: false, json: async () => ({}) }),
  localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
};
ctx.globalThis = ctx;
ctx.window = ctx;
ctx.self = ctx;
vm.createContext(ctx);

const index = fs.readFileSync("index.html", "utf8");
const scripts = [...index.matchAll(/<script[^>]+src=["']([^"']+)["'][^>]*>/gi)]
  .map(m => m[1].split("?")[0])
  .filter(src => src.startsWith("knowledge/") && src.endsWith(".js"));

const ordered = [...new Set(scripts)];
for (const rel of ordered) {
  if (!fs.existsSync(rel)) continue;
  try {
    const source = fs.readFileSync(rel, "utf8");
    new vm.Script(source, { filename: rel }).runInContext(ctx, { timeout: 3000 });
  } catch (err) {
    console.error(`[extract-v3] skip ${rel}: ${err.message}`);
  }
}

// Re-run the aggregator last so it sees every previously loaded dataset.
if (fs.existsSync("knowledge/all-stars.js")) {
  try {
    new vm.Script(fs.readFileSync("knowledge/all-stars.js", "utf8"), { filename: "knowledge/all-stars.js" }).runInContext(ctx, { timeout: 3000 });
  } catch (err) {
    console.error(`[extract-v3] aggregator: ${err.message}`);
  }
}

const kb = ctx.HiepTuViKBData || {};
const sources = [];
for (const key of ["stars", "minorStars", "mainStars", "auxiliaryStars"]) {
  if (Array.isArray(kb[key])) sources.push(...kb[key]);
}
for (const key of ["stars", "minorStars"]) {
  if (Array.isArray(ctx[key])) sources.push(...ctx[key]);
}

const byName = new Map();
for (const item of sources) {
  if (!item || typeof item !== "object") continue;
  const name = item.name || item.canonical_name || item.starName;
  if (!name || typeof name !== "string") continue;
  const k = norm(name);
  if (!k) continue;
  const prior = byName.get(k) || {};
  byName.set(k, Object.assign({}, prior, item, { name }));
}

const stars = [...byName.values()].sort((a, b) => String(a.name).localeCompare(String(b.name), "vi"));
if (stars.length < 100) {
  throw new Error(`Only ${stars.length} stars extracted; expected a full tuvi111 knowledge catalog.`);
}
fs.mkdirSync("build", { recursive: true });
fs.writeFileSync("build/hiep-tuvi-stars-source-v3.json", JSON.stringify(stars, null, 2));
console.log(JSON.stringify({ extracted: stars.length, scripts: ordered.length, output: "build/hiep-tuvi-stars-source-v3.json" }));
