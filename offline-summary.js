"use strict";

/*
 * Hiep TuVi deterministic full report.
 * This is the guaranteed fallback when WebGPU/LLM is unavailable.
 * FACT/CALC comes only from tuvi111. Knowledge rules only interpret locked facts.
 */
(function installOfflineReading() {
  const VERSION = "2.2.0";
  const PALACE_ORDER = Object.freeze([
    "Mệnh", "Phụ Mẫu", "Phúc Đức", "Điền Trạch", "Quan Lộc", "Nô Bộc",
    "Thiên Di", "Tật Ách", "Tài Bạch", "Tử Tức", "Phu Thê", "Huynh Đệ",
  ]);
  const ROMAN = Object.freeze(["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"]);

  const PALACE_PRACTICAL = Object.freeze({
    "Mệnh": "Cần nhìn cách cá nhân vận hành trước áp lực, cách ra quyết định và khả năng tự điều chỉnh; không biến một tính chất sao thành nhãn tính cách cố định.",
    "Phụ Mẫu": "Nên chú ý cách trao đổi kỳ vọng, ranh giới và hỗ trợ giữa các thế hệ hơn là phán tốt/xấu quan hệ gia đình.",
    "Phúc Đức": "Nên đọc như nền tinh thần, khả năng hồi phục và mô thức gia đình; tránh quy kết nghiệp hay nguyên nhân siêu hình như sự thật.",
    "Điền Trạch": "Nên tách khả năng tạo tài sản, giữ tài sản và thay đổi môi trường sống; không đồng nhất một sao với việc chắc chắn có nhiều hay ít nhà đất.",
    "Quan Lộc": "Nên đọc phương thức làm việc, kiểu trách nhiệm và môi trường nghề phù hợp; không dùng lá số để khóa cứng một nghề duy nhất.",
    "Nô Bộc": "Nên quản kỳ vọng, quyền hạn và chất lượng mạng hỗ trợ; không suy lòng trung thành hay ý đồ của người khác từ lá số.",
    "Thiên Di": "Nên so cách biểu hiện bên ngoài với Mệnh: ra môi trường mới có được kích hoạt, hỗ trợ hay tạo ma sát khác nền gốc hay không.",
    "Tật Ách": "Chỉ dùng như ngôn ngữ truyền thống về áp lực và thói quen; mọi vấn đề sức khỏe thực tế phải dựa trên y khoa.",
    "Tài Bạch": "Nên tách năng lực tạo nguồn lực, giữ nguồn lực và chịu rủi ro; không dùng một sao để kết luận giàu nghèo.",
    "Tử Tức": "Có thể đọc thêm như cách tương tác với thế hệ sau và những dự án/đầu ra do mình tạo ra; không phán khả năng sinh sản hay giới tính con.",
    "Phu Thê": "Nên đọc mẫu tương tác, nhu cầu và điểm dễ ma sát trong quan hệ; không suy ngoại tình, đạo đức hay ý định của người khác.",
    "Huynh Đệ": "Nên đọc cấu trúc hỗ trợ và cạnh tranh với anh chị em/người ngang hàng; đặc biệt chú ý cơ chế so sánh, vai trò và ranh giới.",
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

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[char]);
  }

  function kb() {
    return window.HiepTuViKBData || {};
  }

  function starName(star) {
    return String(star?.saoTen || star?.name || star?.label || "").trim();
  }

  function listNames(items) {
    return (items || []).map(starName).filter(Boolean);
  }

  function unique(values) {
    return [...new Set((values || []).filter(Boolean))];
  }

  function findPalace(chart, name) {
    const target = normalize(name);
    return (chart?.palaces || []).find((palace) => normalize(palace?.palace_name) === target) || null;
  }

  function starRule(name) {
    const target = normalize(name);
    return (kb().stars || []).find((rule) => normalize(rule?.name) === target) || null;
  }

  function palaceRule(name) {
    const target = normalize(name);
    return (kb().palaces || []).find((rule) => normalize(rule?.name) === target) || null;
  }

  function relationFor(chart, palace) {
    if (!palace) return null;
    return chart?.relations?.[String(palace.branch_id)] || chart?.palace_relations?.[String(palace.branch_id)] || null;
  }

  function detailsNames(items) {
    return unique((items || []).map(starName).filter(Boolean));
  }

  function nodeStarNames(node) {
    if (!node) return [];
    return unique([
      ...detailsNames(node.major_star_details),
      ...detailsNames(node.transformation_details),
      ...detailsNames(node.good_star_details),
      ...detailsNames(node.bad_star_details),
      starName(node.trang_sinh_detail),
    ]);
  }

  function nodeSummary(node) {
    if (!node) return "chưa có dữ liệu";
    const names = nodeStarNames(node).slice(0, 7);
    const flags = [node.tuan ? "Tuần" : "", node.triet ? "Triệt" : ""].filter(Boolean);
    return `${node.palace || "?"} tại ${node.branch || "?"}${names.length ? `: ${names.join(", ")}` : ""}${flags.length ? `; ${flags.join(" + ")}` : ""}`;
  }

  function majorStars(palace) {
    return (palace?.stars || []).filter((star) => star?.nature === "main");
  }

  function transformationStars(palace) {
    return (palace?.stars || []).filter((star) => star?.nature === "transformation" || /^Hóa\s/i.test(starName(star)));
  }

  function trangSinhStar(palace) {
    return (palace?.stars || []).find((star) => star?.nature === "trang_sinh"
      || (kb().trangSinh?.cycle || []).some((name) => normalize(name) === normalize(starName(star)))) || null;
  }

  function supportStars(palace) {
    return (palace?.stars || []).filter((star) => {
      const rule = starRule(starName(star));
      return star?.nature === "good" || ["support", "resource", "social"].includes(rule?.group);
    });
  }

  function pressureStars(palace) {
    return (palace?.stars || []).filter((star) => {
      const rule = starRule(starName(star));
      return star?.nature === "bad" || rule?.group === "pressure" || normalize(starName(star)) === "hoa ky";
    });
  }

  function displayStar(star) {
    const name = starName(star);
    const dignity = String(star?.saoDacTinh || star?.dignity || "").trim();
    return dignity ? `${name} (${dignity})` : name;
  }

  function importantStarLine(palace) {
    const ordered = [
      ...majorStars(palace),
      ...transformationStars(palace),
      ...pressureStars(palace),
      ...supportStars(palace),
      ...(trangSinhStar(palace) ? [trangSinhStar(palace)] : []),
      ...(palace?.stars || []),
    ];
    const seen = new Set();
    const tokens = [];
    for (const star of ordered) {
      const key = normalize(starName(star));
      if (!key || seen.has(key)) continue;
      seen.add(key);
      tokens.push(displayStar(star));
      if (tokens.length >= 8) break;
    }
    return tokens.length ? tokens.join(" – ") : "Vô Chính Diệu – cần mượn đối cung và tam phương để đọc";
  }

  function facetsForRule(rule, limit = 5) {
    if (!rule?.native_meaning) return [];
    return String(rule.native_meaning)
      .replace(/[.;]+$/g, "")
      .split(/[,;]/)
      .map((part) => part.trim().replace(/^và\s+/i, ""))
      .filter(Boolean)
      .slice(0, limit);
  }

  function transformationMeaning(name) {
    const fromStar = starRule(name)?.native_meaning;
    if (fromStar) return fromStar;
    const item = (kb().tuHoa?.transformations || []).find((entry) => normalize(entry.name) === normalize(name));
    return item?.native || "là một modifier Tứ Hóa; phải đọc theo node và cấu trúc liên quan.";
  }

  function allGeometryStarNames(chart, palace) {
    const rel = relationFor(chart, palace);
    return new Set(unique([
      ...listNames(palace?.stars),
      ...nodeStarNames(rel?.self),
      ...nodeStarNames(rel?.opposite),
      ...(rel?.trine || []).flatMap(nodeStarNames),
      ...(rel?.adjacent || []).flatMap(nodeStarNames),
      ...nodeStarNames(rel?.six_harmony),
    ]).map(normalize));
  }

  function relevantCombos(chart, palace) {
    const names = allGeometryStarNames(chart, palace);
    return (kb().combinations || []).map((combo) => {
      const members = combo.mandatory_members || [];
      const present = members.filter((name) => names.has(normalize(name)));
      if (present.length < Number(combo.retrieval_min || 2)) return null;
      return {
        ...combo,
        present,
        status: present.length === members.length ? "complete" : "partial",
      };
    }).filter(Boolean).slice(0, 4);
  }

  function structureOpening(palace) {
    const good = supportStars(palace).length;
    const pressure = pressureStars(palace).length;
    const transforms = transformationStars(palace).map((star) => normalize(starName(star)));
    if (transforms.includes("hoa ky") && pressure >= good) {
      return "Đây là một điểm cần quản trị tương đối rõ của nguyên cục. Không phải vì một sao riêng lẻ, mà vì nhiều tín hiệu đang cùng dồn vào một node.";
    }
    if (pressure >= good + 2) {
      return "Đây là cung có áp lực cấu trúc khá rõ. Tuy nhiên không nên quy thành tốt/xấu tuyệt đối; cần xem thứ gì đang bị gây sức ép và có lực cứu/chế nào đi kèm.";
    }
    if (good >= pressure + 2) {
      return "Đây là cung có nền hỗ trợ đáng kể, nhưng điểm mạnh chỉ thực sự có giá trị khi tam phương, Tứ Hóa và Tuần/Triệt không phá lõi.";
    }
    return "Đây là một cấu trúc pha trộn: có lực hỗ trợ và lực gây ma sát cùng tồn tại. Vì vậy kết luận phải dựa trên cơ chế phối hợp, không dựa vào đếm sao tốt/xấu.";
  }

  function majorStarMarkdown(palace) {
    const majors = majorStars(palace);
    if (!majors.length) {
      return [
        "Cung này **Vô Chính Diệu** theo dữ liệu engine.",
        "",
        "Không được đọc là ‘cung trống’. Trọng tâm phải chuyển sang **đối cung + hai cung tam hợp + Tứ Hóa + Tuần/Triệt** để xác định cấu trúc mượn lực.",
      ].join("\n");
    }

    const blocks = [];
    for (const star of majors.slice(0, 2)) {
      const rule = starRule(starName(star));
      const dignity = String(star?.saoDacTinh || star?.dignity || "").trim();
      blocks.push(`**${starName(star)}${dignity ? ` ${dignity.toLowerCase()}` : ""}** là lớp chính của cung này.`);
      if (rule) {
        const facets = facetsForRule(rule, 5);
        if (facets.length) {
          blocks.push("", `${starName(star)} liên quan:`, "", ...facets.map((item) => `- ${item};`));
        }
        if (rule.exceptions?.length) blocks.push("", `Không nên suy quá mức: ${rule.exceptions[0]}`);
      } else {
        blocks.push("", "Knowledge Base chưa có rule chuyên biệt cho sao này; giữ sao như evidence và hạ mức chắc chắn thay vì tự bịa nghĩa.");
      }
    }
    return blocks.join("\n");
  }

  function transformationMarkdown(palace) {
    const transforms = transformationStars(palace);
    if (!transforms.length) return "";
    const majors = majorStars(palace);
    const majorText = majors.length ? majors.map((star) => displayStar(star)).join(" + ") : "cấu trúc Vô Chính Diệu";
    const lines = [
      "Điểm phải ưu tiên tiếp theo là **Tứ Hóa tại chính node này**.",
      "",
    ];
    for (const star of transforms) {
      lines.push(`- **${starName(star)}**: ${transformationMeaning(starName(star))}`);
    }
    lines.push("", `Vì vậy không nên chỉ nói “${majorText} tốt/xấu”. Phải đọc ${majorText} **cùng** ${transforms.map((s) => starName(s)).join(" + ")} và sau đó mới nối sang tam phương/đối cung.`);
    return lines.join("\n");
  }

  function auxiliaryMarkdown(palace) {
    const majors = new Set(majorStars(palace).map((star) => normalize(starName(star))));
    const transforms = new Set(transformationStars(palace).map((star) => normalize(starName(star))));
    const ts = normalize(starName(trangSinhStar(palace)));
    const support = unique(supportStars(palace).map(starName)).filter((name) => !majors.has(normalize(name)) && !transforms.has(normalize(name)) && normalize(name) !== ts);
    const pressure = unique(pressureStars(palace).map(starName)).filter((name) => !majors.has(normalize(name)) && !transforms.has(normalize(name)) && normalize(name) !== ts);
    const lines = [];
    if (support.length) {
      lines.push(`**Lực hỗ trợ:** ${support.slice(0, 7).join(" + ")}.`);
      const known = support.slice(0, 3).map((name) => starRule(name)).filter(Boolean);
      if (known.length) lines.push(`Nhóm này bổ sung các cơ chế như ${known.map((rule) => rule.native_meaning.replace(/[.]$/g, "").toLocaleLowerCase("vi")).join("; ")}.`);
    }
    if (pressure.length) {
      lines.push(`**Lực gây ma sát:** ${pressure.slice(0, 7).join(" + ")}.`);
      const known = pressure.slice(0, 3).map((name) => starRule(name)).filter(Boolean);
      if (known.length) lines.push(`Điểm cần quản chủ yếu là ${known.map((rule) => rule.native_meaning.replace(/[.]$/g, "").toLocaleLowerCase("vi")).join("; ")}.`);
    }
    return lines.join("\n\n");
  }

  function trangSinhMarkdown(palace) {
    const star = trangSinhStar(palace);
    if (!star) return "";
    return `**Vòng Tràng Sinh: ${starName(star)}.** Đây là pha khí/nhịp phát triển của cung, chỉ dùng để điều chỉnh cách biểu hiện. ${["Tử", "Tuyệt"].includes(starName(star)) ? "Không được đồng nhất pha này với tai họa." : starName(star) === "Đế Vượng" ? "Không được đồng nhất Đế Vượng với đại cát tự động." : "Không để Tràng Sinh lấn át chính tinh, Tứ Hóa và tam phương."}`;
  }

  function relationMarkdown(chart, palace) {
    const rel = relationFor(chart, palace);
    if (!rel) return "**Quan hệ cung:** engine chưa cung cấp relation stack cho cung này; giữ trạng thái INSUFFICIENT thay vì tự dựng hình học.";
    const trine = (rel.trine || []).map(nodeSummary).join(" | ") || "chưa có dữ liệu";
    const opposite = nodeSummary(rel.opposite);
    const six = rel.six_harmony ? nodeSummary(rel.six_harmony) : "chưa có dữ liệu";
    const adjacent = (rel.adjacent || []).map(nodeSummary).join(" | ") || "chưa có dữ liệu";
    return [
      `**Tam phương tứ chính:** ${trine}.`,
      `**Đối cung:** ${opposite}.`,
      `**Nhị hợp:** ${six}.`,
      `**Giáp cung:** ${adjacent}.`,
    ].join("\n\n");
  }

  function comboMarkdown(chart, palace) {
    const combos = relevantCombos(chart, palace);
    if (!combos.length) return "";
    const lines = ["**Bộ sao/cách cục cần kiểm tra:**"];
    for (const combo of combos) {
      lines.push(`- **${combo.name} — ${combo.status}**: hiện thấy ${combo.present.join(" + ")}. ${combo.core_function} Trạng thái này chỉ là kiểm tra thành viên; hình học/SCHOOL vẫn phải đúng trước khi gọi ‘thành cách’.`);
    }
    return lines.join("\n");
  }

  function blockersMarkdown(palace) {
    const flags = [palace?.has_tuan ? "Tuần" : "", palace?.has_triet ? "Triệt" : ""].filter(Boolean);
    if (!flags.length) return "";
    return `**${flags.join(" + ")}** đang tác động tại cung. Đọc như bộ điều biến nhịp và tính liên tục: có thể làm chậm, ngắt hoặc đổi cách biểu hiện của cả phần thuận lẫn phần nghịch; không được dùng như ‘nút xóa sao’.`;
  }

  function bodyMarkdown(chart, palace) {
    const than = chart?.heaven?.than_cu || chart?.heaven?.than_palace || "";
    if (!than) return "";
    if (normalize(than) === normalize(palace?.palace_name)) {
      return `**Thân cư ${than}** làm cung này tăng trọng số thực hành trong đời sống: kết luận ở đây phải được nối ngược về Mệnh thay vì đọc độc lập.`;
    }
    if (normalize(palace?.palace_name) === "menh") {
      return `**Mệnh–Thân:** Thân cư ${than}. Vì vậy Mệnh cho nền vận hành, còn cung ${than} cho nơi nền đó được đưa vào thực tế; hai lớp phải được đối chiếu trước kết luận cuối.`;
    }
    return "";
  }

  function specialConclusion(palace) {
    const names = new Set(listNames(palace?.stars).map(normalize));
    if (normalize(palace?.palace_name) === "huynh de" && names.has("thai duong") && names.has("hoa ky")) {
      return "**có tình cảm và nhu cầu gắn kết, nhưng tính cạnh tranh/so sánh về vai trò, mức được công nhận và mức được chú ý cần được quản.**";
    }
    return "";
  }

  function conclusionForPalace(palace) {
    const special = specialConclusion(palace);
    if (special) return special;
    const rule = palaceRule(palace?.palace_name);
    const majors = majorStars(palace);
    const transforms = transformationStars(palace);
    const pressure = pressureStars(palace);
    const support = supportStars(palace);
    const core = majors.length
      ? majors.map((star) => starRule(starName(star))?.native_meaning || starName(star)).join("; ")
      : "phải mượn đối cung và tam phương vì Vô Chính Diệu";
    const modifier = transforms.length ? ` Tứ Hóa tại cung (${transforms.map(starName).join(", ")}) là modifier mạnh và phải được ưu tiên.` : "";
    const balance = pressure.length > support.length
      ? " Cấu trúc hiện có nhiều điểm gây ma sát hơn lực hỗ trợ trực tiếp, nên ưu tiên quản rủi ro và phản ứng." 
      : support.length > pressure.length ? " Lực hỗ trợ hiện nổi hơn, nhưng chỉ giữ kết luận thuận khi tam phương không phản chứng." 
        : " Lực hỗ trợ và ma sát đan xen, nên tránh kết luận một chiều.";
    return `**${rule?.theme || PALACE_PRACTICAL[palace?.palace_name] || "Cung này"}** Cơ chế lõi hiện thấy: ${core}.${modifier}${balance}`;
  }

  function buildPalaceSection(chart, palaceName, index) {
    const palace = findPalace(chart, palaceName);
    if (!palace) {
      return `## ${ROMAN[index]}. CUNG ${palaceName.toLocaleUpperCase("vi")} – CHƯA CÓ DỮ LIỆU\n\nEngine chưa trả cung này; không tự bịa dữ liệu.`;
    }
    const branch = String(palace.branch_name || "?").toLocaleUpperCase("vi");
    const title = `## ${ROMAN[index]}. CUNG ${String(palace.palace_name || palaceName).toLocaleUpperCase("vi")} – ${branch}`;
    const subtitle = `### ${importantStarLine(palace)}`;
    const palaceInfo = palaceRule(palace.palace_name);
    const parts = [
      title,
      "",
      subtitle,
      "",
      structureOpening(palace),
      "",
      palaceInfo?.theme ? `**Phạm vi cung:** ${palaceInfo.theme}` : "",
      PALACE_PRACTICAL[palace.palace_name] || "",
      "",
      majorStarMarkdown(palace),
      "",
      transformationMarkdown(palace),
      "",
      auxiliaryMarkdown(palace),
      "",
      trangSinhMarkdown(palace),
      "",
      comboMarkdown(chart, palace),
      "",
      relationMarkdown(chart, palace),
      "",
      blockersMarkdown(palace),
      "",
      bodyMarkdown(chart, palace),
      "",
      `> **Kết luận cung:** ${conclusionForPalace(palace)}`,
    ].filter((part) => part !== "");
    return parts.join("\n");
  }

  function dataQualitySection(chart) {
    const h = chart?.heaven || {};
    const known = [h.input_time, h.chart_lunar_date, h.gender].filter(Boolean).length;
    const dq = 70 + known * 8;
    return [
      "# HIEP TUVI – BÁO CÁO CỤC BỘ ĐẦY ĐỦ",
      "",
      "## DATA QUALITY CARD",
      "",
      `- Ngày/giờ và lịch quy đổi: ${h.input_time || h.chart_lunar_date ? "có dữ liệu từ engine" : "chưa đủ"}.`,
      `- Giới tính: ${h.gender || "chưa rõ"}.`,
      `- Nơi sinh/giờ mặt trời: ${h.location || h.birth_place ? "có dữ liệu" : "không có trong chart; phần mềm dùng quy tắc giờ đã khóa"}.`,
      `- FACT/CALC: **khóa theo tuvi111**; Knowledge Base chỉ diễn giải, không được tự an lại sao.`,
      `- DQ tham khảo: **${Math.min(98, dq)}/100** — chỉ phản ánh độ đầy đủ đầu vào, không phải xác suất dự đoán đúng.`,
      "",
      `**Nền tổng quát:** ${h.am_duong_menh || "—"}; bản mệnh ${h.ban_menh || "—"}; ${h.cuc || "—"}; quan hệ Mệnh–Cục: ${h.menh_cuc_relation || "—"}; Thân cư ${h.than_cu || h.than_palace || "—"}.`,
    ].join("\n");
  }

  function baziSection(chart) {
    const b = chart?.bazi || {};
    const dm = b.day_master || {};
    const balance = b.element_balance || {};
    const pillars = Array.isArray(b.pillars) ? b.pillars.map((item) => typeof item === "string" ? item : (item?.text || item?.can_chi || JSON.stringify(item))).join(" – ") : "chưa đủ dữ liệu";
    const balancing = Array.isArray(dm.balancing_elements_preliminary) ? dm.balancing_elements_preliminary.join(", ") : "chưa xác định";
    const interactions = b.interactions || b.branch_interactions || b.stem_interactions || null;
    const tenGods = b.ten_gods || b.ten_god_summary || null;
    return [
      "## XIII. TỨ TRỤ BÁT TỰ – NGŨ HÀNH",
      "",
      `### ${pillars}`,
      "",
      `**Nhật chủ:** ${dm.stem || "—"} ${dm.element || "—"}, ${dm.yin_yang || "—"}. Mức sơ bộ: ${dm.preliminary_strength || "—"}${dm.support_ratio_percent != null ? `; trợ lực ${dm.support_ratio_percent}%` : ""}.`,
      "",
      `**Khí mùa/tháng lệnh:** ${b.month_method_name || b.month_basis_label || "engine chưa trả chi tiết"}. Không được đếm số hành một cách cơ học để kết luận vượng/suy.`,
      "",
      `**Ngũ Hành:** hành nổi trội ${balance.dominant || "—"}; hành yếu ${balance.weakest || "—"}; nhóm cân bằng sơ bộ ${balancing}. Đây không phải quy tắc “thiếu hành nào bổ hành đó”.`,
      "",
      `**Tương tác Can Chi:** ${interactions ? JSON.stringify(interactions).slice(0, 800) : "chưa có dữ liệu chi tiết; không tự dựng hợp/xung/hình/hại/phá"}.`,
      "",
      `**Thập Thần:** ${tenGods ? JSON.stringify(tenGods).slice(0, 800) : "chưa có dữ liệu đủ để kết luận sâu"}.`,
      "",
      "> **Kết luận Bát Tự:** dùng như một hệ đối chiếu độc lập tương đối. Nếu kết luận giống Tử Vi chỉ vì cùng dùng Ngũ Hành, không được tính là hai bằng chứng độc lập.",
    ].join("\n");
  }

  function annualSection(chart) {
    const favorable = [];
    const challenging = [];
    for (const palace of chart?.palaces || []) {
      const good = (palace.annual_stars || []).filter((star) => star?.nature === "good");
      const bad = (palace.annual_stars || []).filter((star) => star?.nature === "bad");
      if (good.length) favorable.push(`${palace.palace_name}: ${listNames(good).slice(0, 4).join(", ")}`);
      if (bad.length) challenging.push(`${palace.palace_name}: ${listNames(bad).slice(0, 4).join(", ")}`);
    }
    const year = chart?.annual?.year || chart?.heaven?.annual_year || "năm đang xem";
    return [
      `## XIV. LƯU NIÊN ${year}`,
      "",
      `**Tín hiệu thuận:** ${favorable.slice(0, 5).join("; ") || "chưa có dữ liệu lưu tinh thuận"}.`,
      "",
      `**Tín hiệu cần kiểm soát:** ${challenging.slice(0, 5).join("; ") || "chưa có dữ liệu lưu tinh gây áp lực"}.`,
      "",
      "> Nguyên cục là nền; lưu niên chỉ là lớp kích hoạt. Không dùng một lưu tinh để dự báo sự kiện bắt buộc.",
    ].join("\n");
  }

  function synthesisSection(chart) {
    const h = chart?.heaven || {};
    const signals = chart?.combined_analysis?.cross_system_signals;
    const cross = Array.isArray(signals) && signals.length
      ? signals.slice(0, 6).map((signal) => `- ${signal.relation || signal.type || "đối chiếu"}: ${signal.tu_vi || signal.tuvi || ""} ${signal.bat_tu || signal.bazi || ""}`.trim()).join("\n")
      : "- Chưa có cross-system signal đủ cấu trúc; giữ hai hệ song song thay vì ép chúng đồng thuận.";
    return [
      "## XV. ĐỐI CHIẾU – PHẢN BIỆN – KẾT LUẬN",
      "",
      "### Đối chiếu Tử Vi ↔ Bát Tự ↔ Ngũ Hành",
      "",
      cross,
      "",
      "### Red-team bắt buộc",
      "",
      "1. Không dùng một sao = một kết luận.",
      "2. Không gọi một bộ sao là ‘thành cách’ khi mới chỉ thấy vài thành viên hoặc chưa xác minh hình học.",
      "3. Không trộn nguyên cục với lưu niên để làm kết luận có vẻ mạnh hơn.",
      "4. Không đếm sao tốt/xấu rồi lấy đa số.",
      "5. Nếu dữ kiện đời thực phủ định diễn giải truyền thống, ưu tiên dữ kiện đời thực.",
      "",
      "### Tổng kết cuối",
      "",
      `Trục cần đọc đầu tiên vẫn là **Mệnh → Tài Bạch → Quan Lộc → Thiên Di → cung Thân (${h.than_cu || h.than_palace || "chưa rõ"})**. Sau đó mới dùng Phúc–Di–Phu và Điền–Tật–Huynh để kiểm tra các chủ đề lặp. Kết luận mạnh chỉ giữ khi cùng một cơ chế sống sót qua tam phương, Tứ Hóa, Tuần/Triệt và phản biện.`,
      "",
      "### 3 hành động thực tế",
      "",
      "1. Chọn 1–2 chủ đề nổi bật từ lá số và đối chiếu với dữ kiện thật trong 90 ngày, thay vì cố chứng minh mọi câu luận đều đúng.",
      "2. Với công việc/tiền bạc: dùng số liệu, giới hạn rủi ro và mốc đánh giá lại; huyền học chỉ là lớp gợi ý câu hỏi.",
      "3. Với sức khỏe/quan hệ: dùng trao đổi trực tiếp và chuyên gia phù hợp; không dùng lá số để chẩn đoán hoặc quy kết người khác.",
      "",
      "### Góc nhìn dễ bỏ sót",
      "",
      "- Cùng một cấu trúc có thể biểu hiện khác nhau khi môi trường, giáo dục và quyền lựa chọn thay đổi.",
      "- Một cung có nhiều sát tinh chưa chắc là ‘xấu’ nếu chúng tạo áp lực cho đúng loại năng lực cần rèn và có cơ chế chế hóa.",
      "- Một cung nhiều cát tinh chưa chắc tạo kết quả nếu thiếu hành động, kỹ năng hoặc điều kiện thực tế tương ứng.",
      "- Bất đồng giữa Tử Vi và Bát Tự là thông tin cần giữ lại, không phải lỗi phải ép cho khớp.",
    ].join("\n");
  }

  function buildOfflineReading(chart) {
    if (!chart?.heaven || !Array.isArray(chart?.palaces)) throw new Error("Dữ liệu lá số chưa đầy đủ.");
    const sections = [dataQualitySection(chart)];
    PALACE_ORDER.forEach((name, index) => sections.push(buildPalaceSection(chart, name, index)));
    sections.push(baziSection(chart));
    sections.push(annualSection(chart));
    sections.push(synthesisSection(chart));
    return {
      sections,
      actions: [],
      markdown: sections.join("\n\n---\n\n"),
      generatedBy: `Hiep TuVi Local Rules v${VERSION}`,
      mode: "deterministic_full_report",
    };
  }

  function readingToText(reading) {
    return `${reading.markdown || (reading.sections || []).join("\n\n")}\n\n${reading.generatedBy} · FACT/CALC khóa theo tuvi111 · Chỉ dùng tham khảo.`;
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
      if (heading) heading.textContent = "Hiep TuVi — báo cáo cục bộ đầy đủ";
      if (kicker) kicker.textContent = "12 CUNG · BÁT TỰ · PHẢN BIỆN · KHÔNG CẦN GPU";
      if (tag) tag.textContent = "LOCAL RULES v2.2";
      if (actions) actions.hidden = false;
      output.dataset.raw = readingToText(reading);
      const rendered = typeof window.renderMarkdownSafe === "function"
        ? window.renderMarkdownSafe(reading.markdown)
        : `<pre class="offline-pre">${escapeHtml(reading.markdown)}</pre>`;
      output.innerHTML = `
        <div class="ai-meta offline-meta">Tạo ngay trên thiết bị · Knowledge Base V2 · Không cần Gemini/API/WebGPU</div>
        <div class="offline-reading full-offline-reading">${rendered}</div>
        <p class="offline-disclaimer">Báo cáo cục bộ theo hệ diễn giải truyền thống; không thay thế tư vấn y tế, pháp lý hoặc tài chính.</p>`;
    } catch (error) {
      output.textContent = `Không tạo được báo cáo cục bộ: ${error.message}`;
    }
  }

  window.OfflineReading = Object.freeze({ VERSION, PALACE_ORDER, buildOfflineReading, readingToText, normalize });
  window.renderOfflineSummary = renderOfflineSummary;
})();
