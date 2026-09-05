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
    name: "Mẫu", gender: "Nam", input_time: "20:00 29/10/2024", chart_lunar_date: "27/09/Giáp Thìn",
    menh_branch: 1, than_cu: "Tài Bạch", cuc: "Thủy Nhị Cục", ban_menh: "Phúc Đăng Hỏa",
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

assert.equal(ai.VERSION, "2.1.0");
assert.equal(ai.PROFILE, "HIEP_TUVI_FULL_REPORT");
assert.deepEqual(ai.PALACE_ORDER, palaceNames);

const evidence = ai.buildEvidencePackage(chart);
assert.equal(evidence.ai_scope, "interpret_locked_facts_only");
assert.equal(evidence.palaces[0].stars[0].name, "Phá Quân");

const plan = ai.fullReportPlan();
assert.equal(plan.length, 8);
const palaceJobs = plan.filter((job) => job.kind === "palaces");
assert.equal(palaceJobs.length, 6);
assert.equal(palaceJobs.flatMap((job) => job.palaces).length, 12);
assert.deepEqual(palaceJobs.flatMap((job) => job.palaces), palaceNames);
assert.deepEqual(plan[0].palaces, ["Mệnh", "Phụ Mẫu"]);
assert.equal(plan[6].kind, "bazi");
assert.equal(plan[7].kind, "synthesis");

const firstPrompt = ai.buildFullReportSectionPrompt(chart, plan[0], { subjectKind: "child" });
assert.match(firstPrompt, /DATA QUALITY CARD/);
assert.match(firstPrompt, /Mệnh → Phụ Mẫu/);
assert.match(firstPrompt, /tam phương tứ chính/i);
assert.match(firstPrompt, /nhị hợp \+ giáp cung/i);
assert.match(firstPrompt, /Tứ Hóa/);
assert.match(firstPrompt, /Tuần\/Triệt/);
assert.match(firstPrompt, /CHỦ THỂ TRẺ EM/);
assert.match(firstPrompt, /Phá Quân/);
assert.ok(firstPrompt.length < 8500, `palace prompt must fit compact local context, got ${firstPrompt.length} chars`);

const baziPrompt = ai.buildFullReportSectionPrompt(chart, plan[6], { subjectKind: "adult" });
assert.match(baziPrompt, /TỨ TRỤ BÁT TỰ \+ NGŨ HÀNH/);
assert.match(baziPrompt, /Nhật chủ/);
assert.match(baziPrompt, /Giáp Thìn/);
assert.match(baziPrompt, /không “thiếu hành nào bổ hành đó”/);
assert.ok(baziPrompt.length < 7000, `bazi prompt should be compact, got ${baziPrompt.length}`);

const synthesisPrompt = ai.buildFullReportSectionPrompt(chart, plan[7], { localSummary: "offline" });
assert.match(synthesisPrompt, /ĐỐI CHIẾU TỬ VI ↔ BÁT TỰ ↔ NGŨ HÀNH/);
assert.match(synthesisPrompt, /RED-TEAM \/ PHẢN BIỆN/);
assert.match(synthesisPrompt, /HÀNH ĐỘNG THỰC TẾ/);
assert.match(synthesisPrompt, /3–5 GÓC NHÌN DỄ BỎ SÓT/);
assert.ok(synthesisPrompt.length < 9000, `synthesis prompt should be compact, got ${synthesisPrompt.length}`);

const compact = ai.buildCompactEvidenceText(chart);
assert.match(compact, /Phá Quân\[Miếu\/Thủy\/main\]/);
assert.match(compact, /Giáp Thìn/);
assert.ok(compact.length < 6500, `compact evidence should stay bounded, got ${compact.length}`);

const goodPalaceText = `${"DATA QUALITY CARD. ## CUNG MỆNH Nền cung. Chính tinh phụ tinh. Ngũ Hành. Bộ sao. Tràng Sinh. Tam phương tứ chính. Đối cung. Nhị hợp giáp cung. Tứ Hóa. Tuần Triệt. Mệnh Thân. Điểm hỗ trợ. Điểm phá. Kết luận Mạnh Yếu Điều kiện Trạng thái CONDITIONAL. ## CUNG PHỤ MẪU Tràng Sinh Tam phương Tứ Hóa Trạng thái CONDITIONAL. ".repeat(8)}`;
assert.deepEqual(ai.validateFullReportSection(goodPalaceText, plan[0]), []);

const bad = ai.validateFullReportSection("ngắn", plan[0]);
assert.ok(bad.some((item) => item.includes("quá ngắn")));
assert.ok(bad.some((item) => item.includes("Data Quality")));
assert.ok(bad.some((item) => item.includes("cung Mệnh")));

const repair = ai.buildSectionRepairPrompt(firstPrompt, "bản cũ", ["thiếu cung"]);
assert.match(repair, /QUALITY GATE/);
assert.match(repair, /VIẾT LẠI CHỈ PHẦN NÀY/);

console.log("PASS: Hiep TuVi AI uses eight compact stages with all 12 palaces before Bazi and synthesis");
