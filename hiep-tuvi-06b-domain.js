"use strict";

(function installHiepTuVi06BDomain(root) {
  const VERSION = "0.1.1";
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
    const prompt = `HIEP-TUVI 0.6B — THỬ NGHIỆM CHUYÊN NGÀNH /no_think

FACT/CALC đã khóa bởi tuvi111. KHÔNG tự an sao, KHÔNG sửa vị trí cung/sao, KHÔNG suy thêm sao không có trong FACT. Knowledge Base chỉ là rule diễn giải.

NHIỆM VỤ: luận đúng MỘT cung: ${palace.palace_name}. Viết 180–320 từ tiếng Việt, ngắn nhưng có chiều sâu, giống phong cách chuyên gia thực hành.

BẮT BUỘC:
1. Tiêu đề: ### ${palace.palace_name.toUpperCase()} – ${String(palace.branch_name || "").toUpperCase()}.
2. Dòng phụ: #### liệt kê 4–8 sao/modifier quan trọng nhất đúng theo FACT.
3. Không dùng kiểu “sao A tốt, sao B xấu”. Phải nối cơ chế: A tạo nền gì → B/Tứ Hóa tác động vào đúng cơ chế nào → cát/sát tinh sửa lực ra sao → tam phương/đối cung có xác nhận hay phản chứng không.
4. Nếu Vô Chính Diệu: mượn đối cung + tam hợp trước khi kết luận.
5. Tứ Hóa, Tuần/Triệt, Tràng Sinh là modifier, không phải nút xóa hay verdict.
6. Bộ sao chỉ gọi complete khi đủ thành viên + hình học; nếu chưa đủ ghi partial/chưa xác minh.
7. Ít nhất một câu theo mẫu “Không phải vì X đơn thuần. Quan trọng là...” nếu cấu trúc có modifier mạnh.
8. Kết thúc bằng một blockquote 1–2 câu: “Tôi đọc: ...” nêu cơ chế thực tế, không định mệnh hóa.
9. Không nhắc rằng bạn là AI. Không lặp disclaimer dài.

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
      run.textContent = value ? "0.6B đang xử lý..." : "Thử luận 1 cung bằng 0.6B";
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
    if (/Android|iPhone|iPad|iPod|Mobile/i.test(ua)) return "Thử nghiệm 0.6B đang khóa trên điện thoại để tránh trình duyệt bị kill.";
    const memory = Number(navigator.deviceMemory || 0);
    if (memory > 0 && memory < 4) return `Thiết bị báo ${memory} GB RAM; không đủ biên an toàn cho thử nghiệm 0.6B.`;
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
      const result = await model.generate(prompt, { maxTokens: 430, onProgress });
      const text = String(result?.text || "").trim();
      const hasPalace = normalize(text).includes(normalize(palaceName));
      const qualityNote = text.length < 650 || !hasPalace
        ? "Kết quả thử nghiệm còn ngắn hoặc chưa bám tên cung; chưa đủ điều kiện thay Local Rules."
        : "Kết quả đạt gate hình thức ban đầu; cần đối chiếu nội dung với Local Rules và @Hiep Tuvi.";
      if (output) {
        const body = typeof root.renderMarkdownSafe === "function" ? root.renderMarkdownSafe(text) : renderSimpleMarkdown(text);
        output.innerHTML = `<div class="ai-meta">HIEP-TUVI 0.6B EXPERIMENT · ${escapeHtml(result.backend || "webgpu")} · ${escapeHtml(result.dtype || "q4f16")}</div><div class="ai-lite-body">${body}</div><p class="muted">${escapeHtml(qualityNote)}</p>`;
        output.dataset.raw = text;
      }
      setStatus("0.6B đã trả kết quả · model vẫn giữ trong GPU để thử cung khác", "ready");
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
    resourceGuard,
    getChart,
    run,
    unload,
  });
})(typeof globalThis !== "undefined" ? globalThis : this);
