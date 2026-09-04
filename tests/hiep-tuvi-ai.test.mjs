import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const require = createRequire(import.meta.url);
const ai = require(join(root, "hiep-tuvi-ai.js"));

const chart = {
  heaven: { menh_branch: 1, than_cu: "Tài Bạch", cuc: "Thủy Nhị Cục" },
  bazi: { day_master: { stem: "Bính", element: "Hỏa" }, pillars: ["Giáp Thìn", "Giáp Tuất", "Bính Dần", "Mậu Tuất"] },
  palaces: [
    {
      palace_name: "Mệnh", branch_name: "Tý", element_name: "Thủy", has_tuan: false, has_triet: false,
      stars: [
        { saoTen: "Phá Quân", saoDacTinh: "Miếu", nature: "main", element_name: "Thủy" },
        { saoTen: "Hóa Quyền", nature: "good", element_name: "Thủy" },
        { saoTen: "Hỏa Tinh", nature: "bad", element_name: "Hỏa" },
        { saoTen: "Đế Vượng", nature: "trang_sinh", element_name: "Kim" },
      ],
    },
    { palace_name: "Quan Lộc", branch_name: "Thìn", stars: [{ saoTen: "Tham Lang", nature: "main" }] },
    { palace_name: "Tài Bạch", branch_name: "Thân", stars: [{ saoTen: "Thất Sát", nature: "main" }] },
    { palace_name: "Thiên Di", branch_name: "Ngọ", stars: [{ saoTen: "Liêm Trinh", nature: "main" }, { saoTen: "Thiên Tướng", nature: "main" }] },
  ],
};

const prompt = ai.enrichPrompt("BASE ENGINE FACTS", { kind: "auto_report_part", index: 1 }, chart);
assert.match(prompt, /HIEP TUVI AI/);
assert.match(prompt, /Phá Quân/);
assert.match(prompt, /Hóa Quyền/);
assert.match(prompt, /Hỏa Tinh/);
assert.match(prompt, /Đế Vượng/);
assert.match(prompt, /Tam hợp Quan Lộc/);
assert.match(prompt, /Đối cung Thiên Di/);
assert.match(prompt, /BASE ENGINE FACTS/);

const shortIssues = ai.validatePart("Phá Quân. Kết luận.", 1, chart);
assert.ok(shortIssues.some((item) => item.includes("quá ngắn")));
assert.ok(shortIssues.some((item) => item.includes("Thiếu sao")));
assert.ok(shortIssues.some((item) => item.includes("tam phương")));

const longPalace = `${"Phá Quân Hóa Quyền Hỏa Tinh Đế Vượng tam phương tứ chính Tứ Hóa Kết luận. ".repeat(40)}`;
assert.deepEqual(ai.validatePart(longPalace, 1, chart), []);

const baziPrompt = ai.enrichPrompt("BAZI FACTS", { kind: "auto_report_part", index: 13 }, chart);
assert.match(baziPrompt, /TỨ TRỤ BÁT TỰ CHUYÊN SÂU/);
assert.match(baziPrompt, /tháng lệnh/i);
assert.match(baziPrompt, /tàng can/i);

const conclusionPrompt = ai.enrichPrompt("FINAL FACTS", { kind: "auto_report_part", index: 14 }, chart);
assert.match(conclusionPrompt, /Mệnh–Tài–Quan/);
assert.match(conclusionPrompt, /Red-team/);
assert.match(conclusionPrompt, /3–5 góc nhìn/);

console.log("PASS: Hiep TuVi AI prompt enrichment and quality gates");
