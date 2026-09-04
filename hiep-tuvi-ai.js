"use strict";

(function initHiepTuViAI(root) {
  const VERSION = "1.1.0";
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

  function compactStar(star) {
    return {
      name: String(star?.saoTen || star?.name || "").trim(),
      dignity: String(star?.saoDacTinh || star?.dignity || "").trim() || null,
      nature: String(star?.nature || "").trim() || null,
      element: String(star?.element_name || star?.element || "").trim() || null,
    };
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

  function buildSummaryPrompt(chart, options = {}) {
    const evidence = buildEvidencePackage(chart || getChartFromRuntime());
    const localSummary = options.localSummary || null;
    const subjectKind = options.subjectKind || "unknown";

    return `${SYSTEM_RULES}

### NHIỆM VỤ DUY NHẤT: KẾT LUẬN VÀ TỔNG KẾT TOÀN BỘ
Không lặp lại từng cung theo thứ tự. Hãy đọc toàn bộ evidence rồi tổng hợp các cấu trúc có sức giải thích mạnh nhất.

CẤU TRÚC ĐẦU RA BẮT BUỘC:
1. **Kết luận tổng quát** — 4–8 đoạn, nêu lõi mạnh nhất của toàn lá số và điều kiện để nó biểu hiện tốt/xấu.
2. **Các trục quyết định** — tối thiểu Mệnh–Tài–Quan, Mệnh–Di, cung có Thân; thêm Phúc–Di–Phu hoặc Điền–Tật–Huynh khi thật sự làm đổi kết luận.
3. **Tứ Hóa + Tuần/Triệt + Tràng Sinh** — chỉ nêu các điểm có sức cấu trúc, không kể danh sách cơ học.
4. **Đối chiếu Tử Vi ↔ Bát Tự ↔ Ngũ Hành** — tách điểm đồng thuận, điểm phụ thuộc chung và điểm bất đồng. Không ép hai hệ đồng thuận.
5. **Điểm mạnh / điểm dễ lệch** — mỗi nhóm 3–6 ý, có cơ chế chứ không chỉ nhãn tính cách.
6. **Ứng dụng thực tế** — học tập/năng lực, công việc theo kiểu môi trường phù hợp, khả năng tạo giá trị/tài nguyên, quan hệ và thói quen sức khỏe; không chẩn đoán.
7. **Red-team** — ít nhất 3 phản biện mạnh nhất đối với chính bản tổng kết. Nếu phản biện đúng phải hạ hoặc sửa kết luận.
8. **3–5 góc nhìn dễ bỏ sót** — chỉ chọn góc có khả năng đổi cách ứng xử/quyết định.
9. **Kết luận cuối** — 1 đoạn trả lời rõ: lõi mạnh nhất là gì, rủi ro lớn nhất là gì, chìa khóa phát triển là gì.

Nếu subject_kind là child hoặc dữ liệu cho thấy chủ thể còn nhỏ tuổi:
- ưu tiên khí chất, học tập, tự điều tiết, môi trường và cách cha mẹ hỗ trợ;
- không dự đoán cứng nghề nghiệp, hôn nhân, tài chính hoặc bệnh tật tương lai;
- thêm 5–10 gợi ý nuôi dạy/hoạt động thực tế và 3 điều nên tránh.

Độ dài mục tiêu: khoảng 2.500–5.000 từ nếu dữ liệu đủ. Không kéo dài bằng cách lặp lại danh sách sao.

### SUBJECT_KIND
${subjectKind}

### TÓM TẮT CỤC BỘ (nếu có)
${localSummary ? JSON.stringify(localSummary, null, 2) : "Không có; dùng evidence engine bên dưới."}

### EVIDENCE PACKAGE TỪ TUVI111 — KHÔNG ĐƯỢC TỰ Ý SỬA
${JSON.stringify(evidence, null, 2)}
`;
  }

  function validateSummary(text) {
    const value = String(text || "").trim();
    const normalized = normalize(value);
    const issues = [];
    if (value.length < 3500) issues.push(`Kết luận quá ngắn (${value.length} ký tự, cần >= 3500).`);
    if (!normalized.includes("ket luan tong quat") && !normalized.includes("tong quan")) issues.push("Thiếu mục/trục: Kết luận tổng quát.");
    if (!(normalized.includes("menh") && normalized.includes("tai") && normalized.includes("quan"))) issues.push("Thiếu trục: Mệnh–Tài–Quan.");
    if (!normalized.includes("menh") || !normalized.includes("di")) issues.push("Thiếu trục: Mệnh–Di.");
    if (!normalized.includes("bat tu") && !normalized.includes("nhat chu")) issues.push("Thiếu mục/trục: Bát Tự.");
    if (!normalized.includes("tu hoa") && !normalized.includes("hoa loc") && !normalized.includes("hoa quyen") && !normalized.includes("hoa khoa") && !normalized.includes("hoa ky")) issues.push("Thiếu lớp tổng hợp: Tứ Hóa.");
    if (!normalized.includes("red team") && !normalized.includes("phan bien")) issues.push("Thiếu mục: Red-team/phản biện.");
    if (!normalized.includes("ket luan cuoi") && !normalized.includes("loi ket")) issues.push("Thiếu mục: Kết luận cuối.");
    return issues;
  }

  function buildRepairPrompt(originalPrompt, priorText, issues) {
    return `${originalPrompt}

### QUALITY GATE — VIẾT LẠI TOÀN BỘ PHẦN KẾT LUẬN
Bản trước chưa đạt vì:
- ${issues.join("\n- ")}

BẢN TRƯỚC CHỈ ĐỂ NHẬN BIẾT LỖI, KHÔNG ĐƯỢC SAO CHÉP MÁY MÓC:
${String(priorText || "").slice(0, 24000)}

Hãy viết lại toàn bộ từ đầu, giữ nguyên FACT/CALC của tuvi111, chỉ làm kết luận/tổng kết, không quay lại viết 12 cung riêng.`;
  }

  const api = Object.freeze({
    VERSION,
    PROFILE,
    normalize,
    buildEvidencePackage,
    buildSummaryPrompt,
    validateSummary,
    buildRepairPrompt,
  });

  root.HiepTuViAI = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
