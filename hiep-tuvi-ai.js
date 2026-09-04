"use strict";

(function initHiepTuViAI(root) {
  const VERSION = "1.0.0";
  const PALACE_ORDER = Object.freeze([
    "Mệnh", "Phụ Mẫu", "Phúc Đức", "Điền Trạch", "Quan Lộc", "Nô Bộc",
    "Thiên Di", "Tật Ách", "Tài Bạch", "Tử Tức", "Phu Thê", "Huynh Đệ",
  ]);

  const RELATIONS = Object.freeze({
    "menh": { tamHop: ["Quan Lộc", "Tài Bạch"], doi: "Thiên Di" },
    "phu mau": { tamHop: ["Nô Bộc", "Tử Tức"], doi: "Tật Ách" },
    "phuc duc": { tamHop: ["Thiên Di", "Phu Thê"], doi: "Tài Bạch" },
    "dien trach": { tamHop: ["Tật Ách", "Huynh Đệ"], doi: "Tử Tức" },
    "quan loc": { tamHop: ["Mệnh", "Tài Bạch"], doi: "Phu Thê" },
    "no boc": { tamHop: ["Phụ Mẫu", "Tử Tức"], doi: "Huynh Đệ" },
    "thien di": { tamHop: ["Phúc Đức", "Phu Thê"], doi: "Mệnh" },
    "tat ach": { tamHop: ["Điền Trạch", "Huynh Đệ"], doi: "Phụ Mẫu" },
    "tai bach": { tamHop: ["Mệnh", "Quan Lộc"], doi: "Phúc Đức" },
    "tu tuc": { tamHop: ["Phụ Mẫu", "Nô Bộc"], doi: "Điền Trạch" },
    "phu the": { tamHop: ["Phúc Đức", "Thiên Di"], doi: "Quan Lộc" },
    "huynh de": { tamHop: ["Điền Trạch", "Tật Ách"], doi: "Nô Bộc" },
  });

  function normalize(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .toLocaleLowerCase("vi")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function getChartFromRuntime() {
    try {
      if (typeof state !== "undefined" && state && state.chart) return state.chart;
    } catch (_) {}
    return root?.__HIEP_TUVI_CHART__ || null;
  }

  function findPalace(chart, palaceName) {
    const target = normalize(palaceName);
    return (chart?.palaces || []).find((palace) => normalize(palace?.palace_name) === target) || null;
  }

  function unique(values) {
    return [...new Set(values.filter(Boolean))];
  }

  function starNames(palace) {
    return unique((palace?.stars || [])
      .map((star) => String(star?.saoTen || star?.name || "").trim())
      .filter(Boolean));
  }

  function starLine(star) {
    const name = String(star?.saoTen || star?.name || "").trim() || "—";
    const dignity = String(star?.saoDacTinh || star?.dignity || "").trim();
    const nature = String(star?.nature || "").trim();
    const element = String(star?.element_name || star?.element || "").trim();
    const bits = [dignity ? `thế=${dignity}` : "", nature ? `nhóm=${nature}` : "", element ? `hành=${element}` : ""].filter(Boolean);
    return bits.length ? `${name} (${bits.join(", ")})` : name;
  }

  function relationSummary(chart, palaceName) {
    const relation = RELATIONS[normalize(palaceName)] || { tamHop: [], doi: "" };
    const lines = [];
    for (const name of relation.tamHop || []) {
      const palace = findPalace(chart, name);
      if (palace) lines.push(`Tam hợp ${name} tại ${palace.branch_name || "—"}: ${starNames(palace).join(", ") || "không có sao ghi nhận"}`);
    }
    if (relation.doi) {
      const opposite = findPalace(chart, relation.doi);
      if (opposite) lines.push(`Đối cung ${relation.doi} tại ${opposite.branch_name || "—"}: ${starNames(opposite).join(", ") || "không có sao ghi nhận"}`);
    }
    return lines.join("\n");
  }

  const SYSTEM_RULES = `
### VAI TRÒ BẮT BUỘC — HIEP TUVI AI
Bạn là AI chuyên gia nghiên cứu Tử Vi Đẩu Số + Tứ Trụ Bát Tự theo cơ chế hội đồng 7 vai: Tử Vi, Bát Tự, Ngũ Hành, Kinh Dịch (chỉ khi có quẻ), Nhân tướng (chỉ khi có ảnh phù hợp), Lịch pháp và Red-team.

Dữ liệu do engine tuvi111 cung cấp là FACT/CALC đã khóa. KHÔNG tự an lại sao, KHÔNG đổi vị trí cung, KHÔNG tự sửa Can Chi, Cục, Tứ Hóa hay Tràng Sinh nếu dữ liệu đầu vào đã có. Nếu nghi ngờ dữ liệu, đánh dấu mâu thuẫn thay vì âm thầm sửa.

Nguyên tắc luận:
- Không dùng “một sao = một kết luận”. Luôn đọc SAO × VỊ TRÍ × CUNG × NGŨ HÀNH × BỘ SAO × TAM PHƯƠNG × TỨ HÓA × TUẦN/TRIỆT × TRÀNG SINH × MỆNH/THÂN.
- Tách nguyên cục khỏi đại vận/lưu niên. Không lấy lưu tinh để sửa ngược nguyên cục.
- Với cách cục/bộ sao phải nói rõ complete / partial / broken khi điều kiện có thể tranh cãi.
- Tứ Hóa phải đọc theo mạng nguồn → sao mang Hóa → cung đích → quan hệ cung → tác dụng thực tế.
- Tuần/Triệt là bộ điều biến, không phải nút xóa sao.
- Bát Tự không được đếm hành cơ học. Phải xét tháng lệnh, khí mùa, căn, sinh-trợ-tiết-khắc, tàng can, Thập Thần, hợp/xung/hình/hại/phá và khác biệt giữa điều hậu với phù-ức nếu có.
- Không biến hệ diễn giải truyền thống thành khoa học thực nghiệm; không phán chắc tử vong, bệnh nặng, phá sản, ngoại tình hay tai họa.
- Viết tiếng Việt, rõ, cụ thể, có ví dụ thực tế; tránh văn vẻ và tránh câu Barnum.
`;

  function palaceInstruction(chart, partIndex) {
    const palaceName = PALACE_ORDER[partIndex - 1];
    const palace = findPalace(chart, palaceName);
    const stars = palace?.stars || [];
    const checklist = stars.length ? stars.map(starLine).join("\n- ") : "Vô chính diệu / chưa có danh sách sao";
    const blockers = [palace?.has_tuan ? "Tuần" : "", palace?.has_triet ? "Triệt" : ""].filter(Boolean).join(" + ") || "không ghi nhận Tuần/Triệt tại bản cung";
    const ts = stars.find((star) => star?.nature === "trang_sinh");
    const relations = relationSummary(chart, palaceName);

    return `
### NHIỆM VỤ BƯỚC ${partIndex + 1}: CUNG ${palaceName.toUpperCase()}
Đây là phần luận CHUYÊN SÂU MỘT CUNG. Không viết ngắn. Mục tiêu khoảng 1.800–3.500 từ nếu dữ liệu đủ; ưu tiên đầy đủ hơn ngắn gọn.

DỮ LIỆU KHÓA CỦA BẢN CUNG:
- Cung: ${palaceName}
- Địa chi: ${palace?.branch_name || "—"}
- Ngũ hành cung: ${palace?.element_name || palace?.element || palace?.hanh_cung || "theo dữ liệu engine"}
- Tuần/Triệt: ${blockers}
- Tràng Sinh tại cung: ${ts ? starLine(ts) : "đọc theo dữ liệu engine nếu có"}
- TẤT CẢ SAO NGUYÊN CỤC BẮT BUỘC PHẢI ĐƯỢC NHẮC VÀ GIẢI THÍCH ÍT NHẤT MỘT LẦN:
- ${checklist}

QUAN HỆ CUNG KHÓA:
${relations || "Đọc tam phương tứ chính/đối cung từ dữ liệu engine."}

CẤU TRÚC ĐẦU RA BẮT BUỘC:
1. **Nền cung** — vị trí, hành, chức năng cung, chính tinh và thế đứng.
2. **Tác dụng của toàn bộ sao** — đi lần lượt qua TẤT CẢ sao trong checklist. Sao nhỏ có thể gom nhóm nhưng tuyệt đối không được bỏ tên.
3. **Tương tác sao và bộ/cách cục** — nói sao nào là lõi, sao nào trợ/phá/đổi hướng; chỉ gọi cách khi đủ điều kiện.
4. **Ngũ Hành cung ↔ sao ↔ Mệnh/Cục** — không dùng shortcut “sinh là tốt, khắc là xấu”.
5. **Vòng Tràng Sinh** — giải thích như pha khí, không biến Tử/Tuyệt thành tai họa.
6. **Tam phương tứ chính + đối cung** — đây là phần bắt buộc và phải đủ dài để có khả năng đảo kết luận bản cung.
7. **Nhị hợp và giáp cung** — dùng như lớp bổ sung, không lấn át tam phương.
8. **Tứ Hóa** — xác định Hóa nào đi vào/đi ra hoặc hội chiếu cung, tác động lên sao nào.
9. **Tuần/Triệt** — nếu không có vẫn ghi rõ “không có tại bản cung”; nếu có phải nói nó điều biến chính xác phần nào.
10. **Mệnh–Thân và cung liên đới** — cung này ảnh hưởng toàn cục ra sao.
11. **Tổng hợp cung** — tối thiểu 4 đoạn phân tích liên tục, không lặp danh sách sao; nêu cơ chế tổng hợp, tình huống thuận, tình huống bất lợi và ví dụ thực tế.
12. **Kết luận cung** — Mạnh / Yếu / Điều kiện phát huy / Điều kiện gây lệch / trạng thái STRONG, CONDITIONAL, CONTESTED hoặc INSUFFICIENT.

Nếu đây là lá số trẻ em, chuyển phần ứng dụng sang khí chất, học tập, tự điều tiết, môi trường, cách cha mẹ hỗ trợ; không dự đoán cứng nghề nghiệp, hôn nhân hay bệnh tật khi còn quá sớm.
`;
  }

  function baziInstruction(chart) {
    const bazi = chart?.bazi || {};
    return `
### NHIỆM VỤ: TỨ TRỤ BÁT TỰ CHUYÊN SÂU
Viết phần Bát Tự dài và tương xứng với 12 cung Tử Vi, không rút gọn thành vài dòng Ngũ Hành.

Dữ liệu Bát Tự từ engine (chỉ dùng để luận, không tự tính lại):
${JSON.stringify(bazi, null, 2)}

Bắt buộc lần lượt phân tích:
1. Bốn trụ năm–tháng–ngày–giờ và Nhật chủ.
2. Tàng can từng chi; quy đổi Thập Thần đối với Nhật chủ.
3. Tháng lệnh, tiết khí, khí mùa.
4. Căn của Nhật chủ, nguồn sinh trợ, phần tiết khí, phần khắc/chế; kết luận vượng-suy có điều kiện.
5. Thiên can: hợp/xung/sinh/khắc và chuỗi sinh hóa đáng chú ý.
6. Địa chi: tam hợp, bán hợp, lục hợp, xung, hình, hại, phá; tuyệt đối không gọi thành cục nếu thiếu điều kiện.
7. Thập Thần nổi bật và cơ chế biểu hiện thực tế.
8. Cách cục nếu đủ điều kiện; ghi complete/partial/contested khi cần.
9. Điều hậu và phù-ức phải tách hai phương pháp nếu chúng có thể cho ưu tiên khác nhau.
10. Dụng/Hỷ/Kỵ chỉ chốt có điều kiện; không dùng “thiếu hành nào bổ hành đó”.
11. Đại vận chỉ phân tích nếu engine có dữ liệu; tách khỏi nguyên cục.
12. Kết luận Bát Tự dài: năng lực lõi, điểm mất cân bằng, cơ chế phát triển, ví dụ thực tế.
13. Đối chiếu với Tử Vi nhưng không ép hai hệ phải đồng thuận; chỉ ra điểm giống, điểm khác và dependency chung nếu cùng dựa vào Ngũ Hành.
`;
  }

  function overviewInstruction(chart) {
    const h = chart?.heaven || {};
    return `
### NHIỆM VỤ: TỔNG QUAN LÁ SỐ
Mở đầu bằng Data Quality Card ngắn. Sau đó khóa các dữ kiện gốc: âm/dương nam nữ, Mệnh, Thân cư, Cục, bản mệnh, Tứ Hóa năm sinh, Tuần/Triệt và các trục chính. Chưa được kết luận cuối trước khi đi đủ 12 cung.

Dữ liệu thiên bàn để tham chiếu:
${JSON.stringify(h, null, 2)}

Chỉ nêu 3–6 cấu trúc lớn nhất làm “bản đồ đọc” cho các phần sau. Nếu có điểm engine/trường phái có thể khác nhau, đánh dấu SCHOOL/CONTESTED thay vì tự chọn ngầm.
`;
  }

  function conclusionInstruction() {
    return `
### NHIỆM VỤ: KẾT LUẬN TỔNG HỢP TOÀN BỘ
Đây là kết luận sau khi đã đi đủ 12 cung và Bát Tự. Không lặp lại 13 phần trước theo kiểu tóm tắt cơ học.

Bắt buộc tổng hợp theo các trục:
1. Mệnh–Tài–Quan và Mệnh–Di.
2. Phúc–Di–Phu Thê.
3. Điền–Tật–Huynh.
4. Cung có Thân và quan hệ Mệnh–Thân.
5. Mạng Tứ Hóa lặp lại trên toàn lá số.
6. Cát/sát tinh có sức cấu trúc và các điểm Tuần/Triệt thật sự làm đổi kết luận.
7. Đối chiếu Tử Vi ↔ Bát Tự ↔ Ngũ Hành: điểm đồng thuận độc lập, điểm chỉ là dependency, và điểm bất đồng.
8. Red-team: ít nhất 3 phản biện mạnh nhất đối với bản luận; nếu phản biện đúng phải sửa/hạ kết luận.
9. Kết luận tổng quát theo các miền: khí chất, học tập/năng lực, công việc tương lai theo kiểu môi trường phù hợp, tài nguyên/tài chính theo nghĩa năng lực tạo giá trị, quan hệ, gia đình/môi trường, sức khỏe chỉ ở mức thói quen và không chẩn đoán.
10. Nếu là trẻ em: ưu tiên hướng nuôi dạy, hoạt động nên thử, điều cha mẹ nên tránh, dấu hiệu thực tế cần quan sát để nghiệm lại bản luận.
11. 3–5 góc nhìn dễ bị bỏ sót có khả năng đảo kết luận.
12. Kết luận cuối cùng 1 đoạn rõ: “lõi mạnh nhất là gì, điểm rủi ro lớn nhất là gì, chìa khóa phát triển là gì”.

Phải phân biệt rõ: diễn giải truyền thống ≠ dự báo chắc chắn. Hành động thực tế phải dựa trên quan sát và dữ liệu đời thực.
`;
  }

  function genericInstruction(kind) {
    return `
### NHIỆM VỤ BỔ SUNG
Giữ chuẩn Hiep TuVi AI: phân tích theo cấu trúc, không phán một sao, luôn nêu điều kiện/ngoại lệ, không trộn nguyên cục với lưu niên. Loại prompt hiện tại: ${kind || "không xác định"}.
`;
  }

  function enrichPrompt(basePrompt, payload = {}, chart = null) {
    const effectiveChart = chart || getChartFromRuntime();
    const kind = String(payload?.kind || "");
    const index = Number(payload?.index || 0);
    let task = genericInstruction(kind);
    if (kind === "auto_report_part") {
      if (index === 0) task = overviewInstruction(effectiveChart);
      else if (index >= 1 && index <= 12) task = palaceInstruction(effectiveChart, index);
      else if (index === 13) task = baziInstruction(effectiveChart);
      else if (index === 14) task = conclusionInstruction(effectiveChart);
    } else if (kind === "full") {
      task = `${overviewInstruction(effectiveChart)}\n${conclusionInstruction(effectiveChart)}`;
    }
    return `${SYSTEM_RULES}\n${task}\n\n### PROMPT/DỮ LIỆU GỐC TỪ ENGINE TUVI111 — GIỮ NGUYÊN SỰ KIỆN\n${String(basePrompt || "").trim()}`.trim();
  }

  function validatePart(text, partIndex, chart = null) {
    const value = String(text || "").trim();
    const normalized = normalize(value);
    const issues = [];
    const effectiveChart = chart || getChartFromRuntime();

    if (partIndex >= 1 && partIndex <= 12) {
      if (value.length < 2200) issues.push(`Bài cung quá ngắn (${value.length} ký tự, cần >= 2200).`);
      const palace = findPalace(effectiveChart, PALACE_ORDER[partIndex - 1]);
      const names = starNames(palace);
      const missing = names.filter((name) => !normalized.includes(normalize(name)));
      if (missing.length) issues.push(`Thiếu sao nguyên cục: ${missing.join(", ")}.`);
      if (!normalized.includes("tam phuong")) issues.push("Thiếu tam phương tứ chính.");
      if (!normalized.includes("tu hoa") && !normalized.includes("hoa loc") && !normalized.includes("hoa quyen") && !normalized.includes("hoa khoa") && !normalized.includes("hoa ky")) issues.push("Thiếu Tứ Hóa.");
      if (!normalized.includes("ket luan")) issues.push("Thiếu kết luận cung.");
    } else if (partIndex === 13) {
      if (value.length < 2800) issues.push(`Bát Tự quá ngắn (${value.length} ký tự, cần >= 2800).`);
      for (const keyword of ["nhat chu", "thang lenh", "thap than", "tang can", "dung", "hy", "ky"]) {
        if (!normalized.includes(keyword)) issues.push(`Bát Tự thiếu mục: ${keyword}.`);
      }
    } else if (partIndex === 14) {
      if (value.length < 2800) issues.push(`Kết luận chung quá ngắn (${value.length} ký tự, cần >= 2800).`);
      for (const keyword of ["menh", "tai", "quan", "bat tu", "phan bien", "ket luan"]) {
        if (!normalized.includes(keyword)) issues.push(`Kết luận chung thiếu trục/mục: ${keyword}.`);
      }
    }
    return issues;
  }

  function installBrowserAdapters() {
    if (root.__HIEP_TUVI_AI_INSTALLED__) return;
    root.__HIEP_TUVI_AI_INSTALLED__ = true;

    const originalCallWorker = root.callWorker;
    if (typeof originalCallWorker === "function") {
      root.callWorker = async function hiepTuViCallWorker(action, payload = {}) {
        const result = await originalCallWorker.call(this, action, payload);
        if (action === "prompt" && result && typeof result.prompt === "string") {
          result.prompt = enrichPrompt(result.prompt, payload, getChartFromRuntime());
          result.hiep_tuvi_ai = { version: VERSION, profile: "LONG_INTEGRATED" };
        }
        return result;
      };
    }

    if (typeof root.outputTokenLimitForStep === "function") {
      root.outputTokenLimitForStep = function hiepTuViTokenLimit(partIndex) {
        if (partIndex >= 1 && partIndex <= 12) return 2800;
        if (partIndex === 13 || partIndex === 14) return 3800;
        return 2600;
      };
    }

    const originalRequestGeminiPart = root.requestGeminiPart;
    if (typeof originalRequestGeminiPart === "function") {
      root.requestGeminiPart = async function hiepTuViQualityRequest(endpoint, prompt, model, partIndex) {
        let data = await originalRequestGeminiPart.call(this, endpoint, prompt, model, partIndex);
        const before = validatePart(data?.text, partIndex, getChartFromRuntime());
        if (!before.length) {
          data.hiep_tuvi_quality = { version: VERSION, repaired: false, issues: [] };
          return data;
        }

        const repairPrompt = `${prompt}\n\n### QUALITY GATE HIEP TUVI AI — BẮT BUỘC VIẾT LẠI TOÀN BỘ\nBản vừa tạo chưa đạt vì:\n- ${before.join("\n- ")}\nHãy viết lại toàn bộ phần này từ đầu. Không giải thích việc sửa. Không bỏ bất kỳ sao nào trong checklist. Giữ nguyên dữ liệu engine.`;
        data = await originalRequestGeminiPart.call(this, endpoint, repairPrompt, model, partIndex);
        const after = validatePart(data?.text, partIndex, getChartFromRuntime());
        data.hiep_tuvi_quality = { version: VERSION, repaired: true, issues_before: before, issues_after: after };
        return data;
      };
    }
  }

  const api = Object.freeze({
    VERSION,
    PALACE_ORDER,
    enrichPrompt,
    validatePart,
    findPalace,
    starNames,
    normalize,
    installBrowserAdapters,
  });

  root.HiepTuViAI = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined") installBrowserAdapters();
})(typeof globalThis !== "undefined" ? globalThis : this);
