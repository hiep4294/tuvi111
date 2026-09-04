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

const fullPrompt = ai.buildSummaryPrompt(chart, { subjectKind: "child", localSummary: { generatedBy: "offline" } });
assert.match(fullPrompt, /KẾT LUẬN VÀ TỔNG KẾT TOÀN BỘ/);
assert.match(fullPrompt, /Mệnh–Tài–Quan/);
assert.match(fullPrompt, /Red-team/);
assert.match(fullPrompt, /Phá Quân/);
assert.match(fullPrompt, /Giáp Thìn/);
assert.match(fullPrompt, /summary_and_conclusion_only/);

const compact = ai.buildCompactEvidenceText(chart);
assert.match(compact, /Phá Quân\[Miếu\/Thủy\]/);
assert.match(compact, /Giáp Thìn/);
assert.ok(compact.length < 6000, `compact evidence should stay small, got ${compact.length}`);

const browserPrompt = ai.buildBrowserSummaryPrompt(chart, { subjectKind: "child", localSummary: "offline concise" });
assert.match(browserPrompt, /EVIDENCE NÉN TỪ TUVI111/);
assert.match(browserPrompt, /700–1\.200 từ/);
assert.match(browserPrompt, /Phá Quân/);
assert.match(browserPrompt, /Giáp Thìn/);
assert.doesNotMatch(browserPrompt, /NHIỆM VỤ BƯỚC/);
assert.ok(browserPrompt.length < fullPrompt.length, "browser prompt must be smaller than full cloud prompt");

const issues = ai.validateSummary("Kết luận ngắn", { minLength: 2200 });
assert.ok(issues.some((item) => item.includes("quá ngắn")));
assert.ok(issues.some((item) => item.includes("Bát Tự")));
assert.ok(issues.some((item) => item.includes("Mệnh–Di")));
assert.ok(issues.some((item) => item.includes("Tứ Hóa")));

const longSummary = `${"Kết luận tổng quát Mệnh Tài Quan Thiên Di Tứ Hóa Bát Tự Nhật chủ phản biện Red team Kết luận cuối. ".repeat(50)}`;
assert.deepEqual(ai.validateSummary(longSummary, { minLength: 2200 }), []);

const repair = ai.buildRepairPrompt(browserPrompt, "bản cũ", ["thiếu phản biện"], { priorLimit: 1200 });
assert.match(repair, /QUALITY GATE/);
assert.match(repair, /chỉ làm kết luận\/tổng kết/);
assert.match(repair, /không quay lại viết 12 cung riêng/i);

console.log("PASS: Hiep TuVi AI supports compact browser prompts and quality gates");
