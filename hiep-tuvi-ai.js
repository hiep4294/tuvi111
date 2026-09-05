"use strict";

(function initHiepTuViAI(root) {
  const VERSION = "2.1.0";
  const PROFILE = "HIEP_TUVI_FULL_REPORT";
  const PALACE_ORDER = Object.freeze([
    "Mệnh", "Phụ Mẫu", "Phúc Đức", "Điền Trạch", "Quan Lộc", "Nô Bộc",
    "Thiên Di", "Tật Ách", "Tài Bạch", "Tử Tức", "Phu Thê", "Huynh Đệ",
  ]);

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
      if (typeof state !== "undefined" && state?.chart) return state.chart;
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
    return `${text.slice(0, Math.max(0, maxChars - 18))}...[rút gọn]`;
  }

  function starName(star) {
    return String(star?.saoTen || star?.name || star?.label || "").trim();
  }

  function compactStar(star) {
    return {
      name: starName(star),
      dignity: String(star?.saoDacTinh || star?.dignity || "").trim() || null,
      nature: String(star?.nature || "").trim() || null,
      element: String(star?.element_name || star?.element || "").trim() || null,
    };
  }

  function compactStarToken(star) {
    const item = compactStar(star);
    if (!item.name) return "";
    const tags = [item.dignity, item.element, item.nature].filter(Boolean);
    return tags.length ? `${item.name}[${tags.join("/")}]` : item.name;
  }

  function findPalace(chart, name) {
    const target = normalize(name);
    return (chart?.palaces || []).find((palace) => normalize(palace?.palace_name) === target) || null;
  }

  function palaceFlags(palace) {
    return [
      palace?.is_than || palace?.is_body || palace?.than ? "THÂN" : "",
      palace?.has_tuan ? "TUẦN" : "",
      palace?.has_triet ? "TRIỆT" : "",
    ].filter(Boolean).join("+") || "-";
  }

  function palaceLine(palace, maxStarChars = 620) {
    if (!palace) return "PALACE=MISSING";
    const stars = (palace?.stars || []).map(compactStarToken).filter(Boolean).join(", ");
    return `${palace.palace_name}@${palace.branch_name || "?"}/${palace.element_name || palace.element || palace.hanh_cung || "?"};FLAGS=${palaceFlags(palace)};STARS=${clip(stars || "-", maxStarChars)}`;
  }

  function detailsNames(items) {
    if (!Array.isArray(items)) return "-";
    const names = items.map((item) => starName(item)).filter(Boolean);
    return names.length ? names.join(",") : "-";
  }

  function relationNodeToken(node) {
    if (!node) return "-";
    const flags = [node.tuan ? "TUẦN" : "", node.triet ? "TRIỆT" : ""].filter(Boolean).join("+") || "-";
    return `${node.palace || "?"}@${node.branch || "?"}{M:${detailsNames(node.major_star_details)};G:${detailsNames(node.good_star_details)};B:${detailsNames(node.bad_star_details)};H:${detailsNames(node.transformation_details)};TS:${starName(node.trang_sinh_detail) || "-"};F:${flags}}`;
  }

  function relationLine(chart, palace) {
    if (!palace) return "REL=-";
    const rel = chart?.relations?.[String(palace.branch_id)] || chart?.palace_relations?.[String(palace.branch_id)] || null;
    if (!rel) return "REL=-";
    const trine = (rel.trine || []).map(relationNodeToken).join(" | ") || "-";
    const adjacent = (rel.adjacent || []).map(relationNodeToken).join(" | ") || "-";
    return `REL ${palace.palace_name}: SELF=${relationNodeToken(rel.self)} || OPP=${relationNodeToken(rel.opposite)} || TRI=${trine} || ADJ=${adjacent} || NHI=${relationNodeToken(rel.six_harmony)}`;
  }

  function heavenCore(chart) {
    const h = chart?.heaven || {};
    return {
      gender: h.gender || null,
      input_time: h.input_time || null,
      lunar_date: h.chart_lunar_date || null,
      year: h.year_can_chi || null,
      month: h.month_can_chi || null,
      day: h.day_can_chi || null,
      hour: h.hour_can_chi || null,
      ban_menh: h.ban_menh || null,
      cuc: h.cuc || null,
      menh_cuc: h.menh_cuc_relation || null,
      than_cu: h.than_cu || h.than_palace || null,
      menh_chu: h.menh_chu || null,
      than_chu: h.than_chu || null,
      am_duong: h.am_duong_menh || null,
    };
  }

  function buildEvidencePackage(chart) {
    const effective = chart || getChartFromRuntime();
    if (!effective || !Array.isArray(effective.palaces)) throw new Error("Chưa có dữ liệu lá số đầy đủ.");
    return {
      source: "tuvi111 deterministic engine",
      ai_scope: "interpret_locked_facts_only",
      heaven: effective.heaven || {},
      palaces: effective.palaces.map((palace) => ({
        palace: palace?.palace_name || null,
        branch: palace?.branch_name || null,
        branch_id: Number(palace?.branch_id || 0) || null,
        element: palace?.element_name || palace?.element || palace?.hanh_cung || null,
        has_tuan: Boolean(palace?.has_tuan),
        has_triet: Boolean(palace?.has_triet),
        is_than: Boolean(palace?.is_than || palace?.is_body || palace?.than),
        stars: (palace?.stars || []).map(compactStar),
      })),
      bazi: effective.bazi || {},
      annual: effective.annual || {},
      relations: effective.relations || effective.palace_relations || null,
      combined_analysis: effective.combined_analysis || null,
      metadata: { chart_id: effective.chart_id || null, engine_version: effective.version || effective.engine_version || null },
    };
  }

  function compactSynthesisPalaceLine(palace) {
    if (!palace) return "";
    const main = (palace.stars || []).filter((s) => s?.nature === "main").map(compactStarToken).filter(Boolean);
    const transformations = (palace.stars || []).filter((s) => /^Hóa /i.test(starName(s)) || s?.nature === "transformation").map(compactStarToken).filter(Boolean);
    const ts = (palace.stars || []).find((s) => s?.nature === "trang_sinh");
    return `${palace.palace_name}@${palace.branch_name || "?"};F=${palaceFlags(palace)};MAIN=${main.join(",") || "-"};HÓA=${transformations.join(",") || "-"};TS=${starName(ts) || "-"}`;
  }

  function buildCompactEvidenceText(chart, options = {}) {
    const effective = chart || getChartFromRuntime();
    if (!effective || !Array.isArray(effective.palaces)) throw new Error("Chưa có dữ liệu lá số đầy đủ.");
    const lines = [
      "SOURCE=tuvi111;FACT/CALC=LOCKED",
      `HEAVEN=${clip(heavenCore(effective), 650)}`,
      "PALACES:",
      ...PALACE_ORDER.map((name) => compactSynthesisPalaceLine(findPalace(effective, name))).filter(Boolean),
    ];
    if (options.includeBazi !== false) lines.push(`BAZI=${clip(baziEvidence(effective), 1500)}`);
    if (effective.combined_analysis) lines.push(`CROSS=${clip(effective.combined_analysis?.cross_system_signals || effective.combined_analysis, 700)}`);
    if (options.includeAnnual && effective.annual) lines.push(`ANNUAL=${clip(effective.annual, 500)}`);
    return lines.join("\n");
  }

  const LOCKED_RULES = `
### HIEP TUVI AI — FACT/CALC KHÓA
Engine tuvi111 đã tính cung, sao, Can Chi, Cục, Mệnh/Thân, Tứ Hóa, Tuần/Triệt, Tràng Sinh, Bát Tự và quan hệ cung. Chỉ DIỄN GIẢI; không tự an/sửa/bịa dữ kiện.
Bắt buộc: không “một sao = một kết luận”; không trộn nguyên cục với lưu niên; formation phải complete/partial/broken hoặc ghi chưa đủ; rule khác trường phái thì ghi SCHOOL/hạ confidence; Tử Vi/Bát Tự là hệ truyền thống, không phải khoa học thực nghiệm; không phán chắc tử vong, bệnh nặng, tai họa, phá sản, ngoại tình, phạm tội. Viết tiếng Việt rõ, có cơ chế và ví dụ thực tế.
`;

  function subjectRules(subjectKind) {
    if (subjectKind !== "child") return "";
    return `CHỦ THỂ TRẺ EM: chuyển biểu tượng người lớn thành khí chất/học tập/tự điều tiết/môi trường/cách cha mẹ hỗ trợ; không dự đoán cứng nghề, hôn nhân, tài chính, bệnh tật; phần hành động cuối có 5–10 gợi ý và 3 điều nên tránh.\n`;
  }

  function dataQualityEvidence(chart) {
    const h = chart?.heaven || {};
    return `thời_gian=${h.input_time || "?"}; âm_lịch=${h.chart_lunar_date || "?"}; giới_tính=${h.gender || "?"}; quy_tắc_giờ=${h.time_rule || "?"}; nơi_sinh=không có trong chart; ảnh=không dùng; quẻ=không có`;
  }

  function palaceBatchEvidenceText(chart, palaceNames) {
    const lines = [`HEAVEN=${clip(heavenCore(chart), 650)}`];
    for (const name of palaceNames || []) {
      const palace = findPalace(chart, name);
      lines.push(palaceLine(palace));
      lines.push(clip(relationLine(chart, palace), 1450));
    }
    return lines.join("\n");
  }

  function baziEvidence(chart) {
    const b = chart?.bazi || {};
    return {
      pillars: b.pillars || null,
      day_master: b.day_master || null,
      month_method: b.month_method_name || null,
      month_basis: b.month_basis_label || null,
      element_balance: b.element_balance || null,
      interactions: b.interactions || b.branch_interactions || b.stem_interactions || null,
      ten_gods: b.ten_gods || b.ten_god_summary || null,
      luck_cycles: b.luck_cycles || null,
    };
  }

  function fullReportPlan() {
    return [
      { id: "palaces-1", kind: "palaces", label: "Data Quality + Mệnh–Phụ Mẫu", palaces: ["Mệnh", "Phụ Mẫu"], includeDataQuality: true },
      { id: "palaces-2", kind: "palaces", label: "Phúc Đức–Điền Trạch", palaces: ["Phúc Đức", "Điền Trạch"] },
      { id: "palaces-3", kind: "palaces", label: "Quan Lộc–Nô Bộc", palaces: ["Quan Lộc", "Nô Bộc"] },
      { id: "palaces-4", kind: "palaces", label: "Thiên Di–Tật Ách", palaces: ["Thiên Di", "Tật Ách"] },
      { id: "palaces-5", kind: "palaces", label: "Tài Bạch–Tử Tức", palaces: ["Tài Bạch", "Tử Tức"] },
      { id: "palaces-6", kind: "palaces", label: "Phu Thê–Huynh Đệ", palaces: ["Phu Thê", "Huynh Đệ"] },
      { id: "bazi", kind: "bazi", label: "Tứ Trụ Bát Tự + Ngũ Hành" },
      { id: "synthesis", kind: "synthesis", label: "Đối chiếu + phản biện + tổng kết" },
    ];
  }

  function buildPalaceSectionPrompt(chart, job, options = {}) {
    const subjectKind = options.subjectKind || "unknown";
    const dq = job.includeDataQuality ? `\nDATA QUALITY INPUT: ${dataQualityEvidence(chart)}\n` : "";
    return `${LOCKED_RULES}${subjectRules(subjectKind)}
### PHẦN: ${job.label}
Chỉ viết đúng ${job.palaces.length} cung theo thứ tự: ${job.palaces.join(" → ")}. ${job.includeDataQuality ? "Trước cung đầu, viết **DATA QUALITY CARD** ngắn: dữ liệu có/thiếu, giả định, DQ 0–100 chỉ phản ánh độ đầy đủ." : "Không lặp Data Quality."} Không viết Bát Tự/red-team/tổng kết toàn lá số ở phần này.

MỖI CUNG dùng tiêu đề ## CUNG X, khoảng 250–350 từ nếu evidence đủ, đi qua:
- Nền cung: địa chi, Ngũ Hành, Mệnh–Thân.
- Chính tinh + phụ tinh: nêu tên các sao nguyên cục trong dòng STARS; phân tích theo nhóm, không bỏ chính tinh/Hóa/Tràng Sinh/Tuần-Triệt.
- Ngũ Hành cung↔sao↔Mệnh; bộ sao/cách cục complete|partial|broken.
- Tràng Sinh; tam phương tứ chính + đối cung; nhị hợp + giáp cung.
- Tứ Hóa theo mạng nguồn→sao→cung→tác động; nếu nguồn không có trong evidence thì nói chưa đủ, không bịa.
- Tuần/Triệt là modifier; Mệnh–Thân/cung liên đới; điểm hỗ trợ và điểm phá.
- Kết luận cuối cung đúng mẫu: **Mạnh / Yếu / Điều kiện / Trạng thái: STRONG|CONDITIONAL|CONTESTED|INSUFFICIENT**.
${dq}
### EVIDENCE NÉN — FACT/CALC KHÓA
${palaceBatchEvidenceText(chart, job.palaces)}`;
  }

  function buildBaziSectionPrompt(chart, options = {}) {
    const subjectKind = options.subjectKind || "unknown";
    return `${LOCKED_RULES}${subjectRules(subjectKind)}
### PHẦN: TỨ TRỤ BÁT TỰ + NGŨ HÀNH
Không lặp 12 cung và chưa tổng kết cuối.

## TỨ TRỤ BÁT TỰ
Theo thứ tự: 4 trụ → Nhật chủ → tháng lệnh/khí mùa → vượng suy → can chi → hợp/xung/hình/hại/phá nếu evidence có → Thập Thần → dụng/hỷ/kỵ chỉ khi đủ evidence → đại vận → sensitivity giờ/tiết khí. Không đếm số hành để kết luận vượng suy; không “thiếu hành nào bổ hành đó”.

## NGŨ HÀNH ÂM DƯƠNG
Nêu trợ lực/tiêu hao/kiểm soát, hành vượng/yếu theo evidence nhưng không đồng nhất với dụng thần; tách điều hòa khí hậu với cân bằng thân khi chưa đủ dữ liệu; ứng dụng thực tế thận trọng.

### BAZI FACT/CALC KHÓA
${clip(baziEvidence(chart), 2500)}`;
  }

  function buildSynthesisSectionPrompt(chart, options = {}) {
    const subjectKind = options.subjectKind || "unknown";
    const localSummary = options.localSummary ? clip(options.localSummary, 650) : "-";
    return `${LOCKED_RULES}${subjectRules(subjectKind)}
### PHẦN CUỐI — KHÔNG VIẾT LẠI 12 CUNG
## ĐỐI CHIẾU TỬ VI ↔ BÁT TỰ ↔ NGŨ HÀNH
Tách: đồng thuận độc lập / cùng dependency / bất đồng+hạ confidence. Quét Mệnh–Tài–Quan, Mệnh–Di, Mệnh–Thân, Phúc–Tài và chuỗi Tứ Hóa lặp có sức cấu trúc.

## RED-TEAM / PHẢN BIỆN
Ít nhất 3 phản biện mạnh: cherry-picking, một sao=verdict, formation thiếu điều kiện, trộn vận, dependency hệ, SCHOOL khác. Phản biện đúng thì sửa/hạ kết luận.

## TỔNG KẾT CUỐI
Lõi mạnh nhất / rủi ro dễ lệch / điều kiện tốt-xấu / chìa khóa phát triển.

## HÀNH ĐỘNG THỰC TẾ
5–10 gợi ý cụ thể, tách khỏi diễn giải truyền thống.

## 3–5 GÓC NHÌN DỄ BỎ SÓT
Nêu góc có thể đổi hành vi/quyết định và trigger cần kiểm chứng.

LOCAL_RULE_SUMMARY=${localSummary}
### EVIDENCE NÉN TOÀN LÁ SỐ
${buildCompactEvidenceText(chart, { includeBazi: true, includeAnnual: false })}`;
  }

  function buildFullReportSectionPrompt(chart, job, options = {}) {
    const effective = chart || getChartFromRuntime();
    if (!effective || !Array.isArray(effective.palaces)) throw new Error("Chưa có dữ liệu lá số đầy đủ.");
    if (!job?.kind) throw new Error("Thiếu kế hoạch phần báo cáo.");
    if (job.kind === "palaces") return buildPalaceSectionPrompt(effective, job, options);
    if (job.kind === "bazi") return buildBaziSectionPrompt(effective, options);
    if (job.kind === "synthesis") return buildSynthesisSectionPrompt(effective, options);
    throw new Error(`Loại phần báo cáo không hỗ trợ: ${job.kind}`);
  }

  function validateFullReportSection(text, job) {
    const value = String(text || "").trim();
    const n = normalize(value);
    const issues = [];
    const minChars = job?.kind === "palaces" ? 1300 : 1200;
    if (value.length < minChars) issues.push(`Phần ${job?.id || "?"} quá ngắn (${value.length} ký tự).`);
    if (job?.includeDataQuality && !n.includes("data quality")) issues.push("Thiếu Data Quality Card.");
    if (job?.kind === "palaces") {
      for (const palace of job.palaces || []) if (!n.includes(normalize(palace))) issues.push(`Thiếu cung ${palace}.`);
      if (!n.includes("tam phuong")) issues.push("Thiếu tam phương tứ chính.");
      if (!n.includes("tu hoa")) issues.push("Thiếu Tứ Hóa.");
      if (!n.includes("trang sinh")) issues.push("Thiếu Tràng Sinh.");
      if (!n.includes("trang thai")) issues.push("Thiếu trạng thái claim ở kết luận cung.");
    }
    if (job?.kind === "bazi") {
      if (!n.includes("bat tu") && !n.includes("tu tru")) issues.push("Thiếu Tứ Trụ Bát Tự.");
      if (!n.includes("nhat chu")) issues.push("Thiếu Nhật chủ.");
      if (!n.includes("ngu hanh")) issues.push("Thiếu Ngũ Hành.");
    }
    if (job?.kind === "synthesis") {
      if (!n.includes("doi chieu")) issues.push("Thiếu đối chiếu hệ.");
      if (!n.includes("red team") && !n.includes("phan bien")) issues.push("Thiếu Red-team/phản biện.");
      if (!n.includes("tong ket")) issues.push("Thiếu tổng kết cuối.");
      if (!n.includes("hanh dong")) issues.push("Thiếu hành động thực tế.");
      if (!n.includes("goc nhin")) issues.push("Thiếu góc nhìn dễ bỏ sót.");
    }
    return issues;
  }

  function buildSectionRepairPrompt(originalPrompt, priorText, issues) {
    return `${originalPrompt}\n\n### QUALITY GATE — VIẾT LẠI CHỈ PHẦN NÀY\nLỗi:\n- ${issues.join("\n- ")}\nBản trước để nhận biết lỗi:\n${String(priorText || "").slice(0, 1200)}\nViết lại phần này từ đầu, giữ FACT/CALC, không mở rộng sang phần khác.`;
  }

  function buildSummaryPrompt(chart, options = {}) {
    return buildSynthesisSectionPrompt(chart || getChartFromRuntime(), options);
  }

  function buildBrowserSummaryPrompt(chart, options = {}) {
    return buildSynthesisSectionPrompt(chart || getChartFromRuntime(), options);
  }

  function validateSummary(text, options = {}) {
    const issues = validateFullReportSection(text, { id: "summary", kind: "synthesis" });
    const minLength = Math.max(1000, Number(options.minLength || 1200));
    if (String(text || "").trim().length < minLength && !issues.some((x) => x.includes("quá ngắn"))) issues.unshift(`Kết luận quá ngắn, cần >= ${minLength} ký tự.`);
    return issues;
  }

  function buildRepairPrompt(originalPrompt, priorText, issues) {
    return buildSectionRepairPrompt(originalPrompt, priorText, issues);
  }

  const api = Object.freeze({
    VERSION,
    PROFILE,
    PALACE_ORDER,
    normalize,
    buildEvidencePackage,
    buildCompactEvidenceText,
    fullReportPlan,
    buildFullReportSectionPrompt,
    validateFullReportSection,
    buildSectionRepairPrompt,
    buildSummaryPrompt,
    buildBrowserSummaryPrompt,
    validateSummary,
    buildRepairPrompt,
  });

  root.HiepTuViAI = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
