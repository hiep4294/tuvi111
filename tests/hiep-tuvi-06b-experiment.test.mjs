import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const controller = readFileSync(join(root, "hiep-tuvi-06b.js"), "utf8");
const worker = readFileSync(join(root, "hiep-tuvi-06b-worker.js"), "utf8");
const domain = readFileSync(join(root, "hiep-tuvi-06b-domain.js"), "utf8");
const html = readFileSync(join(root, "experiment-06b.html"), "utf8");
const mainHtml = readFileSync(join(root, "index.html"), "utf8");

assert.match(worker, /onnx-community\/Qwen3-0\.6B-ONNX/);
assert.match(worker, /device:\s*DEVICE/);
assert.match(worker, /const DEVICE = "webgpu"/);
assert.match(worker, /const DTYPE = "q4f16"/);
assert.match(worker, /\/no_think/);
assert.match(worker, /max_new_tokens:\s*maxNewTokens/);
assert.match(worker, /Math\.min\(560/);
assert.match(worker, /do_sample:\s*true/);
assert.match(controller, /value\.length > 9000/);
assert.match(controller, /hiep-tuvi-06b-worker\.js\?v=0\.1\.0/);
assert.match(domain, /180–320 từ/);
assert.match(domain, /Không phải vì X đơn thuần\. Quan trọng là/);
assert.match(domain, /knowledgeForPalaces/);
assert.match(domain, /tuviAppFrame/);

// Standalone experiment page remains available for isolated diagnostics.
assert.match(html, /Hiep TuVi 0\.6B — thử nghiệm chuyên ngành/);
assert.match(html, /id="tuviAppFrame"/);
assert.match(html, /id="hiep06bRunButton"/);
assert.match(html, /hiep-tuvi-06b-domain\.js\?v=0\.1\.1/);
assert.match(html, /script-src[^;]*https:\/\/cdn\.jsdelivr\.net/);
assert.match(html, /connect-src[^;]*https:\/\/huggingface\.co/);
assert.match(html, /connect-src[^;]*https:\/\/\*\.huggingface\.co/);
assert.match(html, /connect-src[^;]*https:\/\/\*\.xethub\.hf\.co/);

// v1.25 integrates the same bounded 0.6B controller directly in the main UI.
assert.match(mainHtml, /id="hiep06bPanel"/);
assert.match(mainHtml, /id="hiep06bPalaceSelect"/);
assert.match(mainHtml, /id="hiep06bRunButton"/);
assert.match(mainHtml, /hiep-tuvi-06b\.js\?v=0\.1\.0/);
assert.match(mainHtml, /hiep-tuvi-06b-domain\.js\?v=0\.1\.1/);
assert.doesNotMatch(mainHtml, /<script src="hiep-tuvi-06b-worker\.js/);
assert.match(mainHtml, /script-src[^;]*https:\/\/cdn\.jsdelivr\.net/);
assert.match(mainHtml, /connect-src[^;]*https:\/\/huggingface\.co/);

const context = {
  console,
  navigator: { userAgent: "Desktop", deviceMemory: 8, gpu: {} },
  document: {
    getElementById() { return null; },
  },
  alert() {},
};
context.globalThis = context;
vm.runInNewContext(domain, context, { filename: "hiep-tuvi-06b-domain.js" });

const chart = {
  heaven: {
    gender: "Nam",
    ban_menh: "Sơn Đầu Hỏa",
    cuc: "Kim tứ Cục",
    menh_cuc_relation: "Bản Mệnh khắc Cục",
    than_cu: "Phu Thê",
    am_duong_menh: "Âm dương nghịch lý",
  },
  palaces: [
    {
      palace_name: "Mệnh",
      branch_name: "Dậu",
      branch_id: 10,
      has_tuan: true,
      has_triet: true,
      stars: [
        { name: "Văn Khúc", dignity: "H", nature: "support" },
        { name: "Thiên Hình", dignity: "Đ", nature: "pressure" },
        { name: "Đế Vượng", nature: "trang_sinh" },
      ],
    },
  ],
  relations: {
    "10": {
      opposite: { palace: "Thiên Di", branch: "Mão", major_star_details: [{ name: "Thái Dương" }, { name: "Thiên Lương" }], transformation_details: [{ name: "Hóa Kỵ" }] },
      trine: [{ palace: "Quan Lộc", branch: "Sửu", major_star_details: [{ name: "Cự Môn" }] }, { palace: "Tài Bạch", branch: "Tỵ", major_star_details: [{ name: "Thiên Cơ" }] }],
      adjacent: [],
      six_harmony: null,
    },
  },
};
const kb = { knowledgeForPalaces() { return "[RULE] Vô Chính Diệu: ưu tiên đối cung + tam hợp; Tứ Hóa là modifier; Tuần/Triệt không xóa sao."; } };
const prompt = context.HiepTuVi06BDomain.buildPrompt(chart, "Mệnh", kb);
assert.ok(prompt.length < 9000, `prompt too long: ${prompt.length}`);
assert.match(prompt, /CUNG=Mệnh/);
assert.match(prompt, /ĐỐI=Thiên Di@Mão/);
assert.match(prompt, /Thái Dương/);
assert.match(prompt, /Hóa Kỵ/);
assert.match(prompt, /FACT\/CALC đã khóa bởi tuvi111/);
assert.match(prompt, /\/no_think/);

console.log("PASS: Hiep TuVi 0.6B remains bounded and is integrated into the main app on-demand");
