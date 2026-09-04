"use strict";

(function initHiepTuViAI(root) {
  const VERSION = "1.2.0";
  const PROFILE = "SUMMARY_ONLY";

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

  function clip(value, maxChars) {
    let text;
    if (typeof value === "string") text = value;
    else {
      try { text = JSON.stringify(value); }
      catch (_) { text = String(value ?? ""); }
    }
    if (text.length <= maxChars) return text;
    return `${text.slice(0, Math.max(0, maxChars - 20))}...[đã rút gọn]`;
  }

  function compactStar(star) {
    return {
      name: String(star?.saoTen || star?.name || "").trim(),
      dignity: String(star?.saoDacTinh || star?.dignity || "").trim() || null,
      nature: String(star?.nature || "").trim() || null,
      element: String(star?.element_name || star?.element || "").trim() || null,
    };
  }

  function compactStarToken(star) {
    const data = compactStar(star);
    if (!data.name) return "";
    const tags = [data.dignity, data.element].filter(Boolean);
    return tags.length ? `${data.name}[${tags.join("/")}]` : data.name;
  }

  function compactPalace(palace) {
    return {
      palace: palace?.palace_name || null,
      branch: palace?.branch_name || null,
      element: palace?.element_name || palace?.element || palace?.hanh_cung || null,
      has_tuan: Boolean(palace?.has_tuan),
      has_triet: Boolean(palace?.has_triet),
      is_than: Boolean(palace?.is_than || palace?.than),
      stars: (palace?.stars || []).map(compactStar),
      annual_stars: (palace?.annual_stars || []).map(compactStar),
    };
  }

  function buildEvidencePackage(chart) {
    if (!chart || !Array.isArray(chart.palaces)) throw new Error("Chưa có dữ liệu lá số đầy đủ.");
    return {
      source: "tuvi111 deterministic engine",
      ai_scope: "summary_and_conclusion_only",
      heaven: chart.heaven || {},
      palaces: chart.palaces.map(compactPalace),
      bazi: chart.bazi || {},
      annual: chart.annual || {},
      relations: chart.relations || chart.palace_relations || null,
      combined_analysis: chart.combined_analysis || null,
      metadata: {
        chart_id: chart.chart_id || null,
        engine_version: chart.version || chart.engine_version || null,
      },
    };
  }

  function buildCompactEvidenceText(chart, options = {}) {
    if (!chart || !Array.isArray(chart.palaces)) throw new Error("Chưa có dữ liệu lá số đầy đủ.");
    const lines = [
      "SOURCE=tuvi111 deterministic engine; AI_SCOPE=summary_only",
      `HEAVEN=${clip(chart.heaven || {}, 700)}`,
      "PALACES:",
    ];

    for (const palace of chart.palaces) {
      const flags = [
        palace?.is_than || palace?.than ? "THÂN" : "",
        palace?.has_tuan ? "TUẦN" : "",
        palace?.has_triet ? "TRIỆT" : "",
      ].filter(Boolean).join("+");
      const stars = (palace?.stars || []).map(compactStarToken).filter(Boolean).join(", ");
      lines.push(
        `- ${palace?.palace_name || "?"}@${palace?.branch_name || "?"}/${palace?.element_name || palace?.element || palace?.hanh_cung || "?"}`
        + `${flags ? ` <${flags}>` : ""}: ${clip(stars || "không có danh sách sao", 260)}`
      );
    }

    lines.push(`BAZI=${clip(chart.bazi || {}, 1800)}`);
    if (chart.relations || chart.palace_relations) {
      lines.push(`RELATIONS=${clip(chart.relations || chart.palace_relations, 800)}`);
    }
    if (chart.combined_analysis) lines.push(`COMBINED=${clip(chart.combined_analysis, 700)}`);
    if (options.includeAnnual && chart.annual) lines.push(`ANNUAL=${clip(chart.annual, 700)}`);
    return lines.join("\n");
  }

  const SYSTEM_RULES = `
### VAI TRÒ — HIEP TUVI AI / SUMMARY_ONLY
Bạn chỉ làm nhiệm vụ KẾT LUẬN, ĐỐI CHIẾU và TỔNG KẾT cuối cùng.

Toàn bộ an sao, 12 cung, Can Chi, Cục, Tứ Hóa, Tuần/Triệt, Tràng Sinh, Bát Tự, đại vận/lưu niên và quan hệ cung đã được engine tuvi111 tính trước. Đây là FACT/CALC đã khóa.

BẮT BUỘC:
- Không tự an lại sao, không đổi vị trí cung, không sửa Can Chi/Cục/Tứ Hóa/Tràng Sinh.
- Không viết lại 12 bài luận cung riêng; phần chi tiết đã được hệ thống cục bộ xử lý.
- Không dùng “một sao = một kết luận”. Chỉ tổng hợp cấu trúc lặp lại qua nhiều cung/hệ.
- Tách nguyên cục với đại vận/lưu niên; không dùng lưu tinh để sửa ngược nguyên cục.
- Tử Vi/Bát Tự là hệ diễn giải truyền thống, không trình bày như khoa học thực nghiệm.
- Không khẳng định chắc chắn tử vong, bệnh nặng, tai họa, phá sản, ngoại tình hoặc phạm tội.
- Nếu dữ liệu mâu thuẫn hoặc thiếu, ghi rõ thay vì tự bịa để lấp chỗ trống.
- Viết tiếng Việt, rõ, cụ thể, có ví dụ thực tế, tránh văn vẻ và tránh Barnum.
`;

  function summaryTask(subjectKind, compact = false) {
    return `
### NHIỆM VỤ DUY NHẤT: KẾT LUẬN VÀ TỔNG KẾT TOÀN BỘ
Không lặp lại từng cung theo thứ tự. Đọc evidence rồi chọn các cấu trúc có sức giải thích mạnh nhất.

CẤU TRÚC BẮT BUỘC:
1. **Kết luận tổng quát** — nêu lõi mạnh nhất và điều kiện biểu hiện tốt/xấu.
2. **Các trục quyết định** — Mệnh–Tài–Quan, Mệnh–Di, Mệnh–Thân; chỉ thêm trục khác khi thật sự đổi kết luận.
3. **Tứ Hóa + Tuần/Triệt + Tràng Sinh** — chỉ nêu điểm có sức cấu trúc.
4. **Đối chiếu Tử Vi ↔ Bát Tự ↔ Ngũ Hành** — đồng thuận, bất đồng và dependency chung.
5. **Điểm mạnh / điểm dễ lệch** — có cơ chế và ví dụ thực tế.
6. **Ứng dụng thực tế** — học tập/năng lực, môi trường công việc, khả năng tạo giá trị, quan hệ, thói quen sức khỏe; không chẩn đoán.
7. **Phản biện (Red-team)** — ít nhất 3 phản biện mạnh; nếu đúng phải hạ/sửa kết luận.
8. **3–5 góc nhìn dễ bỏ sót** — chỉ chọn góc có khả năng đổi cách ứng xử/quyết định.
9. **Kết luận cuối** — lõi mạnh nhất, rủi ro lớn nhất, chìa khóa phát triển.

${subjectKind === "child" ? `CHỦ THỂ LÀ TRẺ EM: ưu tiên khí chất, học tập, tự điều tiết, môi trường và cách cha mẹ hỗ trợ; không dự đoán cứng nghề nghiệp, hôn nhân, tài chính hoặc bệnh tật tương lai; thêm gợi ý nuôi dạy thực tế.` : ""}

${compact ? "Độ dài mục tiêu 700–1.200 từ. Ưu tiên kết luận giàu thông tin, không kéo dài bằng liệt kê sao." : "Độ dài mục tiêu khoảng 2.500–5.000 từ nếu dữ liệu đủ. Không kéo dài bằng cách lặp lại danh sách sao."}
`;
  }

  function buildSummaryPrompt(chart, options = {}) {
    const evidence = buildEvidencePackage(chart || getChartFromRuntime());
    const localSummary = options.localSummary || null;
    const subjectKind = options.subjectKind || "unknown";
    return `${SYSTEM_RULES}\n${summaryTask(subjectKind, false)}\n### TÓM TẮT CỤC BỘ (nếu có)\n${localSummary ? JSON.stringify(localSummary, null, 2) : "Không có."}\n\n### EVIDENCE PACKAGE TỪ TUVI111 — KHÔNG ĐƯỢC TỰ Ý SỬA\n${JSON.stringify(evidence, null, 2)}`;
  }

  function buildBrowserSummaryPrompt(chart, options = {}) {
    const effectiveChart = chart || getChartFromRuntime();
    const subjectKind = options.subjectKind || "unknown";
    const localSummary = options.localSummary ? clip(options.localSummary, 1400) : "Không có.";
    const compactEvidence = buildCompactEvidenceText(effectiveChart, { includeAnnual: Boolean(options.includeAnnual) });
    return `${SYSTEM_RULES}\n${summaryTask(subjectKind, true)}\n### TÓM TẮT CỤC BỘ\n${localSummary}\n\n### EVIDENCE NÉN TỪ TUVI111 — FACT/CALC KHÓA\n${compactEvidence}`;
  }

  function validateSummary(text, options = {}) {
    const value = String(text || "").trim();
    const normalized = normalize(value);
    const issues = [];
    const minLength = Math.max(1200, Number(options.minLength || 3500));
    if (value.length < minLength) issues.push(`Kết luận quá ngắn (${value.length} ký tự, cần >= ${minLength}).`);
    if (!normalized.includes("ket luan tong quat") && !normalized.includes("tong quan")) issues.push("Thiếu mục/trục: Kết luận tổng quát.");
    if (!(normalized.includes("menh") && normalized.includes("tai") && normalized.includes("quan"))) issues.push("Thiếu trục: Mệnh–Tài–Quan.");
    if (!normalized.includes("menh") || !normalized.includes("di")) issues.push("Thiếu trục: Mệnh–Di.");
    if (!normalized.includes("bat tu") && !normalized.includes("nhat chu")) issues.push("Thiếu mục/trục: Bát Tự.");
    if (!normalized.includes("tu hoa") && !normalized.includes("hoa loc") && !normalized.includes("hoa quyen") && !normalized.includes("hoa khoa") && !normalized.includes("hoa ky")) issues.push("Thiếu lớp tổng hợp: Tứ Hóa.");
    if (!normalized.includes("red team") && !normalized.includes("phan bien")) issues.push("Thiếu mục: Red-team/phản biện.");
    if (!normalized.includes("ket luan cuoi") && !normalized.includes("loi ket")) issues.push("Thiếu mục: Kết luận cuối.");
    return issues;
  }

  function buildRepairPrompt(originalPrompt, priorText, issues, options = {}) {
    const priorLimit = Math.max(3000, Number(options.priorLimit || 24000));
    return `${originalPrompt}\n\n### QUALITY GATE — VIẾT LẠI TOÀN BỘ PHẦN KẾT LUẬN\nBản trước chưa đạt vì:\n- ${issues.join("\n- ")}\n\nBẢN TRƯỚC CHỈ ĐỂ NHẬN BIẾT LỖI, KHÔNG ĐƯỢC SAO CHÉP MÁY MÓC:\n${String(priorText || "").slice(0, priorLimit)}\n\nHãy viết lại toàn bộ từ đầu, giữ nguyên FACT/CALC của tuvi111, chỉ làm kết luận/tổng kết, không quay lại viết 12 cung riêng.`;
  }

  const api = Object.freeze({
    VERSION,
    PROFILE,
    normalize,
    buildEvidencePackage,
    buildCompactEvidenceText,
    buildSummaryPrompt,
    buildBrowserSummaryPrompt,
    validateSummary,
    buildRepairPrompt,
  });

  root.HiepTuViAI = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
