import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const require = createRequire(import.meta.url);
const ai = require(join(root, "hiep-tuvi-ai.js"));

const palaceNames = ["Mệnh", "Phụ Mẫu", "Phúc Đức", "Điền Trạch", "Quan Lộc", "Nô Bộc", "Thiên Di", "Tật Ách", "Tài Bạch", "Tử Tức", "Phu Thê", "Huynh Đệ"];
const palaces = palaceNames.map((name, index) => ({
  palace_name: name,
  branch_name: `Chi${index + 1}`,
  branch_id: index + 1,
  element_name: index % 2 ? "Mộc" : "Thủy",
  has_tuan: name === "Phúc Đức",
  has_triet: name === "Tài Bạch",
  is_body: name === "Tài Bạch",
  stars: [
    { saoTen: name === "Mệnh" ? "Phá Quân" : `Chính ${name}`, saoDacTinh: name === "Mệnh" ? "Miếu" : "", nature: "main", element_name: "Thủy" },
    { saoTen: name === "Mệnh" ? "Hóa Quyền" : `Phụ ${name}`, nature: "good", element_name: "Mộc" },
    { saoTen: "Tràng Sinh", nature: "trang_sinh", element_name: "Thủy" },
  ],
}));

const chart = {
  chart_id: "demo",
  heaven: {
    name: "Mẫu",
    gender: "Nam",
    input_time: "20:00 29/10/2024",
    chart_lunar_date: "27/09/Giáp Thìn",
    menh_branch: 1,
    than_cu: "Tài Bạch",
    cuc: "Thủy Nhị Cục",
    ban_menh: "Phúc Đăng Hỏa",
  },
  bazi: {
    day_master: { stem: "Bính", element: "Hỏa", preliminary_strength: "Khá" },
    pillars: ["Giáp Thìn", "Giáp Tuất", "Bính Dần", "Mậu Tuất"],
    element_balance: { dominant: "Thổ", weakest: "Kim" },
    luck_cycles: { cycles: [{ text: "Ất Hợi" }] },
  },
  palaces,
  combined_analysis: { cross_system_signals: [{ relation: "support", tu_vi: "Mệnh mạnh", bat_tu: "Nhật chủ có căn" }] },
};

assert.equal(ai.PROFILE, "HIEP_TUVI_FULL_REPORT");
assert.deepEqual(ai.PALACE_ORDER, palaceNames);

const evidence = ai.buildEvidencePackage(chart);
assert.equal(evidence.ai_scope, "interpret_locked_facts_only");
assert.equal(evidence.palaces[0].stars[0].name, "Phá Quân");

const plan = ai.fullReportPlan();
assert.equal(plan.length, 6);
assert.equal(plan.filter((job) => job.kind === "palaces").flatMap((job) => job.palaces).length, 12);
assert.deepEqual(plan[0].palaces, ["Mệnh", "Phụ Mẫu", "Phúc Đức"]);
assert.equal(plan.at(-1).kind, "synthesis");

const firstPrompt = ai.buildFullReportSectionPrompt(chart, plan[0], { subjectKind: "child" });
assert.match(firstPrompt, /DATA QUALITY CARD/);
assert.match(firstPrompt, /Mệnh → Phụ Mẫu → Phúc Đức/);
assert.match(firstPrompt, /Tam phương tứ chính/);
assert.match(firstPrompt, /Nhị hợp \+ giáp cung/);
assert.match(firstPrompt, /Tứ Hóa/);
assert.match(firstPrompt, /Tuần\/Triệt/);
assert.match(firstPrompt, /CHỦ THỂ LÀ TRẺ EM/);
assert.match(firstPrompt, /Phá Quân/);

const baziPrompt = ai.buildFullReportSectionPrompt(chart, plan[4], { subjectKind: "adult" });
assert.match(baziPrompt, /TỨ TRỤ BÁT TỰ \+ NGŨ HÀNH/);
assert.match(baziPrompt, /Nhật chủ/);
assert.match(baziPrompt, /Giáp Thìn/);
assert.match(baziPrompt, /không “thiếu hành nào bổ hành đó”/);

const synthesisPrompt = ai.buildFullReportSectionPrompt(chart, plan[5], { localSummary: "offline" });
assert.match(synthesisPrompt, /ĐỐI CHIẾU TỬ VI ↔ BÁT TỰ ↔ NGŨ HÀNH/);
assert.match(synthesisPrompt, /RED-TEAM \/ PHẢN BIỆN/);
assert.match(synthesisPrompt, /HÀNH ĐỘNG THỰC TẾ/);
assert.match(synthesisPrompt, /3–5 GÓC NHÌN DỄ BỎ SÓT/);

const compact = ai.buildCompactEvidenceText(chart);
assert.match(compact, /Phá Quân\[Miếu\/Thủy\/main\]/);
assert.match(compact, /Giáp Thìn/);
assert.ok(compact.length < 10000, `compact evidence should stay bounded, got ${compact.length}`);

const goodPalaceText = `${"## CUNG MỆNH Nền cung Chính tinh phụ tinh Ngũ Hành Bộ sao Tràng Sinh Tam phương Tứ Hóa Tuần Triệt Mệnh Thân Điểm hỗ trợ Điểm phá Kết luận Mạnh Yếu Điều kiện Trạng thái CONDITIONAL. ".repeat(20)}\n## CUNG PHỤ MẪU\nTrạng thái CONDITIONAL.\n## CUNG PHÚC ĐỨC\nTrạng thái CONDITIONAL.\nDATA QUALITY CARD`;
assert.deepEqual(ai.validateFullReportSection(goodPalaceText, plan[0]), []);

const bad = ai.validateFullReportSection("ngắn", plan[0]);
assert.ok(bad.some((item) => item.includes("quá ngắn")));
assert.ok(bad.some((item) => item.includes("Data Quality")));
assert.ok(bad.some((item) => item.includes("cung Mệnh")));

const repair = ai.buildSectionRepairPrompt(firstPrompt, "bản cũ", ["thiếu cung"]);
assert.match(repair, /QUALITY GATE/);
assert.match(repair, /VIẾT LẠI CHỈ PHẦN NÀY/);

console.log("PASS: Hiep TuVi AI builds six-part automatic full reports with 12 palaces before synthesis");
