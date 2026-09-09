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
assert.match(domain, /validateOutput/);
assert.match(domain, /buildRepairPrompt/);
assert.match(domain, /đang tự sửa 1 lượt/);
assert.match(domain, /tuviAppFrame/);

assert.match(html, /Hiep TuVi 0\.6B — thử nghiệm chuyên ngành/);
assert.match(html, /id="tuviAppFrame"/);
assert.match(html, /id="hiep06bRunButton"/);
assert.match(html, /hiep-tuvi-06b-domain\.js\?v=0\.1\.1/);
assert.match(html, /script-src[^;]*https:\/\/cdn\.jsdelivr\.net/);
assert.match(html, /connect-src[^;]*https:\/\/huggingface\.co/);
assert.match(html, /connect-src[^;]*https:\/\/\*\.huggingface\.co/);
assert.match(html, /connect-src[^;]*https:\/\/\*\.xethub\.hf\.co/);

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
        { name: "Hóa Kỵ", nature: "transformation" },
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

const req = context.HiepTuVi06BDomain.evidenceRequirements(chart, "Mệnh");
assert.equal(req.requiresTuan, true);
assert.equal(req.requiresTriet, true);
assert.equal(req.requiresTrangSinh, true);
assert.equal(req.requiresTuHoa, true);
assert.equal(req.requiresGeometry, true);
assert.equal(req.isVoChinhDieu, true);

const badText = `### MỆNH – DẬU\n#### Văn Khúc · Thiên Hình\n${"Nội dung sơ lược không kiểm tra đầy đủ quan hệ và modifier. ".repeat(15)}\n> Tôi đọc: cần quan sát thực tế.`;
const badIssues = context.HiepTuVi06BDomain.validateOutput(badText, chart, "Mệnh");
assert.ok(badIssues.some((x) => x.includes("tam hợp/đối cung")));
assert.ok(badIssues.some((x) => x.includes("Tuần")));
assert.ok(badIssues.some((x) => x.includes("Triệt")));
assert.ok(badIssues.some((x) => x.includes("Tràng Sinh")));
assert.ok(badIssues.some((x) => x.includes("Tứ Hóa")));
assert.ok(badIssues.some((x) => x.includes("Vô Chính Diệu")));

const goodText = `### MỆNH – DẬU\n#### Văn Khúc · Thiên Hình · Hóa Kỵ · Đế Vượng\n${"Đây là cung Vô Chính Diệu nên phải mượn đối cung và tam hợp để đọc cấu trúc. Đối cung và tam hợp cho thấy cơ chế cần kiểm chứng chéo. Tứ Hóa ở đây chỉ là modifier, Hóa Kỵ không tự tạo verdict. Tuần và Triệt cùng hiện diện nên làm gián đoạn hoặc tái cấu trúc cách biểu hiện, không xóa sao. Đế Vượng thuộc vòng Tràng Sinh cho biết pha khí mạnh nhưng vẫn phải đặt trong toàn bộ hình học. Không phải vì một sao đơn thuần. Quan trọng là cách các node phối hợp và phản chứng lẫn nhau. ".repeat(5)}\n> Tôi đọc: cấu trúc có lực nhưng phải kiểm qua đối cung, tam hợp và điều kiện thực tế.`;
assert.deepEqual(context.HiepTuVi06BDomain.validateOutput(goodText, chart, "Mệnh"), []);

const repair = context.HiepTuVi06BDomain.buildRepairPrompt(prompt, badText, badIssues);
assert.match(repair, /QUALITY GATE/);
assert.match(repair, /không thêm FACT mới/);

console.log("PASS: Hiep TuVi 0.6B is bounded, evidence-aware, quality-gated, and self-repairs once");
