import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const context = { console };
context.globalThis = context;

for (const file of [
  "knowledge/stars.js",
  "knowledge/palaces.js",
  "knowledge/combinations.js",
  "knowledge/structures.js",
  "knowledge/bazi.js",
  "knowledge/schools.js",
  "hiep-tuvi-knowledge.js",
]) {
  vm.runInNewContext(readFileSync(join(root, file), "utf8"), context, { filename:file });
}

const knowledge = context.HiepTuViKnowledge;
assert.equal(knowledge.VERSION, "2.0.0");
assert.equal(knowledge.PROFILE, "STRUCTURED_LOCAL_KB");

const stats = knowledge.stats();
assert.ok(stats.stars >= 40, `expected >=40 star rules, got ${stats.stars}`);
assert.equal(stats.palaces, 12);
assert.ok(stats.combinations >= 15);
assert.ok(stats.structures >= 7);
assert.ok(stats.bazi_rules >= 8);
assert.ok(stats.schools >= 5);

const chart = {
  heaven: { cuc:"Thủy Nhị Cục", than_cu:"Tài Bạch" },
  palaces:[
    { palace_name:"Mệnh", branch_id:1, branch_name:"Tý", has_tuan:false, has_triet:false, stars:[
      { saoTen:"Phá Quân", nature:"main" }, { saoTen:"Hóa Quyền", nature:"transformation" }, { saoTen:"Đế Vượng", nature:"trang_sinh" },
    ]},
    { palace_name:"Quan Lộc", branch_id:5, branch_name:"Thìn", stars:[{ saoTen:"Tham Lang", nature:"main" }] },
    { palace_name:"Tài Bạch", branch_id:9, branch_name:"Thân", has_triet:true, stars:[{ saoTen:"Thất Sát", nature:"main" }] },
    { palace_name:"Thiên Di", branch_id:7, branch_name:"Ngọ", stars:[{ saoTen:"Liêm Trinh", nature:"main" }, { saoTen:"Thiên Tướng", nature:"main" }] },
  ],
  relations:{},
  bazi:{ day_master:{ stem:"Bính", element:"Hỏa" } },
};

const palaceKnowledge = knowledge.forJob(chart, { kind:"palaces", palaces:["Mệnh","Quan Lộc"] });
assert.match(palaceKnowledge, /HIEP TUVI KNOWLEDGE BASE V2/);
assert.match(palaceKnowledge, /STAR-PHAQUAN-001/);
assert.match(palaceKnowledge, /COMBO-SATPHATHAM-001/);
assert.match(palaceKnowledge, /SRC:C/);
assert.match(palaceKnowledge, /CONF:/);
assert.match(palaceKnowledge, /Tam phương tứ chính/);
assert.match(palaceKnowledge, /TỨ HÓA/);
assert.match(palaceKnowledge, /TRÀNG SINH/);
assert.ok(palaceKnowledge.length <= 4600);

const baziKnowledge = knowledge.forJob(chart, { kind:"bazi" });
assert.match(baziKnowledge, /BÁT TỰ \/ NGŨ HÀNH/);
assert.match(baziKnowledge, /BAZI-SEASON-001/);
assert.match(baziKnowledge, /Không thiếu hành nào bổ hành đó/);
assert.match(baziKnowledge, /INDEPENDENCE CHECK/);
assert.ok(baziKnowledge.length <= 4300);

const synthesis = knowledge.forJob(chart, { kind:"synthesis" });
assert.match(synthesis, /SYNTHESIS \/ RED-TEAM \/ PROVENANCE/);
assert.match(synthesis, /NAM_PHAI_TAM_HOP/);
assert.match(synthesis, /MENH_LY_THIEN_CO/);
assert.match(synthesis, /CLAIM STATES/);
assert.match(synthesis, /Barnum/);
assert.ok(synthesis.length <= 4400);

assert.equal(knowledge.ruleById("STAR-PHAQUAN-001").name, "Phá Quân");
assert.equal(knowledge.ruleById("PAL-MENH-001").name, "Mệnh");
assert.equal(knowledge.ruleById("missing"), null);

console.log("PASS: Hiep TuVi Knowledge Base V2 is structured, selective, provenance-aware, and context bounded");
