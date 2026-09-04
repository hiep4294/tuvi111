import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

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
