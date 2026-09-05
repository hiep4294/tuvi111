import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const outputNode = { dataset: {}, innerHTML: "", textContent: "" };
const panelNodes = {
  h2: { textContent: "" },
  ".section-kicker": { textContent: "" },
  ".tag": { textContent: "" },
  ".inline-gemini-actions": { hidden: false },
};
const panelNode = { querySelector(selector) { return panelNodes[selector] || null; } };
const context = {
  console,
  document: {
    getElementById(id) {
      return id === "geminiOutput" ? outputNode : id === "geminiResultPanel" ? panelNode : null;
    },
  },
};
context.window = context;
context.globalThis = context;

for (const file of [
  "knowledge/stars.js",
  "knowledge/minor-stars.js",
  "knowledge/all-stars.js",
  "knowledge/palaces.js",
  "knowledge/combinations.js",
  "knowledge/structures.js",
  "knowledge/bazi.js",
  "knowledge/schools.js",
  "offline-summary.js",
]) {
  vm.runInNewContext(readFileSync(join(root, file), "utf8"), context, { filename: file });
}

const palaceNames = ["Mệnh", "Phụ Mẫu", "Phúc Đức", "Điền Trạch", "Quan Lộc", "Nô Bộc", "Thiên Di", "Tật Ách", "Tài Bạch", "Tử Tức", "Phu Thê", "Huynh Đệ"];
const branches = ["Dần", "Mão", "Thìn", "Tỵ", "Ngọ", "Mùi", "Thân", "Dậu", "Tuất", "Hợi", "Tý", "Hợi"];

function defaultPalace(name, index) {
  return {
    palace_name: name,
    branch_name: branches[index],
    branch_id: index + 1,
    stars: [
      { saoTen: index % 2 ? "Thiên Phủ" : "Thiên Cơ", nature: "main", saoDacTinh: "Miếu" },
      { saoTen: "Thiên Khôi", nature: "good" },
      { saoTen: "Đà La", nature: "bad" },
      { saoTen: "Tràng Sinh", nature: "trang_sinh" },
    ],
    annual_stars: [],
  };
}

const palaces = palaceNames.map(defaultPalace);
palaces[11] = {
  palace_name: "Huynh Đệ",
  branch_name: "Hợi",
  branch_id: 12,
  stars: [
    { saoTen: "Thái Dương", nature: "main", saoDacTinh: "Hãm" },
    { saoTen: "Hóa Kỵ", nature: "transformation" },
    { saoTen: "Đại Hao", nature: "bad" },
    { saoTen: "Long Đức", nature: "good" },
    { saoTen: "Hồng Loan", nature: "good" },
    { saoTen: "Lâm Quan", nature: "trang_sinh" },
  ],
  annual_stars: [],
};

const chart = {
  heaven: {
    name: "Lá số mẫu",
    gender: "Nữ",
    input_time: "10:00 01/01/1994",
    chart_lunar_date: "20/11/Quý Dậu",
    am_duong_menh: "Âm Nữ",
    ban_menh: "Sơn Đầu Hỏa",
    cuc: "Thổ Ngũ Cục",
    menh_cuc_relation: "Bản Mệnh sinh Cục",
    than_cu: "Phu Thê",
    annual_year: 2026,
  },
  annual: { year: 2026 },
  palaces,
  relations: {},
  bazi: {
    pillars: ["Quý Dậu", "Giáp Tý", "Quý Mùi", "Đinh Tỵ"],
    day_master: {
      stem: "Quý", element: "Thủy", yin_yang: "Âm",
      preliminary_strength: "Khá nhược", support_ratio_percent: 33.6,
      balancing_elements_preliminary: ["Kim", "Thủy"],
    },
    element_balance: { dominant: "Thủy", weakest: "Kim" },
  },
};

const reading = context.OfflineReading.buildOfflineReading(chart);
const text = context.OfflineReading.readingToText(reading);

assert.equal(context.OfflineReading.VERSION, "2.2.0");
assert.equal(reading.mode, "deterministic_full_report");
assert.equal(reading.sections.length, 16, "DQ + 12 palaces + Bazi + annual + synthesis");
assert.match(text, /I\. CUNG MỆNH – DẦN/);
assert.match(text, /XII\. CUNG HUYNH ĐỆ – HỢI/);
assert.match(text, /Thái Dương \(Hãm\) – Hóa Kỵ – Đại Hao – Long Đức – Hồng Loan – Lâm Quan/);
assert.match(text, /Thái Dương liên quan:/);
assert.match(text, /biểu hiện ra ngoài/i);
assert.match(text, /Hóa Kỵ/i);
assert.match(text, /có tình cảm và nhu cầu gắn kết, nhưng tính cạnh tranh\/so sánh/i);
assert.match(text, /TỨ TRỤ BÁT TỰ – NGŨ HÀNH/);
assert.match(text, /ĐỐI CHIẾU – PHẢN BIỆN – KẾT LUẬN/);
assert.match(text, /3 hành động thực tế/i);
assert.doesNotMatch(text, /Gemini|https?:\/\//i);

context.renderOfflineSummary(chart);
assert.equal(panelNodes.h2.textContent, "Hiep TuVi — báo cáo cục bộ đầy đủ");
assert.equal(panelNodes[".tag"].textContent, "LOCAL RULES v2.2");
assert.equal(panelNodes[".inline-gemini-actions"].hidden, false);
assert.match(outputNode.innerHTML, /Knowledge Base V2/);
assert.match(outputNode.dataset.raw, /XII\. CUNG HUYNH ĐỆ – HỢI/);

console.log("PASS: detailed deterministic fallback guarantees a Hiep TuVi-style full report without WebGPU");
