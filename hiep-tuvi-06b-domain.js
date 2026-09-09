"use strict";

(function installHiepTuVi06BDomain(root) {
  const VERSION = "0.2.0";
  const PALACES = Object.freeze(["Mệnh", "Phụ Mẫu", "Phúc Đức", "Điền Trạch", "Quan Lộc", "Nô Bộc", "Thiên Di", "Tật Ách", "Tài Bạch", "Tử Tức", "Phu Thê", "Huynh Đệ"]);
  let busy = false;

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
    return String(value ?? "").replace(/[&<>"']/g, (c) => ({
      "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;",
    })[c]);
  }

  function renderSimpleMarkdown(value) {
    return String(value || "").split(/\r?\n/).map((line) => {
      const text = escapeHtml(line);
      if (/^###\s+/.test(line)) return `<h3>${escapeHtml(line.replace(/^###\s+/, ""))}</h3>`;
      if (/^####\s+/.test(line)) return `<h4>${escapeHtml(line.replace(/^####\s+/, ""))}</h4>`;
      if (/^>\s?/.test(line)) return `<blockquote>${escapeHtml(line.replace(/^>\s?/, ""))}</blockquote>`;
      if (/^[-*]\s+/.test(line)) return `<p>• ${escapeHtml(line.replace(/^[-*]\s+/, ""))}</p>`;
      if (!line.trim()) return "";
      return `<p>${text}</p>`;
    }).join("");
  }

  function getChart() {
    if (root.__HIEP_TUVI_CHART__) return root.__HIEP_TUVI_CHART__;
    try {
      const frame = document.getElementById("tuviAppFrame");
      return frame?.contentWindow?.__HIEP_TUVI_CHART__ || null;
    } catch (_) {
      return null;
    }
  }

  function starName(star) {
    return String(star?.saoTen || star?.name || star?.label || "").trim();
  }

  function starToken(star) {
    const name = starName(star);
    if (!name) return "";
    const dignity = String(star?.saoDacTinh || star?.dignity || "").trim();
    const nature = String(star?.nature || "").trim();
    const tags = [dignity, nature].filter(Boolean);
    return tags.length ? `${name}[${tags.join("/")}]` : name;
  }

  function findPalace(chart, name) {
    const target = normalize(name);
    return (chart?.palaces || []).find((palace) => normalize(palace?.palace_name) === target) || null;
  }

  function nodeToken(node) {
    if (!node) return "-";
    const list = (items) => (items || []).map(starName).filter(Boolean).join(",") || "-";
    const flags = [node.tuan ? "TUẦN" : "", node.triet ? "TRIỆT" : ""].filter(Boolean).join("+") || "-";
    return `${node.palace || "?"}@${node.branch || "?"}{MAIN:${list(node.major_star_details)};GOOD:${list(node.good_star_details)};BAD:${list(node.bad_star_details)};HÓA:${list(node.transformation_details)};TS:${starName(node.trang_sinh_detail) || "-"};FLAG:${flags}}`;
  }

  function relationEvidence(chart, palace) {
    const rel = chart?.relations?.[String(palace?.branch_id)] || chart?.palace_relations?.[String(palace?.branch_id)] || null;
    if (!rel) return "RELATION=không có dữ liệu";
    return [
      `ĐỐI=${nodeToken(rel.opposite)}`,
      `TAM_HỢP=${(rel.trine || []).map(nodeToken).join(" | ") || "-"}`,
      `GIÁP=${(rel.adjacent || []).map(nodeToken).join(" | ") || "-"}`,
      `NHỊ_HỢP=${nodeToken(rel.six_harmony)}`,
    ].join("\n");
  }

  function heavenEvidence(chart) {
    const h = chart?.heaven || {};
    return [
      `GIỚI_TÍNH=${h.gender || "?"}`,
      `BẢN_MỆNH=${h.ban_menh || "?"}`,
      `CỤC=${h.cuc || "?"}`,
      `MỆNH_CỤC=${h.menh_cuc_relation || "?"}`,
      `THÂN_CƯ=${h.than_cu || h.than_palace || "?"}`,
      `ÂM_DƯƠNG=${h.am_duong_menh || "?"}`,
    ].join("; ");
  }

  function targetEvidence(chart, palace) {
    const stars = (palace?.stars || []).map(starToken).filter(Boolean).join(" · ");
    const flags = [palace?.is_than || palace?.is_body || palace?.than ? "THÂN" : "", palace?.has_tuan ? "TUẦN" : "", palace?.has_triet ? "TRIỆT" : ""].filter(Boolean).join("+") || "-";
    return [
      `CUNG=${palace?.palace_name || "?"}`,
      `ĐỊA_CHI=${palace?.branch_name || "?"}`,
      `NGŨ_HÀNH_CUNG=${palace?.element_name || palace?.element || palace?.hanh_cung || "?"}`,
      `FLAGS=${flags}`,
      `SAO=${stars || "-"}`,
    ].join("\n");
  }

  function clip(text, maxChars) {
    const value = String(text || "");
    return value.length <= maxChars ? value : `${value.slice(0, maxChars - 24)}...[đã rút gọn]`;
  }

  function buildPrompt(chart, palaceName, knowledgeApi = root.HiepTuViKnowledge) {
    const palace = findPalace(chart, palaceName);
    if (!palace) throw new Error(`Không tìm thấy cung ${palaceName} trong lá số.`);
    const knowledge = knowledgeApi?.knowledgeForPalaces?.(chart, [palace.palace_name]) || "Knowledge Base chưa sẵn sàng; hạ confidence và không bịa rule.";
    const prompt = `HIEP-TUVI 0.6B — CHUYÊN NGÀNH /no_think

FACT/CALC đã khóa bởi tuvi111. KHÔNG tự an sao, KHÔNG sửa vị trí cung/sao, KHÔNG suy thêm sao không có trong FACT. Knowledge Base chỉ là rule diễn giải.

NHIỆM VỤ: luận đúng MỘT cung: ${palace.palace_name}. Viết 180–320 từ tiếng Việt, ngắn nhưng có chiều sâu, giống phong cách chuyên gia thực hành.

BẮT BUỘC:
1. Tiêu đề: ### ${palace.palace_name.toUpperCase()} – ${String(palace.branch_name || "").toUpperCase()}.
2. Dòng phụ: #### liệt kê 4–8 sao/modifier quan trọng nhất đúng theo FACT.
3. Không dùng kiểu “sao A tốt, sao B xấu”. Phải nối cơ chế: A tạo nền gì → B/Tứ Hóa tác động vào đúng cơ chế nào → cát/sát tinh sửa lực ra sao → tam phương/đối cung có xác nhận hay phản chứng không.
4. Nếu Vô Chính Diệu: mượn đối cung + tam hợp trước khi kết luận.
5. Tứ Hóa, Tuần/Triệt, Tràng Sinh là modifier, không phải nút xóa hay verdict.
6. Bộ sao chỉ gọi complete khi đủ thành viên + hình học; nếu chưa đủ ghi partial/chưa xác minh.
7. Nếu có Tứ Hóa trong FACT/quan hệ: nêu rõ nguồn dữ liệu đang có; không suy ra nguồn Hóa khi FACT không chứa.
8. Nếu có Tuần/Triệt hoặc Tràng Sinh trong FACT: bắt buộc giải thích tác dụng như modifier, không bỏ qua.
9. Ít nhất một câu theo mẫu “Không phải vì X đơn thuần. Quan trọng là...” nếu cấu trúc có modifier mạnh.
10. Kết thúc bằng một blockquote 1–2 câu: “Tôi đọc: ...” nêu cơ chế thực tế, không định mệnh hóa.
11. Không nhắc rằng bạn là AI. Không lặp disclaimer dài.

FACT NỀN:
${heavenEvidence(chart)}

FACT CUNG:
${targetEvidence(chart, palace)}

QUAN HỆ CUNG:
${relationEvidence(chart, palace)}

KNOWLEDGE RETRIEVED:
${clip(knowledge, 4200)}

/no_think`;
    if (prompt.length > 9000) throw new Error(`Prompt 0.6B vượt budget: ${prompt.length} ký tự.`);
    return prompt;
  }

  function evidenceRequirements(chart, palaceName) {
    const palace = findPalace(chart, palaceName);
    const rel = chart?.relations?.[String(palace?.branch_id)] || chart?.palace_relations?.[String(palace?.branch_id)] || null;
    const stars = palace?.stars || [];
    const relationTransformations = [rel?.self, rel?.opposite, ...(rel?.trine || []), ...(rel?.adjacent || []), rel?.six_harmony]
      .filter(Boolean)
      .flatMap((node) => node?.transformation_details || []);
    return {
      palace,
      requiresTuan: Boolean(palace?.has_tuan),
      requiresTriet: Boolean(palace?.has_triet),
      requiresTrangSinh: stars.some((star) => star?.nature === "trang_sinh"),
      requiresTuHoa: stars.some((star) => /^Hóa\s/i.test(starName(star)) || star?.nature === "transformation") || relationTransformations.length > 0,
      requiresGeometry: Boolean(rel?.opposite || (rel?.trine || []).length),
      isVoChinhDieu: !stars.some((star) => star?.nature === "main"),
    };
  }

  function validateOutput(text, chart, palaceName) {
    const value = String(text || "").trim();
    const n = normalize(value);
    const req = evidenceRequirements(chart, palaceName);
    const issues = [];
    if (value.length < 650) issues.push(`Kết quả quá ngắn (${value.length} ký tự).`);
    if (value.length > 4200) issues.push(`Kết quả quá dài (${value.length} ký tự), dễ lan man.`);
    if (!n.includes(normalize(palaceName))) issues.push(`Không bám rõ cung ${palaceName}.`);
    if (!/^###\s+/m.test(value)) issues.push("Thiếu tiêu đề cung dạng ###.");
    if (!/^####\s+/m.test(value)) issues.push("Thiếu dòng sao/modifier trọng tâm dạng ####.");
    if (!/^>\s*(toi doc|tôi đọc)/im.test(value)) issues.push("Thiếu blockquote kết luận 'Tôi đọc:'.");
    if (req.requiresGeometry && !n.includes("tam hop") && !n.includes("doi cung")) issues.push("Thiếu kiểm tra tam hợp/đối cung dù FACT có quan hệ cung.");
    if (req.requiresTuan && !n.includes("tuan")) issues.push("FACT có Tuần nhưng phần luận không nhắc Tuần.");
    if (req.requiresTriet && !n.includes("triet")) issues.push("FACT có Triệt nhưng phần luận không nhắc Triệt.");
    if (req.requiresTrangSinh && !n.includes("trang sinh") && !n.includes("de vuong") && !n.includes("lam quan") && !n.includes("moc duc")) issues.push("FACT có vòng Tràng Sinh nhưng phần luận bỏ qua.");
    if (req.requiresTuHoa && !n.includes("tu hoa") && !/hoa (loc|quyen|khoa|ky)/i.test(n)) issues.push("FACT có Tứ Hóa nhưng phần luận bỏ qua Tứ Hóa.");
    if (req.isVoChinhDieu && !n.includes("vo chinh dieu")) issues.push("Cung không có chính tinh nhưng chưa nhận diện Vô Chính Diệu.");
    if (/chac chan|tat yeu|100%|khong the tranh/i.test(n)) issues.push("Ngôn ngữ định mệnh hóa/quá chắc chắn.");
    return issues;
  }

  function buildRepairPrompt(originalPrompt, priorText, issues) {
    return `${originalPrompt}\n\nQUALITY GATE — VIẾT LẠI TOÀN BỘ PHẦN LUẬN CUNG NÀY /no_think\nBản trước chưa đạt vì:\n- ${issues.join("\n- ")}\n\nBẢN TRƯỚC:\n${clip(priorText, 1800)}\n\nSửa đúng các lỗi trên, không thêm FACT mới, vẫn giữ 180–320 từ và kết thúc bằng blockquote “Tôi đọc: ...”.\n/no_think`;
  }

  function statusNode() { return document.getElementById("hiep06bStatus"); }
  function outputNode() { return document.getElementById("hiep06bOutput"); }

  function setStatus(text, mode = "") {
    const node = statusNode();
    if (!node) return;
    node.textContent = text;
    node.className = `tag hiep06b-status ${mode}`.trim();
  }

  function setBusy(value) {
    busy = value;
    const run = document.getElementById("hiep06bRunButton");
    const unload = document.getElementById("hiep06bUnloadButton");
    if (run) {
      run.disabled = value;
      run.textContent = value ? "0.6B đang xử lý..." : "AI 0.6B luận cung này";
    }
    if (unload) unload.disabled = value;
  }

  function onProgress(progress = {}) {
    const text = String(progress.text || "Hiep-Tuvi 0.6B đang xử lý...");
    const value = Number(progress.progress);
    setStatus(Number.isFinite(value) ? `${text} · ${Math.round(value * 100)}%` : text, "busy");
  }

  function resourceGuard() {
    const ua = String(navigator.userAgent || "");
    if (/Android|iPhone|iPad|iPod|Mobile/i.test(ua)) return "0.6B đang khóa trên điện thoại để tránh trình duyệt bị kill.";
    const memory = Number(navigator.deviceMemory || 0);
    if (memory > 0 && memory < 4) return `Thiết bị báo ${memory} GB RAM; không đủ biên an toàn cho 0.6B.`;
    if (!navigator.gpu) return "Trình duyệt không có WebGPU.";
    return "";
  }

  async function run() {
    if (busy) return;
    const chart = getChart();
    if (!chart) {
      setStatus("Chưa có lá số. Hãy lập lá số trong khung tuvi111 trước.", "error");
      return;
    }
    const guard = resourceGuard();
    if (guard) {
      setStatus(guard, "error");
      return;
    }
    const model = root.HiepTuVi06B;
    if (!model?.available?.()) {
      setStatus("Hiep-Tuvi 0.6B chưa sẵn sàng trên trình duyệt này.", "error");
      return;
    }
    const palaceName = String(document.getElementById("hiep06bPalaceSelect")?.value || "Mệnh");
    let prompt;
    try {
      prompt = buildPrompt(chart, palaceName);
    } catch (error) {
      setStatus(String(error?.message || error), "error");
      return;
    }

    setBusy(true);
    const output = outputNode();
    if (output) output.innerHTML = '<div class="ai-loading"><p>Đang tải/khởi tạo Hiep-Tuvi 0.6B. Lần đầu có thể tải khoảng 0,5–0,6 GB model.</p></div>';
    try {
      setStatus("Đang chuẩn bị Hiep-Tuvi 0.6B...", "busy");
      await model.ensureModel({ onProgress });
      setStatus(`Đang luận cung ${palaceName}...`, "busy");
      let result = await model.generate(prompt, { maxTokens: 430, onProgress });
      let text = String(result?.text || "").trim();
      let issues = validateOutput(text, chart, palaceName);
      let repaired = false;

      if (issues.length) {
        repaired = true;
        setStatus(`Gate phát hiện ${issues.length} lỗi · đang tự sửa 1 lượt...`, "busy");
        const repairPrompt = buildRepairPrompt(prompt, text, issues);
        result = await model.generate(repairPrompt, { maxTokens: 480, onProgress });
        text = String(result?.text || "").trim();
        issues = validateOutput(text, chart, palaceName);
      }

      const qualityNote = issues.length
        ? `QUALITY GATE: còn ${issues.length} điểm cần đối chiếu: ${issues.slice(0, 3).join(" | ")}`
        : repaired
          ? "QUALITY GATE: đạt sau 1 lượt tự sửa; vẫn cần đối chiếu với Local Rules khi dùng cho kết luận quan trọng."
          : "QUALITY GATE: đạt ngay lượt đầu; vẫn giữ Local Rules/FACT làm chuẩn.";

      if (output) {
        const body = typeof root.renderMarkdownSafe === "function" ? root.renderMarkdownSafe(text) : renderSimpleMarkdown(text);
        output.innerHTML = `<div class="ai-meta">HIEP-TUVI 0.6B · ${escapeHtml(result?.backend || "webgpu")} · ${escapeHtml(result?.dtype || "q4f16")}</div><div class="ai-lite-body">${body}</div><p class="muted">${escapeHtml(qualityNote)}</p>`;
        output.dataset.raw = text;
        output.dataset.qualityIssues = JSON.stringify(issues);
      }
      setStatus(issues.length ? `0.6B đã trả kết quả · còn ${issues.length} cảnh báo quality gate` : "0.6B đã trả kết quả · quality gate đạt", issues.length ? "error" : "ready");
    } catch (error) {
      const message = String(error?.message || error);
      if (output) output.innerHTML = `<div class="ai-error"><b>Hiep-Tuvi 0.6B chưa chạy được trên thiết bị này.</b><br>${escapeHtml(message)}</div>`;
      setStatus("0.6B lỗi · app gốc/Local Rules không bị ảnh hưởng", "error");
      try { await model.unload?.(); } catch (_) {}
    } finally {
      setBusy(false);
    }
  }

  async function unload() {
    const model = root.HiepTuVi06B;
    setStatus("Đang giải phóng model 0.6B...", "busy");
    try {
      await model?.unload?.();
      setStatus("Đã giải phóng Hiep-Tuvi 0.6B khỏi worker/GPU", "ready");
    } catch (error) {
      setStatus(`Unload lỗi: ${String(error?.message || error)}`, "error");
    }
  }

  function bind() {
    document.getElementById("hiep06bRunButton")?.addEventListener("click", run);
    document.getElementById("hiep06bUnloadButton")?.addEventListener("click", unload);
  }

  bind();

  root.HiepTuVi06BDomain = Object.freeze({
    VERSION,
    PALACES,
    buildPrompt,
    evidenceRequirements,
    validateOutput,
    buildRepairPrompt,
    resourceGuard,
    getChart,
    run,
    unload,
  });
})(typeof globalThis !== "undefined" ? globalThis : this);
