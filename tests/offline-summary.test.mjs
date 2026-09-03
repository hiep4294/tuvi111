import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const source = readFileSync(join(root, "offline-summary.js"), "utf8");
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
vm.runInNewContext(source, context, { filename: "offline-summary.js" });

const palace = (name, branch, main, good = 2, bad = 1) => ({
  palace_name: name,
  branch_name: branch,
  stars: [
    ...main.map((saoTen) => ({ saoTen, nature: "main" })),
    ...Array.from({ length: good }, (_, i) => ({ saoTen: `Tốt ${i + 1}`, nature: "good" })),
    ...Array.from({ length: bad }, (_, i) => ({ saoTen: `Xấu ${i + 1}`, nature: "bad" })),
  ],
  annual_stars: [{ saoTen: "Lưu tốt", nature: "good" }],
});

const chart = {
  heaven: {
    name: "Lá số mẫu",
    am_duong_menh: "Dương Nam",
    ban_menh: "Kiếm Phong Kim",
    cuc: "Thủy Nhị Cục",
    menh_cuc_relation: "Mệnh sinh Cục",
    than_cu: "Quan Lộc",
    annual_year: 2026,
  },
  annual: { year: 2026 },
  palaces: [
    palace("Mệnh", "Dần", ["Tử Vi", "Thiên Phủ"]),
    palace("Quan Lộc", "Ngọ", ["Vũ Khúc"]),
    palace("Tài Bạch", "Tuất", ["Thái Âm"]),
    palace("Phu Thê", "Thân", ["Thiên Đồng"]),
    palace("Phúc Đức", "Thìn", ["Thiên Lương"]),
    palace("Tật Ách", "Tý", ["Cự Môn"]),
    palace("Thiên Di", "Mùi", ["Thất Sát"]),
  ],
  bazi: {
    day_master: {
      stem: "Canh", element: "Kim", yin_yang: "Dương",
      preliminary_strength: "trung bình", support_ratio_percent: 52,
      balancing_elements_preliminary: ["Thủy", "Mộc"],
    },
    element_balance: { dominant: "Kim", weakest: "Mộc" },
  },
};

const reading = context.OfflineReading.buildOfflineReading(chart);
const text = context.OfflineReading.readingToText(reading);
assert.ok(reading.sections.length >= 9, "reading must cover core life areas, Bazi and annual data");
assert.match(text, /KẾT LUẬN CHÍNH/);
assert.match(text, /CÔNG VIỆC/);
assert.match(text, /TÀI CHÍNH/);
assert.match(text, /TÌNH CẢM/);
assert.match(text, /BÁT TỰ VÀ NGŨ HÀNH/);
assert.match(text, /LƯU NIÊN 2026/);
assert.match(text, /3\. Với sức khỏe và quan hệ/);
assert.doesNotMatch(text, /Gemini|API|https?:\/\//i);

context.renderOfflineSummary(chart);
assert.equal(panelNodes.h2.textContent, "Tổng luận cục bộ");
assert.equal(panelNodes[".inline-gemini-actions"].hidden, true);
assert.match(outputNode.innerHTML, /3 hành động đề xuất/);
assert.match(outputNode.dataset.raw, /LƯU NIÊN 2026/);

console.log("PASS: concise offline reading covers all required areas");

