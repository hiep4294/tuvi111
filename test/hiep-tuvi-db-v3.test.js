"use strict";
const assert = require("node:assert/strict");
delete globalThis.HiepTuViKBData;
require("../knowledge/all-stars.js");
const kb = globalThis.HiepTuViKBData;
assert.ok(kb, "HiepTuViKBData must exist");
assert.equal(kb.dbV3.version, "3.0.0");
assert.equal(kb.dbV3.school, "NAM_PHAI_TAM_HOP");
assert.equal(kb.stars.length, 122);
assert.equal(kb.dbV3.counts.profiles, 122);
assert.equal(kb.dbV3.counts.palace_templates, 1464);
assert.equal(kb.dbV3.counts.interactions, 488);
assert.equal(kb.dbV3.counts.groups, 32);
assert.equal(kb.dbV3.counts.tu_hoa, 40);
const tuVi = kb.lookupStarV3("Tử Vi");
assert.ok(tuVi, "Tử Vi must exist");
assert.equal(tuVi.school, "NAM_PHAI_TAM_HOP");
const templ = kb.starPalaceTemplateV3("Tử Vi", "Quan Lộc");
assert.equal(templ.palace, "Quan Lộc");
assert.match(templ.guardrail, /tam phương/i);
for (const s of kb.stars) {
  assert.ok(s.name);
  assert.ok(s.native_meaning);
  assert.ok(s.health_symbolism);
  assert.ok(Number.isFinite(Number(s.default_weight)));
}
console.log("Hiep TuVi DB V3 runtime PASS", kb.dbV3.counts);
