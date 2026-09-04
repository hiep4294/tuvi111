import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const require = createRequire(import.meta.url);
const ai = require(join(root, "hiep-tuvi-ai.js"));

const chart = {
  chart_id: "demo",
  heaven: { menh_branch: 1, than_cu: "Tài Bạch", cuc: "Thủy Nhị Cục" },
  bazi: { day_master: { stem: "Bính", element: "Hỏa" }, pillars: ["Giáp Thìn", "Giáp Tuất", "Bính Dần", "Mậu Tuất"] },
  palaces: [
    {
      palace_name: "Mệnh", branch_name: "Tý", element_name: "Thủy", has_tuan: false, has_triet: false,
      stars: [
        { saoTen: "Phá Quân", saoDacTinh: "Miếu", nature: "main", element_name: "Thủy" },
        { saoTen: "Hóa Quyền", nature: "good", element_name: "Thủy" },
      ],
    },
    { palace_name: "Quan Lộc", branch_name: "Thìn", stars: [{ saoTen: "Tham Lang", nature: "main" }] },
    { palace_name: "Tài Bạch", branch_name: "Thân", stars: [{ saoTen: "Thất Sát", nature: "main" }] },
    { palace_name: "Thiên Di", branch_name: "Ngọ", stars: [{ saoTen: "Liêm Trinh", nature: "main" }, { saoTen: "Thiên Tướng", nature: "main" }] },
  ],
};

assert.equal(ai.PROFILE, "SUMMARY_ONLY");
const evidence = ai.buildEvidencePackage(chart);
assert.equal(evidence.ai_scope, "summary_and_conclusion_only");
assert.equal(evidence.palaces[0].stars[0].name, "Phá Quân");

const prompt = ai.buildSummaryPrompt(chart, { subjectKind: "child", localSummary: { generatedBy: "offline" } });
assert.match(prompt, /KẾT LUẬN VÀ TỔNG KẾT TOÀN BỘ/);
assert.match(prompt, /Không lặp lại từng cung/i);
assert.match(prompt, /Mệnh–Tài–Quan/);
assert.match(prompt, /Red-team/);
assert.match(prompt, /Phá Quân/);
assert.match(prompt, /Giáp Thìn/);
assert.match(prompt, /summary_and_conclusion_only/);
assert.doesNotMatch(prompt, /TẤT CẢ SAO NGUYÊN CỤC BẮT BUỘC/);
assert.doesNotMatch(prompt, /NHIỆM VỤ BƯỚC/);

const issues = ai.validateSummary("Kết luận ngắn");
assert.ok(issues.some((item) => item.includes("quá ngắn")));
assert.ok(issues.some((item) => item.includes("Bát Tự")));

const longSummary = `${"Kết luận tổng quát Mệnh Tài Quan Bát Tự Nhật chủ phản biện Red team Kết luận cuối. ".repeat(80)}`;
assert.deepEqual(ai.validateSummary(longSummary), []);

const repair = ai.buildRepairPrompt(prompt, "bản cũ", ["thiếu phản biện"]);
assert.match(repair, /QUALITY GATE/);
assert.match(repair, /chỉ làm kết luận\/tổng kết/);
assert.match(repair, /không quay lại viết 12 cung riêng/i);

console.log("PASS: Hiep TuVi AI is summary-only and quality-gated");
