import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const require = createRequire(import.meta.url);
const ai = require(join(root, "hiep-tuvi-ai.js"));
const knowledgeSource = readFileSync(join(root, "hiep-tuvi-knowledge.js"), "utf8");
const context = { console };
context.globalThis = context;
vm.runInNewContext(knowledgeSource, context, { filename: "hiep-tuvi-knowledge.js" });
const knowledge = context.HiepTuViKnowledge;

const chart = {
  heaven: { than_cu: "Tài Bạch", cuc: "Thủy Nhị Cục", ban_menh: "Phúc Đăng Hỏa" },
  bazi: { pillars: ["Giáp Thìn", "Giáp Tuất", "Bính Dần", "Mậu Tuất"], day_master: { stem: "Bính", element: "Hỏa" } },
  palaces: [
    { palace_name: "Mệnh", branch_name: "Tý", branch_id: 1, element_name: "Thủy", stars: [
      { saoTen: "Phá Quân", saoDacTinh: "Miếu", nature: "main", element_name: "Thủy" },
      { saoTen: "Hóa Quyền", nature: "good", element_name: "Thủy" },
      { saoTen: "Kình Dương", nature: "bad", element_name: "Kim" },
    ] },
    { palace_name: "Phụ Mẫu", branch_name: "Sửu", branch_id: 2, element_name: "Thổ", stars: [
      { saoTen: "Thiên Phủ", nature: "main", element_name: "Thổ" },
      { saoTen: "Thiên Khôi", nature: "good", element_name: "Hỏa" },
    ] },
    { palace_name: "Quan Lộc", branch_name: "Thìn", branch_id: 5, stars: [{ saoTen: "Tham Lang", nature: "main" }] },
    { palace_name: "Tài Bạch", branch_name: "Thân", branch_id: 9, stars: [{ saoTen: "Thất Sát", nature: "main" }] },
  ],
  relations: {
    "1": {
      self: { palace: "Mệnh", branch: "Tý", major_star_details: [{ name: "Phá Quân" }], transformation_details: [{ name: "Hóa Quyền" }] },
      opposite: { palace: "Thiên Di", branch: "Ngọ", major_star_details: [{ name: "Thiên Tướng" }] },
      trine: [
        { palace: "Quan Lộc", branch: "Thìn", major_star_details: [{ name: "Tham Lang" }] },
        { palace: "Tài Bạch", branch: "Thân", major_star_details: [{ name: "Thất Sát" }] },
      ],
      adjacent: [],
    },
  },
};

assert.equal(knowledge.VERSION, "1.1.0");
const job = ai.fullReportPlan()[0];
const pack = knowledge.forJob(chart, job);
assert.match(pack, /Mệnh:/);
assert.match(pack, /Phá Quân:/);
assert.match(pack, /Sát Phá Tham/);
assert.match(pack, /Thiên Tướng:/);
assert.doesNotMatch(pack, /Văn Xương:/);
assert.ok(pack.length <= 3800, `knowledge pack must be capped, got ${pack.length}`);

const prompt = ai.buildFullReportSectionPrompt(chart, job, { subjectKind: "adult" });
const combined = `${prompt}\n${pack}`;
assert.ok(combined.length < 10000, `prompt + knowledge should preserve Qwen 4K headroom, got ${combined.length} chars`);

const baziPack = knowledge.forJob(chart, { kind: "bazi" });
assert.match(baziPack, /Nhật chủ/);
assert.match(baziPack, /không “thiếu gì bổ nấy”/i);

console.log("PASS: Hiep Tuvi knowledge is relevance-filtered and context-bounded");
