"use strict";

/* Deterministic, offline interpretation. No network, model or external API. */
(function installOfflineReading() {
  const STAR_RULES = Object.freeze({
    "tu vi": ["khả năng quy tụ, tổ chức và chịu trách nhiệm", "tránh ôm quyền hoặc tự gây áp lực"],
    "thien co": ["tư duy linh hoạt, giỏi phân tích và cải tiến", "tránh đổi hướng liên tục hoặc suy nghĩ quá mức"],
    "thai duong": ["tính chủ động, minh bạch và thiên hướng dẫn dắt", "cần giữ nhịp nghỉ ngơi và lắng nghe người khác"],
    "vu khuc": ["thực tế, kỷ luật và nhạy với tài chính", "tránh quá cứng hoặc đánh giá mọi việc bằng hiệu quả"],
    "thien dong": ["khả năng thích nghi, kết nối và tạo không khí hòa thuận", "cần quyết đoán hơn khi mục tiêu đã rõ"],
    "liem trinh": ["ý thức nguyên tắc, danh dự và sức hút cá nhân", "cần tránh cực đoan hoặc phản ứng vì tự ái"],
    "thien phu": ["năng lực quản lý nguồn lực, ổn định và bao quát", "tránh an toàn quá mức làm chậm cơ hội"],
    "thai am": ["khả năng quan sát, tích lũy và làm việc chiều sâu", "cần nói rõ nhu cầu thay vì giữ trong lòng"],
    "tham lang": ["động lực trải nghiệm, giao tiếp và phát triển quan hệ", "cần giới hạn ham muốn và phân tán nguồn lực"],
    "cu mon": ["tư duy phản biện, ngôn ngữ và khả năng tìm điểm chưa rõ", "cần kiểm chứng trước khi tranh luận hoặc kết luận"],
    "thien tuong": ["khả năng phối hợp, bảo vệ chuẩn mực và hỗ trợ tập thể", "tránh lệ thuộc đánh giá của người khác"],
    "thien luong": ["tính thận trọng, tinh thần bảo hộ và định hướng bền vững", "tránh lo xa hoặc giữ tiêu chuẩn quá cứng"],
    "that sat": ["quyết đoán, chịu áp lực và xử lý tình huống khó", "cần có dữ liệu và phương án lui trước quyết định lớn"],
    "pha quan": ["khả năng phá khuôn, tái cấu trúc và bắt đầu lại", "cần thử nhỏ trước khi thay đổi mạnh"],
  });

  const ELEMENT_GUIDANCE = Object.freeze({
    "Kim": "ưu tiên kỷ luật, tiêu chuẩn và quyết định rõ ràng",
    "Mộc": "ưu tiên học hỏi, tăng trưởng đều và quan hệ hỗ trợ",
    "Thủy": "ưu tiên quan sát, thích nghi và kiểm soát dòng thông tin",
    "Hỏa": "ưu tiên hành động, truyền đạt và quản lý nhịp năng lượng",
    "Thổ": "ưu tiên nền tảng, tính ổn định và hoàn thành từng bước",
  });

  const PALACE_TOPICS = Object.freeze([
    ["mệnh", "Bản thân"],
    ["quan lộc", "Công việc"],
    ["tài bạch", "Tài chính"],
    ["phu thê", "Tình cảm"],
    ["phúc đức", "Nền tảng tinh thần"],
    ["tật ách", "Sức khỏe và thói quen"],
    ["thiên di", "Môi trường bên ngoài"],
  ]);

  function normalize(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .toLocaleLowerCase("vi")
      .trim();
  }

  function escapeHtml(value) {
    return String(value ?? "—").replace(/[&<>'"]/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
    })[char]);
  }

  function listNames(stars) {
    return (stars || []).map((star) => String(star?.saoTen || star?.name || "").trim()).filter(Boolean);
  }

  function findPalace(chart, name) {
    const target = normalize(name);
    return (chart?.palaces || []).find((palace) => normalize(palace?.palace_name) === target) || null;
  }

  function starGuidance(stars) {
    const names = listNames(stars);
    const rules = names.map((name) => STAR_RULES[normalize(name)]).filter(Boolean);
    if (!rules.length) {
      return {
        names: names.length ? names.join(", ") : "Vô chính diệu",
        strength: "cần đọc thêm các sao hỗ trợ và đối cung trước khi kết luận",
        caution: "không nên dựa vào một dấu hiệu đơn lẻ",
      };
    }
    return {
      names: names.join(", "),
      strength: rules.slice(0, 2).map((rule) => rule[0]).join("; "),
      caution: rules.slice(0, 2).map((rule) => rule[1]).join("; "),
    };
  }

  function palaceEvidence(palace) {
    if (!palace) return null;
    const stars = palace.stars || [];
    const majors = stars.filter((star) => star?.nature === "main");
    const good = stars.filter((star) => star?.nature === "good").length;
    const bad = stars.filter((star) => star?.nature === "bad").length;
    const guidance = starGuidance(majors);
    const blockers = [palace.has_tuan ? "Tuần" : "", palace.has_triet ? "Triệt" : ""].filter(Boolean);
    return {
      palace: palace.palace_name,
      branch: palace.branch_name,
      majors: guidance.names,
      strength: guidance.strength,
      caution: guidance.caution,
      balance: good === bad ? "yếu tố thuận và thách thức tương đối cân bằng"
        : good > bad ? `tín hiệu hỗ trợ nhiều hơn (${good}/${bad})`
          : `tín hiệu cần thận trọng nhiều hơn (${good}/${bad})`,
      blockers: blockers.join(" và "),
    };
  }

  function baziSummary(chart) {
    const bazi = chart?.bazi || {};
    const master = bazi.day_master || {};
    const balance = bazi.element_balance || {};
    const balancing = Array.isArray(master.balancing_elements_preliminary)
      ? master.balancing_elements_preliminary.join(", ") : "chưa xác định";
    const element = master.element || "chưa xác định";
    return {
      title: "Bát Tự và Ngũ Hành",
      text: `Nhật chủ ${master.stem || "—"} ${element}, ${master.yin_yang || "—"}; mức sơ bộ: ${master.preliminary_strength || "—"}${master.support_ratio_percent != null ? `, trợ lực ${master.support_ratio_percent}%` : ""}. Hành vượng: ${balance.dominant || "—"}; hành yếu: ${balance.weakest || "—"}; nhóm cân bằng tham khảo: ${balancing}.`,
      action: ELEMENT_GUIDANCE[element] || "giữ lịch sinh hoạt và quyết định theo dữ liệu thực tế",
    };
  }

  function annualSummary(chart) {
    const favorable = [];
    const challenging = [];
    for (const palace of chart?.palaces || []) {
      const good = (palace.annual_stars || []).filter((star) => star?.nature === "good");
      const bad = (palace.annual_stars || []).filter((star) => star?.nature === "bad");
      if (good.length) favorable.push(`${palace.palace_name}: ${listNames(good).slice(0, 3).join(", ")}`);
      if (bad.length) challenging.push(`${palace.palace_name}: ${listNames(bad).slice(0, 3).join(", ")}`);
    }
    const year = chart?.annual?.year || chart?.heaven?.annual_year || "năm đang xem";
    return {
      title: `Lưu niên ${year}`,
      text: `Điểm thuận nổi bật: ${favorable.slice(0, 3).join("; ") || "chưa có dữ liệu sao tốt"}. Điểm cần kiểm soát: ${challenging.slice(0, 3).join("; ") || "chưa có dữ liệu sao xấu"}.`,
      action: "chỉ tăng cam kết khi dữ liệu thực tế xác nhận; với việc lớn nên có mốc kiểm tra và phương án lui",
    };
  }

  function buildOfflineReading(chart) {
    if (!chart?.heaven || !Array.isArray(chart?.palaces)) throw new Error("Dữ liệu lá số chưa đầy đủ.");
    const heaven = chart.heaven;
    const sections = [];
    sections.push({
      title: "Kết luận chính",
      text: `${heaven.name || "Lá số"}: ${heaven.am_duong_menh || "—"}, bản mệnh ${heaven.ban_menh || "—"}, ${heaven.cuc || "—"}; quan hệ Mệnh–Cục: ${heaven.menh_cuc_relation || "—"}. Thân cư ${heaven.than_cu || heaven.than_palace || "—"}, nên ưu tiên lĩnh vực này khi phân bổ thời gian và trách nhiệm.`,
    });

    for (const [palaceName, title] of PALACE_TOPICS) {
      const evidence = palaceEvidence(findPalace(chart, palaceName));
      if (!evidence) continue;
      sections.push({
        title,
        text: `${evidence.palace} tại ${evidence.branch}; chính tinh: ${evidence.majors}. Khuynh hướng: ${evidence.strength}. Lưu ý: ${evidence.caution}; ${evidence.balance}${evidence.blockers ? `; có ${evidence.blockers}, nên chậm lại và kiểm chứng` : ""}.`,
      });
    }

    sections.push(baziSummary(chart));
    sections.push(annualSummary(chart));

    const actions = [
      `Trong 90 ngày: ${baziSummary(chart).action}.`,
      "Với tiền bạc và công việc: đặt giới hạn rủi ro, lưu số liệu và đánh giá lại theo tháng.",
      "Với sức khỏe và quan hệ: dùng lá số như câu hỏi gợi mở; quyết định thực tế dựa trên bác sĩ, chuyên gia và trao đổi trực tiếp.",
    ];
    return { sections, actions, generatedBy: "Bộ quy tắc cục bộ v1.18" };
  }

  function readingToText(reading) {
    const body = reading.sections.map((section) => `${section.title.toUpperCase()}\n${section.text}`).join("\n\n");
    return `${body}\n\nHÀNH ĐỘNG ĐỀ XUẤT\n${reading.actions.map((item, index) => `${index + 1}. ${item}`).join("\n")}\n\n${reading.generatedBy} · Chỉ dùng tham khảo.`;
  }

  function renderOfflineSummary(chart) {
    const output = document.getElementById("geminiOutput");
    const panel = document.getElementById("geminiResultPanel");
    if (!output || !panel) return;
    try {
      const reading = buildOfflineReading(chart);
      const heading = panel.querySelector("h2");
      const kicker = panel.querySelector(".section-kicker");
      const tag = panel.querySelector(".tag");
      const actions = panel.querySelector(".inline-gemini-actions");
      if (heading) heading.textContent = "Tổng luận cục bộ";
      if (kicker) kicker.textContent = "KHÔNG MẠNG · KHÔNG GỬI DỮ LIỆU";
      if (tag) tag.textContent = "Quy tắc cố định v1.18";
      if (actions) actions.hidden = true;
      output.dataset.raw = readingToText(reading);
      output.innerHTML = `
        <div class="ai-meta offline-meta">Tạo ngay trên thiết bị · Không dùng Gemini/API</div>
        <div class="offline-reading">
          ${reading.sections.map((section) => `<section class="offline-section"><h3>${escapeHtml(section.title)}</h3><p>${escapeHtml(section.text)}</p></section>`).join("")}
          <section class="offline-actions"><h3>3 hành động đề xuất</h3><ol>${reading.actions.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol></section>
          <p class="offline-disclaimer">Tổng luận theo quy tắc cố định, chỉ dùng tham khảo; không thay thế tư vấn y tế, pháp lý hoặc tài chính.</p>
        </div>`;
    } catch (error) {
      output.textContent = `Không tạo được tổng luận cục bộ: ${error.message}`;
    }
  }

  window.OfflineReading = Object.freeze({ buildOfflineReading, readingToText, normalize });
  window.renderOfflineSummary = renderOfflineSummary;
})();

