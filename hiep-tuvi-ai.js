"use strict";

(function initHiepTuViAI(root) {
  const VERSION = "2.0.0";
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
    return `${text.slice(0, Math.max(0, maxChars - 20))}...[đã rút gọn]`;
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

  function compactPalace(palace, includeAnnual = false) {
    const data = {
      palace: palace?.palace_name || null,
      branch: palace?.branch_name || null,
      branch_id: Number(palace?.branch_id || 0) || null,
      element: palace?.element_name || palace?.element || palace?.hanh_cung || null,
      has_tuan: Boolean(palace?.has_tuan),
      has_triet: Boolean(palace?.has_triet),
      is_than: Boolean(palace?.is_than || palace?.is_body || palace?.than),
      stars: (palace?.stars || []).map(compactStar),
    };
    if (includeAnnual) data.annual_stars = (palace?.annual_stars || []).map(compactStar);
    return data;
  }

  function findPalace(chart, name) {
    const target = normalize(name);
    return (chart?.palaces || []).find((palace) => normalize(palace?.palace_name) === target) || null;
  }

  function detailsNames(items) {
    if (!Array.isArray(items)) return [];
    return items.map((item) => starName(item)).filter(Boolean);
  }

  function compactRelationNode(node) {
    if (!node) return null;
    return {
      palace: node.palace || null,
      branch: node.branch || null,
      major: detailsNames(node.major_star_details),
      good: detailsNames(node.good_star_details),
      bad: detailsNames(node.bad_star_details),
      tu_hoa: detailsNames(node.transformation_details),
      trang_sinh: starName(node.trang_sinh_detail) || null,
      tuan: Boolean(node.tuan),
      triet: Boolean(node.triet),
    };
  }

  function relationSnapshot(chart, palace) {
    if (!palace) return null;
    const rel = chart?.relations?.[String(palace.branch_id)] || chart?.palace_relations?.[String(palace.branch_id)] || null;
    if (!rel) return null;
    return {
      self: compactRelationNode(rel.self),
      opposite: compactRelationNode(rel.opposite),
      trine: (rel.trine || []).map(compactRelationNode),
      adjacent: (rel.adjacent || []).map(compactRelationNode),
      six_harmony: compactRelationNode(rel.six_harmony),
    };
  }

  function heavenCore(chart) {
    const h = chart?.heaven || {};
    return {
      name: h.name || null,
      gender: h.gender || null,
      input_time: h.input_time || null,
      chart_lunar_date: h.chart_lunar_date || null,
      year_can_chi: h.year_can_chi || null,
      month_can_chi: h.month_can_chi || null,
      day_can_chi: h.day_can_chi || null,
      hour_can_chi: h.hour_can_chi || null,
      ban_menh: h.ban_menh || null,
      cuc: h.cuc || null,
      menh_cuc_relation: h.menh_cuc_relation || null,
      menh_branch: h.menh_branch || null,
      than_cu: h.than_cu || h.than_palace || null,
      menh_chu: h.menh_chu || null,
      than_chu: h.than_chu || null,
      am_duong_menh: h.am_duong_menh || null,
      placement_profile_label: h.placement_profile_label || null,
      time_rule: h.time_rule || null,
    };
  }

  function buildEvidencePackage(chart) {
    const effective = chart || getChartFromRuntime();
    if (!effective || !Array.isArray(effective.palaces)) throw new Error("Chưa có dữ liệu lá số đầy đủ.");
    return {
      source: "tuvi111 deterministic engine",
      ai_scope: "interpret_locked_facts_only",
      heaven: effective.heaven || {},
      palaces: effective.palaces.map((palace) => compactPalace(palace, true)),
      bazi: effective.bazi || {},
      annual: effective.annual || {},
      relations: effective.relations || effective.palace_relations || null,
      combined_analysis: effective.combined_analysis || null,
      metadata: {
        chart_id: effective.chart_id || null,
        engine_version: effective.version || effective.engine_version || null,
      },
    };
  }

  function buildCompactEvidenceText(chart, options = {}) {
    const effective = chart || getChartFromRuntime();
    if (!effective || !Array.isArray(effective.palaces)) throw new Error("Chưa có dữ liệu lá số đầy đủ.");
    const lines = [
      "SOURCE=tuvi111 deterministic engine; FACT/CALC=LOCKED",
      `HEAVEN=${clip(heavenCore(effective), 1000)}`,
      "PALACES:",
    ];
    for (const name of PALACE_ORDER) {
      const palace = findPalace(effective, name);
      if (!palace) continue;
      const flags = [
        palace?.is_than || palace?.is_body || palace?.than ? "THÂN" : "",
        palace?.has_tuan ? "TUẦN" : "",
        palace?.has_triet ? "TRIỆT" : "",
      ].filter(Boolean).join("+");
      const stars = (palace?.stars || []).map(compactStarToken).filter(Boolean).join(", ");
      lines.push(`- ${name}@${palace.branch_name || "?"}/${palace.element_name || palace.element || palace.hanh_cung || "?"}${flags ? ` <${flags}>` : ""}: ${clip(stars, 320)}`);
    }
    if (options.includeBazi !== false) lines.push(`BAZI=${clip(effective.bazi || {}, 2200)}`);
    if (effective.combined_analysis) lines.push(`COMBINED=${clip(effective.combined_analysis, 900)}`);
    if (options.includeAnnual && effective.annual) lines.push(`ANNUAL=${clip(effective.annual, 700)}`);
    return lines.join("\n");
  }

  const LOCKED_RULES = `
### VAI TRÒ — HIEP TUVI AI
Bạn viết báo cáo theo phương pháp Hiep Tuvi, nhưng tuyệt đối không tự tính lại lá số.

FACT/CALC đã được engine tuvi111 khóa: vị trí 12 cung, sao, Can Chi, Cục, Mệnh/Thân, Tứ Hóa, Tuần/Triệt, Tràng Sinh, Bát Tự và quan hệ cung. Chỉ được DIỄN GIẢI dữ liệu được cung cấp.

QUY TẮC BẮT BUỘC:
- Không đổi vị trí cung/sao, không tự an thêm sao, không sửa FACT/CALC.
- Không dùng “một sao = một kết luận”. Luôn đọc sao trong cấu trúc cung + bộ sao + tam phương + Tứ Hóa + Tuần/Triệt + Tràng Sinh + Mệnh/Thân.
- Tách nguyên cục với lưu niên; báo cáo mặc định tập trung nguyên cục, không dùng lưu tinh để sửa ngược nguyên cục.
- Nếu gọi cách cục, phải nói complete/partial/broken hoặc nói chưa đủ điều kiện.
- Khi quy tắc phụ thuộc trường phái, ghi ngắn SCHOOL: NAM_PHAI_TAM_HOP / TU_HOA / CLASSICAL; nếu evidence không đủ thì hạ confidence, không bịa.
- Tử Vi/Bát Tự là hệ diễn giải truyền thống, không trình bày như khoa học thực nghiệm.
- Không khẳng định chắc chắn tử vong, bệnh nặng, tai họa, phá sản, ngoại tình, phạm tội hoặc ý đồ xấu.
- Tiếng Việt, ngắn rõ nhưng phân tích có cơ chế; có ví dụ thực tế; tránh văn vẻ và Barnum.
`;

  function subjectRules(subjectKind) {
    if (subjectKind !== "child") return "";
    return `
CHỦ THỂ LÀ TRẺ EM:
- chuyển biểu tượng người lớn thành khí chất, học tập, tự điều tiết, môi trường và cách cha mẹ hỗ trợ;
- không dự đoán cứng nghề nghiệp, hôn nhân, tài chính hoặc bệnh tật tương lai;
- ở phần hành động cuối phải có 5–10 gợi ý nuôi dạy/hoạt động và 3 điều nên tránh.
`;
  }

  function dataQualityEvidence(chart) {
    const h = chart?.heaven || {};
    return {
      date_time: h.input_time || null,
      lunar_date: h.chart_lunar_date || null,
      gender: h.gender || null,
      time_rule: h.time_rule || null,
      placement_profile: h.placement_profile_label || null,
      location: "không có dữ liệu nơi sinh trong chart; không được tự suy đoán",
      image: "không dùng",
      kinh_dich: "không có quẻ",
    };
  }

  function palaceBatchEvidence(chart, palaceNames) {
    return {
      heaven: heavenCore(chart),
      palaces: palaceNames.map((name) => {
        const palace = findPalace(chart, name);
        return {
          data: compactPalace(palace, false),
          relation_stack: relationSnapshot(chart, palace),
        };
      }),
    };
  }

  function baziEvidence(chart) {
    const b = chart?.bazi || {};
    return {
      pillars: b.pillars || null,
      day_master: b.day_master || null,
      month_method_name: b.month_method_name || null,
      month_basis_label: b.month_basis_label || null,
      element_balance: b.element_balance || null,
      luck_cycles: b.luck_cycles || null,
      interactions: b.interactions || b.branch_interactions || b.stem_interactions || null,
      ten_gods: b.ten_gods || b.ten_god_summary || null,
      raw_extra: clip(b, 2200),
    };
  }

  function fullReportPlan() {
    return [
      { id: "palaces-1", kind: "palaces", label: "Data Quality + Mệnh–Phụ Mẫu–Phúc Đức", palaces: ["Mệnh", "Phụ Mẫu", "Phúc Đức"], includeDataQuality: true },
      { id: "palaces-2", kind: "palaces", label: "Điền Trạch–Quan Lộc–Nô Bộc", palaces: ["Điền Trạch", "Quan Lộc", "Nô Bộc"] },
      { id: "palaces-3", kind: "palaces", label: "Thiên Di–Tật Ách–Tài Bạch", palaces: ["Thiên Di", "Tật Ách", "Tài Bạch"] },
      { id: "palaces-4", kind: "palaces", label: "Tử Tức–Phu Thê–Huynh Đệ", palaces: ["Tử Tức", "Phu Thê", "Huynh Đệ"] },
      { id: "bazi", kind: "bazi", label: "Tứ Trụ Bát Tự + Ngũ Hành" },
      { id: "synthesis", kind: "synthesis", label: "Đối chiếu + phản biện + tổng kết" },
    ];
  }

  function buildPalaceSectionPrompt(chart, job, options = {}) {
    const subjectKind = options.subjectKind || "unknown";
    const evidence = palaceBatchEvidence(chart, job.palaces || []);
    const dq = job.includeDataQuality ? `\n### DATA QUALITY INPUT\n${JSON.stringify(dataQualityEvidence(chart), null, 2)}\n` : "";
    return `${LOCKED_RULES}${subjectRules(subjectKind)}

### NHIỆM VỤ PHẦN NÀY
Chỉ viết đúng ${job.palaces.length} cung sau, đúng thứ tự: ${job.palaces.join(" → ")}.
${job.includeDataQuality ? "Trước cung đầu tiên, viết **DATA QUALITY CARD** ngắn: dữ liệu có/thiếu, giả định, DQ 0–100 chỉ phản ánh độ đầy đủ dữ liệu." : "Không lặp Data Quality Card."}
Không viết Bát Tự, red-team hoặc tổng kết toàn lá số trong phần này.

VỚI MỖI CUNG, dùng tiêu đề `## CUNG X` và đi đủ stack sau:
1. Nền cung: vị trí/địa chi/Ngũ Hành/quan hệ Mệnh–Thân.
2. Chính tinh – phụ tinh: nêu và giải thích các sao nguyên cục có trong evidence; không bỏ chính tinh, Tứ Hóa, Tràng Sinh, Tuần/Triệt. Phụ tinh nhỏ có thể gom nhóm nhưng vẫn nêu tên.
3. Ngũ Hành cung ↔ sao ↔ Mệnh: nêu hướng lực, không đồng nhất sinh=tốt/khắc=xấu.
4. Bộ sao/cách cục: chỉ gọi khi đủ điều kiện; ghi complete/partial/broken.
5. Tràng Sinh: đọc như pha khí, không biến thành phán quyết.
6. Tam phương tứ chính + đối cung.
7. Nhị hợp + giáp cung.
8. Tứ Hóa: đọc theo mạng nguồn → sao mang Hóa → cung đích → tác động.
9. Tuần/Triệt: bộ điều biến, không phải nút xóa.
10. Mệnh–Thân + cung liên đới theo chủ đề.
11. Điểm hỗ trợ / điểm phá.
12. Kết luận cung: **Mạnh / Yếu / Điều kiện / Trạng thái STRONG|CONDITIONAL|CONTESTED|INSUFFICIENT**.

Mỗi cung khoảng 350–550 từ nếu evidence đủ; không kéo dài bằng lặp tên sao.${dq}
### EVIDENCE FACT/CALC KHÓA
${JSON.stringify(evidence, null, 2)}`;
  }

  function buildBaziSectionPrompt(chart, options = {}) {
    const subjectKind = options.subjectKind || "unknown";
    return `${LOCKED_RULES}${subjectRules(subjectKind)}

### NHIỆM VỤ PHẦN NÀY — TỨ TRỤ BÁT TỰ + NGŨ HÀNH
Không lặp 12 cung và chưa viết tổng kết cuối.

Viết đúng hai mục lớn:
## TỨ TRỤ BÁT TỰ
Đi theo thứ tự: 4 trụ → Nhật chủ → tháng lệnh/khí mùa → vượng suy → thiên can/địa chi → hợp/xung/hình/hại/phá nếu evidence có → Thập Thần → dụng/hỷ/kỵ chỉ khi evidence đủ → đại vận → sensitivity với giờ/tiết khí.
Không đếm số hành để kết luận vượng suy và không “thiếu hành nào bổ hành đó”.

## NGŨ HÀNH ÂM DƯƠNG
Phân tích cân bằng, hành tạo trợ lực/tiêu hao/kiểm soát; tách điều hòa khí hậu với cân bằng thân nếu evidence không đủ; nêu ứng dụng thực tế thận trọng.

### BAZI FACT/CALC KHÓA
${JSON.stringify(baziEvidence(chart), null, 2)}`;
  }

  function buildSynthesisSectionPrompt(chart, options = {}) {
    const subjectKind = options.subjectKind || "unknown";
    const localSummary = options.localSummary ? clip(options.localSummary, 900) : "Không có.";
    return `${LOCKED_RULES}${subjectRules(subjectKind)}

### NHIỆM VỤ PHẦN CUỐI
Không viết lại 12 cung. Tổng hợp trực tiếp từ evidence đã khóa, theo đúng thứ tự:

## ĐỐI CHIẾU TỬ VI ↔ BÁT TỰ ↔ NGŨ HÀNH
- điểm đồng thuận độc lập;
- điểm cùng phụ thuộc một tiền đề chung;
- điểm bất đồng và cách hạ confidence;
- quét Mệnh–Tài–Quan, Mệnh–Di, Mệnh–Thân, Phúc–Tài và các chuỗi Tứ Hóa lặp có sức cấu trúc.

## RED-TEAM / PHẢN BIỆN
Ít nhất 3 phản biện mạnh nhất đối với chính báo cáo: cherry-picking, một sao=verdict, formation thiếu điều kiện, trộn tầng vận, dependency Tử Vi–Bát Tự, SCHOOL khác. Nếu phản biện đúng phải sửa/hạ kết luận.

## TỔNG KẾT CUỐI
Nêu rõ: lõi mạnh nhất, rủi ro dễ lệch nhất, điều kiện biểu hiện tốt/xấu, chìa khóa phát triển. Không dùng lời sấm.

## HÀNH ĐỘNG THỰC TẾ
Tách góc nhìn truyền thống khỏi hành động thực tế; đưa 5–10 gợi ý cụ thể có thể làm được.

## 3–5 GÓC NHÌN DỄ BỎ SÓT
Chỉ chọn góc có thể làm đổi quyết định/hành vi; nêu trigger cần kiểm chứng.

### TÓM TẮT QUY TẮC CỤC BỘ
${localSummary}

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
    const minChars = job?.kind === "palaces" ? 1800 : 1500;
    if (value.length < minChars) issues.push(`Phần ${job?.id || "?"} quá ngắn (${value.length} ký tự).`);
    if (job?.includeDataQuality && !n.includes("data quality")) issues.push("Thiếu Data Quality Card.");
    if (job?.kind === "palaces") {
      for (const palace of job.palaces || []) {
        if (!n.includes(normalize(palace))) issues.push(`Thiếu cung ${palace}.`);
      }
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
    return `${originalPrompt}\n\n### QUALITY GATE — VIẾT LẠI CHỈ PHẦN NÀY\nBản trước chưa đạt vì:\n- ${issues.join("\n- ")}\n\nBẢN TRƯỚC ĐỂ NHẬN BIẾT LỖI:\n${String(priorText || "").slice(0, 1800)}\n\nViết lại phần này từ đầu, giữ nguyên FACT/CALC, đúng cấu trúc đã yêu cầu, không mở rộng sang phần khác.`;
  }

  // Compatibility: giữ API summary cũ cho rollback/cloud, nhưng luồng chính dùng full report.
  function buildSummaryPrompt(chart, options = {}) {
    return buildSynthesisSectionPrompt(chart || getChartFromRuntime(), options);
  }

  function buildBrowserSummaryPrompt(chart, options = {}) {
    return buildSynthesisSectionPrompt(chart || getChartFromRuntime(), options);
  }

  function validateSummary(text, options = {}) {
    const fakeJob = { id: "summary", kind: "synthesis" };
    const issues = validateFullReportSection(text, fakeJob);
    const minLength = Math.max(1200, Number(options.minLength || 1500));
    if (String(text || "").trim().length < minLength && !issues.some((x) => x.includes("quá ngắn"))) {
      issues.unshift(`Kết luận quá ngắn, cần >= ${minLength} ký tự.`);
    }
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
