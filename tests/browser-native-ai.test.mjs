import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const source = readFileSync(join(root, "browser-native-ai.js"), "utf8");

assert.match(source, /VERSION = "1\.0\.1"/);
assert.match(source, /LanguageModel\.availability/);
assert.match(source, /LanguageModel\.create/);
assert.match(source, /Translator\.availability/);
assert.match(source, /Translator\.create/);
assert.match(source, /sourceLanguage:\s*"vi"/);
assert.match(source, /targetLanguage:\s*"en"/);
assert.match(source, /sourceLanguage:\s*"en"/);
assert.match(source, /targetLanguage:\s*"vi"/);
assert.match(source, /HIEPTERM/);
assert.match(source, /prepareFromGesture/);
assert.match(source, /prepareTranslatorsFromGesture/);
assert.match(source, /generateVietnamese/);
assert.match(source, /destroyModelSession/);
assert.doesNotMatch(source, /fetch\(/);

console.log("PASS: Chrome built-in adapter uses on-device LanguageModel + vi/en Translator with protected astrology terms");
