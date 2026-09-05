"use strict";

(function initHiepTuViKnowledge(root) {
  const VERSION = "2.0.1";
  const PROFILE = "STRUCTURED_LOCAL_KB";

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

  function clip(value, maxChars) {
    const text = String(value || "");
    if (text.length <= maxChars) return text;
    return `${text.slice(0, Math.max(0, maxChars - 22))}...[KB đã rút gọn]`;
  }

  function kb() {
    return root.HiepTuViKBData || {};
  }

  function findPalace(chart, name) {
    const target = normalize(name);
    return (chart?.palaces || []).find((p) => normalize(p?.palace_name) === target) || null;
  }

  function starName(item) {
    return String(item?.saoTen || item?.name || item?.label || "").trim();
  }

  function addDetailNames(set, items) {
    for (const item of items || []) {
      const name = starName(item);
      if (name) set.add(name);
    }
  }

  function collectRelevantStars(chart, names) {
    const set = new Set();
    for (const name of names || []) {
      const palace = findPalace(chart, name);
      for (const star of palace?.stars || []) {
        const n = starName(star);
        if (n) set.add(n);
      }
      const rel = chart?.relations?.[String(palace?.branch_id)] || chart?.palace_relations?.[String(palace?.branch_id)];
      const nodes = [rel?.self, rel?.opposite, ...(rel?.trine || []), ...(rel?.adjacent || []), rel?.six_harmony].filter(Boolean);
      for (const node of nodes) {
        addDetailNames(set, node.major_star_details);
        addDetailNames(set, node.good_star_details);
        addDetailNames(set, node.bad_star_details);
        addDetailNames(set, node.transformation_details);
      }
    }
    return set;
  }

  function hasTuanTriet(chart, names) {
    return (names || []).some((name) => {
      const p = findPalace(chart, name);
      return Boolean(p?.has_tuan || p?.has_triet);
    });
  }

  function hasTrangSinh(chart, names) {
    return (names || []).some((name) => (findPalace(chart, name)?.stars || []).some((s) => s?.nature === "trang_sinh"));
  }

  function tag(rule) {
    return `[${rule.id || "RULE"}|${rule.school || "MULTI"}|SRC:${rule.source_level || "?"}|CONF:${rule.confidence || "?"}]`;
  }

  function palaceRule(name) {
    return (kb().palaces || []).find((rule) => normalize(rule.name) === normalize(name)) || null;
  }

  function starRulesForSet(starSet, limit = 10) {
    const priorities = { main:0, transformation:1, pressure:2, resource:3, movement:3, support:4, social:5 };
    return (kb().stars || [])
      .filter((rule) => [...starSet].some((name) => normalize(name) === normalize(rule.name)))
      .sort((a, b) => (priorities[a.group] ?? 9) - (priorities[b.group] ?? 9))
      .slice(0, limit);
  }

  function relevantCombos(starSet, limit = 5) {
    const normalizedStars = new Set([...starSet].map(normalize));
    return (kb().combinations || [])
      .map((combo) => ({
        combo,
        hits:(combo.mandatory_members || []).filter((member) => normalizedStars.has(normalize(member))).length,
      }))
      .filter(({ combo, hits }) => hits >= Number(combo.retrieval_min || combo.mandatory_members?.length || 99))
      .sort((a, b) => b.hits - a.hits)
      .slice(0, limit)
      .map(({ combo }) => combo);
  }

  function formatPalaceRule(rule) {
    if (!rule) return "";
    return `- ${tag(rule)} ${rule.name}: ${rule.theme} | tam hợp=${(rule.trine || []).join("+") || "-"}; đối=${rule.opposite || "-"}; liên đới=${(rule.topic_links || []).join("+") || "-"}.`;
  }

  function formatStarRule(rule) {
    return `- ${tag(rule)} ${rule.name}: ${rule.native_meaning} CHECK=${(rule.must_check || []).join(" → ")}. EXCEPT=${(rule.exceptions || []).join(" ") || "-"}`;
  }

  function formatCombo(combo) {
    return `- ${tag(combo)} ${combo.name}: ${combo.core_function} | members=${(combo.mandatory_members || []).join("+")} | geometry=${combo.required_geometry} | mạnh khi=${(combo.strength_conditions || []).join("; ") || "-"} | yếu/phá=${[...(combo.weakening_conditions || []), ...(combo.breaking_conditions || [])].join("; ") || "-"}.`;
  }

  function structuralLines() {
    return (kb().structures || []).slice(0, 5).map((rule) => `- ${tag(rule)} ${rule.topic}: ${rule.rule}`);
  }

  function priorityStructureLines(chart, names, stars) {
    const data = kb();
    const lines = [];
    if ([...stars].some((name) => /^Hóa /i.test(name))) {
      const th = data.tuHoa;
      lines.push(`TỨ HÓA [TU_HOA|SRC:${th?.source_level || "?"}|CONF:${th?.confidence || "?"}]: ${th?.network_rule || "source→carrier→cung→geometry→net effect"}. Anti=${(th?.anti_patterns || []).join(" ")}`);
    }
    if (hasTuanTriet(chart, names)) {
      const tt = data.tuanTriet;
      lines.push(`TUẦN/TRIỆT [${tt?.school || "CLASSICAL"}|SRC:${tt?.source_level || "?"}|CONF:${tt?.confidence || "?"}]: ${tt?.rule || "modifier, không xóa sao"} CHECK=${(tt?.checks || []).join("; ")}`);
    }
    if (hasTrangSinh(chart, names)) {
      const ts = data.trangSinh;
      lines.push(`TRÀNG SINH [${ts?.school || "CLASSICAL"}|SRC:${ts?.source_level || "?"}|CONF:${ts?.confidence || "?"}]: ${ts?.rule || "pha khí/nhịp phát triển"}. Anti=${(ts?.anti_patterns || []).join("; ")}`);
    }
    return lines;
  }

  function knowledgeForPalaces(chart, names) {
    const stars = collectRelevantStars(chart, names);
    const palaceLines = (names || []).map((name) => formatPalaceRule(palaceRule(name))).filter(Boolean);
    const starLines = starRulesForSet(stars).map(formatStarRule);
    const comboLines = relevantCombos(stars).map(formatCombo);
    const priorityLines = priorityStructureLines(chart, names, stars);
    const lines = [
      "### HIEP TUVI KNOWLEDGE BASE V2 — RULES TRUY XUẤT THEO LÁ SỐ",
      "Chỉ dùng các rule dưới đây để hỗ trợ diễn giải; FACT/CALC của tuvi111 luôn ưu tiên hơn knowledge rule.",
      "PALACE RULES:",
      ...(palaceLines.length ? palaceLines : ["- Không có palace rule phù hợp; hạ confidence."]),
      ...(priorityLines.length ? ["PRIORITY STRUCTURE RULES:", ...priorityLines] : []),
      "STAR RULES — native meaning, không phải verdict:",
      ...(starLines.length ? starLines : ["- Không có rule sao chuyên biệt; không bịa nghĩa bổ sung."]),
      ...(comboLines.length ? ["COMBINATION / FORMATION CANDIDATES — phải kiểm hình học trước khi gọi cách:", ...comboLines] : []),
      "STRUCTURAL RULES:",
      ...structuralLines(),
    ];
    return clip(lines.join("\n"), 4600);
  }

  function baziKnowledge() {
    const data = kb();
    const b = data.bazi || {};
    const nh = data.nguHanh || {};
    const lines = [
      "### HIEP TUVI KB V2 — BÁT TỰ / NGŨ HÀNH",
      "SEQUENCE:",
      ...(b.sequence || []).map((item, index) => `${index + 1}. ${item}`),
      "CORE RULES:",
      ...(b.principles || []).map((rule) => `- ${tag(rule)} ${rule.topic}: ${rule.rule}`),
      `NGŨ HÀNH [SRC:${nh.source_level || "?"}|CONF:${nh.confidence || "?"}]: ${nh.rule || ""} TV=${nh.tuvi_stack || ""} BT=${nh.bazi_rule || ""}`,
      `INDEPENDENCE CHECK: ${nh.independence || "Không đếm cùng một tiền đề nhiều lần."}`,
      "ANTI-PATTERNS:",
      ...(b.anti_patterns || []).map((item) => `- ${item}`),
    ];
    return clip(lines.join("\n"), 4300);
  }

  function synthesisKnowledge() {
    const data = kb();
    const schoolLines = (data.schools || []).map((s) => `- [${s.tag}|SRC:${s.source_level}|CONF:${s.confidence}] ${s.priority} CAUTION=${(s.cautions || []).join("; ")}`);
    const prov = data.provenance || {};
    const lines = [
      "### HIEP TUVI KB V2 — SYNTHESIS / RED-TEAM / PROVENANCE",
      "SCHOOLS:", ...schoolLines,
      "CROSS-SYSTEM:",
      "- Tử Vi và Bát Tự chỉ được coi là đồng thuận mạnh khi đường suy luận đủ độc lập; dùng chung Ngũ Hành phải đánh dấu dependency.",
      "- Sau đủ 12 cung mới quét trục Mệnh–Tài–Quan, Mệnh–Di, Phúc–Di–Phu, Quan–Phu, Phúc–Tài, Điền–Tật–Huynh và cung Thân.",
      "PROVENANCE GATES:", ...(prov.gates || []).map((item) => `- ${item}`),
      "RED-TEAM:", ...(data.redTeam || []).map((item) => `- ${item}`),
      `CLAIM STATES: ${(data.claimStates || []).join(" | ")}`,
      data.timeLayers ? `TIME LAYERS: ${data.timeLayers.output_pattern}; gate=${(data.timeLayers.forecast_gate || []).join(" → ")}` : "",
    ].filter(Boolean);
    return clip(lines.join("\n"), 4400);
  }

  function forJob(chart, job) {
    if (job?.kind === "palaces") return knowledgeForPalaces(chart, job.palaces || []);
    if (job?.kind === "bazi") return baziKnowledge();
    if (job?.kind === "synthesis") return synthesisKnowledge();
    return clip(structuralLines().join("\n"), 2200);
  }

  function stats() {
    const data = kb();
    return {
      version:VERSION,
      stars:(data.stars || []).length,
      palaces:(data.palaces || []).length,
      combinations:(data.combinations || []).length,
      structures:(data.structures || []).length,
      bazi_rules:(data.bazi?.principles || []).length,
      schools:(data.schools || []).length,
    };
  }

  function ruleById(id) {
    const target = String(id || "");
    const data = kb();
    const pools = [data.stars, data.palaces, data.combinations, data.structures, data.bazi?.principles, data.schools].filter(Array.isArray);
    for (const pool of pools) {
      const found = pool.find((rule) => rule.id === target);
      if (found) return found;
    }
    return null;
  }

  root.HiepTuViKnowledge = Object.freeze({
    VERSION,
    PROFILE,
    forJob,
    stats,
    ruleById,
    collectRelevantStars,
    knowledgeForPalaces,
    baziKnowledge,
    synthesisKnowledge,
  });
})(typeof globalThis !== "undefined" ? globalThis : this);
