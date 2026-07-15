"use strict";

const state = {
  worker: null,
  workerReady: false,
  pending: new Map(),
  nextId: 1,
  chart: null,
  selectedBranch: 1,
  selectedTopic: 0,
  relationAll: false,
  combinedAll: false,
  geminiBusy: false,
};

const $ = (id) => document.getElementById(id);
const html = (value) => String(value ?? "—").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
const normalizeName = (s) => String(s || "").toLocaleLowerCase("vi");


const GEMINI_ENDPOINT_KEY = "tuvi-gemini-worker-endpoint";
const GEMINI_MODEL_KEY = "tuvi-gemini-model";
const DEFAULT_GEMINI_ENDPOINT = "https://spring-bonus-6dfb.hiep4294.workers.dev";
const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash";
const WEB_VERSION = "1.13";

// Khung địa chi cố định theo thứ tự người dùng chốt.
// Các cung chức năng và sao chỉ được gán vào khung này, không làm thay đổi vị trí địa chi.
const BRANCH_NAME_BY_ID = Object.freeze({
  1: "Tý", 2: "Sửu", 3: "Dần", 4: "Mão", 5: "Thìn", 6: "Tỵ",
  7: "Ngọ", 8: "Mùi", 9: "Thân", 10: "Dậu", 11: "Tuất", 12: "Hợi",
});
const BRANCH_CLOCKWISE_ORDER = Object.freeze([3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2]);
const BRANCH_GRID_POSITIONS = Object.freeze({
  // Khung cố định theo đúng bố cục người dùng chốt:
  // Tỵ   Ngọ   Mùi   Thân
  // Thìn             Dậu
  // Mão              Tuất
  // Dần  Sửu   Tý    Hợi
  6:[1,1], 7:[1,2], 8:[1,3], 9:[1,4],
  5:[2,1], 10:[2,4], 4:[3,1], 11:[3,4],
  3:[4,1], 2:[4,2], 1:[4,3], 12:[4,4],
});

function normalizeEndpoint(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function geminiAnalyzeUrl(endpoint) {
  const value = normalizeEndpoint(endpoint);
  return value.endsWith("/analyze") ? value : `${value}/analyze`;
}

function setGeminiStatus(message, mode = "") {
  const node = $("geminiStatus");
  if (!node) return;
  node.textContent = message;
  node.className = `tag gemini-status ${mode}`.trim();
}

function restoreGeminiSettings() {
  const savedEndpoint = normalizeEndpoint(localStorage.getItem(GEMINI_ENDPOINT_KEY));
  const endpoint = savedEndpoint || DEFAULT_GEMINI_ENDPOINT;
  const model = DEFAULT_GEMINI_MODEL;
  localStorage.setItem(GEMINI_ENDPOINT_KEY, endpoint);
  localStorage.setItem(GEMINI_MODEL_KEY, model);
  $("geminiEndpoint").value = endpoint;
  $("geminiModel").value = model;
  setGeminiStatus(savedEndpoint ? "Đã lưu Worker" : "Đã tích hợp Worker", "ready");
}

function saveGeminiSettings() {
  const endpoint = normalizeEndpoint($("geminiEndpoint").value);
  if (!endpoint) {
    localStorage.removeItem(GEMINI_ENDPOINT_KEY);
    setGeminiStatus("Chưa cấu hình", "");
    return toast("Đã xóa địa chỉ Worker");
  }
  const valid = endpoint.startsWith("https://") || endpoint.startsWith("http://localhost") || endpoint.startsWith("http://127.0.0.1");
  if (!valid) return alert("Địa chỉ Worker phải bắt đầu bằng https://");
  localStorage.setItem(GEMINI_ENDPOINT_KEY, endpoint);
  localStorage.setItem(GEMINI_MODEL_KEY, DEFAULT_GEMINI_MODEL);
  $("geminiEndpoint").value = endpoint;
  setGeminiStatus("Đã lưu Worker", "ready");
  toast("Đã lưu kết nối Gemini");
}

function inlineMarkdownSafe(value) {
  return html(value)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_]+)__/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

function renderMarkdownSafe(markdown) {
  const lines = String(markdown || "").replace(/\r\n/g, "\n").split("\n");
  const out = [];
  let list = null;
  const closeList = () => {
    if (!list) return;
    out.push(list === "ul" ? "</ul>" : "</ol>");
    list = null;
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      closeList();
      continue;
    }
    let match = line.match(/^(#{1,4})\s+(.+)$/);
    if (match) {
      closeList();
      const level = match[1].length + 1;
      out.push(`<h${level}>${inlineMarkdownSafe(match[2])}</h${level}>`);
      continue;
    }
    match = line.match(/^[-*]\s+(.+)$/);
    if (match) {
      if (list !== "ul") { closeList(); out.push("<ul>"); list = "ul"; }
      out.push(`<li>${inlineMarkdownSafe(match[1])}</li>`);
      continue;
    }
    match = line.match(/^\d+[.)]\s+(.+)$/);
    if (match) {
      if (list !== "ol") { closeList(); out.push("<ol>"); list = "ol"; }
      out.push(`<li>${inlineMarkdownSafe(match[1])}</li>`);
      continue;
    }
    match = line.match(/^>\s?(.+)$/);
    if (match) {
      closeList();
      out.push(`<blockquote>${inlineMarkdownSafe(match[1])}</blockquote>`);
      continue;
    }
    closeList();
    out.push(`<p>${inlineMarkdownSafe(line)}</p>`);
  }
  closeList();
  return out.join("");
}

async function readJsonResponse(response) {
  const text = await response.text();
  if (!text) return {};
  try { return JSON.parse(text); }
  catch (_) { return { error: text }; }
}

async function testGeminiConnection(options = {}) {
  const silent = Boolean(options.silent);
  const endpoint = normalizeEndpoint($("geminiEndpoint").value || localStorage.getItem(GEMINI_ENDPOINT_KEY));
  if (!endpoint) return alert("Chưa nhập địa chỉ Gemini Worker.");
  setGeminiStatus("Đang kiểm tra...", "busy");
  $("testGeminiButton").disabled = true;
  try {
    const response = await fetch(endpoint, { method: "GET", headers: { "Accept": "application/json" }, cache: "no-store" });
    const data = await readJsonResponse(response);
    if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
    const supports35 = Array.isArray(data.allowed_models) && data.allowed_models.includes(DEFAULT_GEMINI_MODEL);
    setGeminiStatus(supports35 ? "Kết nối tốt · Gemini 3.5" : `Kết nối tốt · ${data.default_model || "Gemini"}`, supports35 ? "ready" : "busy");
    toast(supports35 ? "Worker hỗ trợ Gemini 3.5" : "Worker hoạt động nhưng chưa xác nhận Gemini 3.5");
  } catch (error) {
    setGeminiStatus("Kết nối lỗi", "error");
    if (!silent) alert("Không kết nối được Gemini Worker:\n" + error.message);
  } finally {
    $("testGeminiButton").disabled = false;
  }
}

const AUTO_GEMINI_REPORT_PARTS = Object.freeze([
  "Tổng quan và 6 cung đầu",
  "6 cung còn lại, Bát Tự và kết luận",
]);

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function requestGeminiPart(endpoint, prompt, model, partIndex) {
  let lastError = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(geminiAnalyzeUrl(endpoint), {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({
          prompt,
          model,
          max_output_tokens: 4096,
          metadata: {
            chart_id: state.chart?.chart_id || null,
            prompt_kind: "auto_report_part",
            report_part: partIndex + 1,
            report_parts_total: AUTO_GEMINI_REPORT_PARTS.length,
            contains_full_tuvi: true,
            contains_full_bazi: true,
            requested_compact_balanced_report: true,
          },
        }),
      });
      const data = await readJsonResponse(response);
      if (!response.ok) {
        const error = new Error(data.error || data.message || `HTTP ${response.status}`);
        error.status = response.status;
        throw error;
      }
      if (!data.text) throw new Error("Gemini không trả về nội dung văn bản.");
      return data;
    } catch (error) {
      lastError = error;
      const retryable = [429, 500, 502, 503, 504].includes(Number(error.status || 0));
      if (!retryable || attempt === 1) break;
      setGeminiStatus(`Gemini bận, chờ thử lại phần ${partIndex + 1}/4...`, "busy");
      await wait(6000);
    }
  }
  throw lastError || new Error("Không gọi được Gemini.");
}

async function runGeminiAnalysis(options = {}) {
  if (state.geminiBusy) return;
  if (!state.chart) {
    if (!options.automatic) alert("Chưa lập lá số.");
    return;
  }

  const endpoint = normalizeEndpoint($("geminiEndpoint").value || localStorage.getItem(GEMINI_ENDPOINT_KEY));
  if (!endpoint) {
    $("geminiOutput").innerHTML = '<div class="ai-error"><b>Chưa cấu hình Gemini Worker.</b><br>Vào tab Prompt AI để nhập địa chỉ Worker.</div>';
    setGeminiStatus("Chưa cấu hình", "error");
    return;
  }
  const model = DEFAULT_GEMINI_MODEL;
  $("geminiModel").value = model;
  localStorage.setItem(GEMINI_ENDPOINT_KEY, endpoint);
  localStorage.setItem(GEMINI_MODEL_KEY, model);

  state.geminiBusy = true;
  const buttons = [$("runGeminiButton"), $("runGeminiInlineButton")].filter(Boolean);
  for (const button of buttons) {
    button.disabled = true;
    button.dataset.label = button.textContent;
    button.textContent = "Gemini đang tổng luận...";
  }
  setGeminiStatus("Đang chuẩn bị báo cáo gọn 2 phần", "busy");
  $("geminiOutput").dataset.raw = "";
  $("geminiOutput").innerHTML = '<div class="ai-loading"><span></span><p>Đang chuẩn bị báo cáo ngắn gọn, dễ hiểu. Dự kiến 2 lượt phân tích...</p></div>';
  activateTab("chart");
  setTimeout(() => $("geminiResultPanel")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);

  const rawParts = [];
  const htmlParts = [];
  let usageTokens = 0;

  try {
    // Keep the editable full prompt available in the Prompt AI tab.
    try {
      const full = await callWorker("prompt", { kind: "full", index: 0 });
      $("promptKind").value = "full";
      $("promptText").value = String(full.prompt || "").trim();
    } catch (_) {}

    for (let index = 0; index < AUTO_GEMINI_REPORT_PARTS.length; index += 1) {
      const title = AUTO_GEMINI_REPORT_PARTS[index];
      setGeminiStatus(`Đang phân tích phần ${index + 1}/4`, "busy");
      $("geminiOutput").innerHTML = [
        ...htmlParts,
        `<div class="ai-loading"><span></span><p>Phần ${index + 1}/4: ${html(title)}...</p></div>`,
      ].join("");

      const promptResult = await callWorker("prompt", { kind: "auto_report_part", index });
      const prompt = String(promptResult.prompt || "").trim();
      if (!prompt) throw new Error(`Prompt phần ${index + 1} đang trống.`);

      const data = await requestGeminiPart(endpoint, prompt, model, index);
      const sectionHeading = `PHẦN ${index + 1}/${AUTO_GEMINI_REPORT_PARTS.length} — ${title.toUpperCase()}`;
      rawParts.push(`# ${sectionHeading}\n\n${data.text}`);
      htmlParts.push(`<section class="ai-report-part"><h2>${html(sectionHeading)}</h2>${renderMarkdownSafe(data.text)}</section>`);
      usageTokens += Number(data.usage?.total_token_count || data.usage?.totalTokenCount || 0);
      $("geminiOutput").dataset.raw = rawParts.join("\n\n---\n\n");
      $("geminiOutput").innerHTML = htmlParts.join("");

      if (index < AUTO_GEMINI_REPORT_PARTS.length - 1) await wait(900);
    }

    $("geminiOutput").innerHTML = `<div class="ai-meta">Báo cáo tự động 2 phần · Mô hình: ${html(model)}${usageTokens ? ` · Tổng token ghi nhận: ${html(usageTokens)}` : ""}</div>${htmlParts.join("")}`;
    setGeminiStatus("Đã hoàn thành báo cáo gọn", "ready");
    toast("Đã lập lá số và hoàn thành tổng luận AI");
  } catch (error) {
    const completed = htmlParts.length;
    $("geminiOutput").dataset.raw = rawParts.join("\n\n---\n\n");
    $("geminiOutput").innerHTML = `${htmlParts.join("")}<div class="ai-error"><b>Báo cáo dừng tại phần ${completed + 1}/${AUTO_GEMINI_REPORT_PARTS.length}.</b><br>${html(error.message)}<br>Có thể bấm “Phân tích lại toàn bộ” để chạy lại.</div>`;
    setGeminiStatus(`Phân tích lỗi sau ${completed}/${AUTO_GEMINI_REPORT_PARTS.length} phần`, "error");
  } finally {
    state.geminiBusy = false;
    for (const button of buttons) {
      button.disabled = false;
      button.textContent = button.dataset.label || "Phân tích lại toàn bộ";
    }
  }
}

function clearGeminiResult() {
  $("geminiOutput").dataset.raw = "";
  $("geminiOutput").innerHTML = '<p class="muted">Kết quả Gemini 3.5 đã được xóa.</p>';
}

function toast(message) {
  const node = $("toast");
  node.textContent = message;
  node.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => node.classList.remove("show"), 2300);
}

function setProgress(message, progress) {
  $("progressText").textContent = message;
  $("progressBar").style.width = `${Math.max(2, Math.min(100, progress || 0))}%`;
}

function setEngineState(mode, message) {
  $("engineState").className = `engine-state ${mode || ""}`;
  $("engineMessage").textContent = message;
}

function initWorker() {
  const worker = new Worker("engine-worker.js?v=1.13");
  state.worker = worker;
  worker.onmessage = (event) => {
    const msg = event.data || {};
    if (msg.type === "status") {
      setProgress(msg.message, msg.progress);
      setEngineState("", msg.message);
    } else if (msg.type === "ready") {
      state.workerReady = true;
      setProgress(msg.message, 100);
      setEngineState("ready", msg.message);
      $("generateButton").disabled = false;
      setTimeout(() => $("progressWrap").style.display = "none", 700);
    } else if (msg.type === "fatal") {
      setEngineState("error", "Không tải được bộ máy");
      setProgress("Lỗi: " + msg.error + " — hãy nhấn Ctrl+F5 hoặc xóa dữ liệu trang rồi tải lại.", 100);
    } else if (msg.type === "response") {
      const pending = state.pending.get(msg.id);
      if (!pending) return;
      state.pending.delete(msg.id);
      msg.ok ? pending.resolve(msg) : pending.reject(new Error(msg.error || "Lỗi không xác định"));
    }
  };
  worker.onerror = (event) => {
    setEngineState("error", "Worker gặp lỗi");
    setProgress(event.message, 100);
  };
}

function callWorker(action, payload = {}) {
  return new Promise((resolve, reject) => {
    if (!state.workerReady && action !== "health") return reject(new Error("Bộ máy chưa sẵn sàng"));
    const id = state.nextId++;
    state.pending.set(id, { resolve, reject });
    state.worker.postMessage({ id, action, payload });
  });
}

function populateTime24Selects(defaultHour = 17, defaultMinute = 18) {
  const hourNode = $("birthHour");
  const minuteNode = $("birthMinute");
  if (!hourNode || !minuteNode) return;
  hourNode.innerHTML = Array.from({ length: 24 }, (_, value) => {
    const label = String(value).padStart(2, "0");
    return `<option value="${value}">${label}</option>`;
  }).join("");
  minuteNode.innerHTML = Array.from({ length: 60 }, (_, value) => {
    const label = String(value).padStart(2, "0");
    return `<option value="${value}">${label}</option>`;
  }).join("");
  hourNode.value = String(Math.min(23, Math.max(0, Number(defaultHour) || 0)));
  minuteNode.value = String(Math.min(59, Math.max(0, Number(defaultMinute) || 0)));
}

function readBirthTime24() {
  const hour = Number($("birthHour").value);
  const minute = Number($("birthMinute").value);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    throw new Error("Giờ sinh phải nằm trong khoảng 00–23.");
  }
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) {
    throw new Error("Phút sinh phải nằm trong khoảng 00–59.");
  }
  return { hour, minute, text: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}` };
}

function validateFixedBranchFrame(chart) {
  const seenPositions = new Set();
  for (const branchId of BRANCH_CLOCKWISE_ORDER) {
    const pos = BRANCH_GRID_POSITIONS[branchId];
    if (!pos) throw new Error(`Thiếu vị trí khung cho ${BRANCH_NAME_BY_ID[branchId]}.`);
    const key = pos.join(":");
    if (seenPositions.has(key)) throw new Error("Khung địa chi bị trùng vị trí.");
    seenPositions.add(key);
  }
  const byId = new Map((chart?.palaces || []).map(p => [Number(p.branch_id), p]));
  for (const branchId of BRANCH_CLOCKWISE_ORDER) {
    const palace = byId.get(branchId);
    if (!palace) throw new Error(`Dữ liệu thiếu cung ${BRANCH_NAME_BY_ID[branchId]}.`);
    if (String(palace.branch_name) !== BRANCH_NAME_BY_ID[branchId]) {
      throw new Error(`Sai khung địa chi: ID ${branchId} phải là ${BRANCH_NAME_BY_ID[branchId]}, không phải ${palace.branch_name}.`);
    }
  }
  const canonical = ["mệnh","phụ mẫu","phúc đức","điền trạch","quan lộc","nô bộc","thiên di","tật ách","tài bạch","tử tức","phu thê","huynh đệ"];
  const menh = Number(chart?.heaven?.menh_branch);
  const menhIndex = BRANCH_CLOCKWISE_ORDER.indexOf(menh);
  if (menhIndex < 0) throw new Error("Không xác định được cung Mệnh trên khung địa chi cố định.");
  canonical.forEach((name, offset) => {
    const branchId = BRANCH_CLOCKWISE_ORDER[(menhIndex + offset) % 12];
    const palace = byId.get(branchId);
    const actual = normalizeName(palace?.palace_name);
    if (actual !== name) {
      throw new Error(`Sai thứ tự cung chức: ${BRANCH_NAME_BY_ID[branchId]} phải là ${name}, hiện là ${actual || "trống"}.`);
    }
  });
  const menhPalace = byId.get(menh);
  if (normalizeName(menhPalace?.palace_name) !== "mệnh") {
    throw new Error("Cung Mệnh không nằm tại địa chi Mệnh đã tính.");
  }
  // Tiểu hạn chỉ là lớp dữ liệu hạn; không tham gia xác định địa chi hoặc tên 12 cung.
}

function parseForm() {
  const [year, month, day] = $("birthDate").value.split("-").map(Number);
  const time = readBirthTime24();
  return {
    name: $("name").value.trim(),
    gender: Number($("gender").value),
    day, month, year, hour: time.hour, minute: time.minute,
    annual_year: Number($("annualYear").value),
    tu_hoa_method: $("tuHoaMethod").value,
  };
}

async function generate(event) {
  event?.preventDefault();
  if (!state.workerReady) return;
  const button = $("generateButton");
  button.disabled = true;
  button.textContent = "Đang lập lá số...";
  try {
    const result = await callWorker("generate", parseForm());
    state.chart = result.chart;
    validateFixedBranchFrame(state.chart);
    $("geminiOutput").dataset.raw = "";
    $("geminiOutput").innerHTML = '<p class="muted">Chưa có luận giải Gemini cho lá số hiện tại.</p>';
    state.selectedBranch = Number(state.chart.heaven.menh_branch || 1);
    state.selectedTopic = 0;
    state.relationAll = false;
    state.combinedAll = false;
    renderAll();
    localStorage.setItem("tuvi-web-last-input", JSON.stringify(parseForm()));
    toast("Đã lập lá số. Gemini đang tự động tổng luận...");
    await runGeminiAnalysis({ automatic: true });
  } catch (error) {
    alert("Không thể lập lá số:\n" + error.message);
  } finally {
    button.disabled = false;
    button.textContent = "Lập lá số & tổng luận AI";
  }
}

function renderAll() {
  $("emptyState").hidden = true;
  $("chartContent").hidden = false;
  renderChartHeader();
  renderTuViBoard();
  renderBazi();
  buildSelectors();
  renderRelations();
  renderCombined();
  renderJson();
}

function renderChartHeader() {
  const h = state.chart.heaven;
  $("chartTitle").textContent = h.name || "Lá số";
  $("chartSubtitle").textContent = `${h.gender} · ${h.input_time} · Lưu niên ${h.annual_year_can_chi}`;
}

const gridPositions = BRANCH_GRID_POSITIONS;

function starLabel(star, includeElement=false) {
  const stateMark = star.saoDacTinh ? ` <span class="star-state">(${html(star.saoDacTinh)})</span>` : "";
  const element = includeElement ? ` (${html(star.element_name)})` : "";
  return `<span class="star" style="color:${html(star.element_color || '#333')}">${html(star.saoTen)}${element}${stateMark}</span>`;
}

function renderStarList(stars) {
  return stars.length ? stars.map(s => starLabel(s)).join("") : `<span class="muted">—</span>`;
}

function findTrangSinh(palace) {
  return palace.stars.find(s => s.nature === "trang_sinh");
}

function renderPalace(p) {
  const majors = p.stars.filter(s => s.nature === "main");
  const good = p.stars.filter(s => s.nature === "good");
  const bad = p.stars.filter(s => s.nature === "bad");
  const ts = findTrangSinh(p);
  const annualGood = (p.annual_stars || []).filter(s => s.nature === "good");
  const annualBad = (p.annual_stars || []).filter(s => s.nature === "bad");
  const [row,col] = gridPositions[p.branch_id];
  return `<article class="palace ${p.branch_id === state.selectedBranch ? 'selected' : ''}" data-branch="${p.branch_id}" style="grid-row:${row};grid-column:${col}">
    <div class="palace-head"><span class="palace-branch">${html(BRANCH_NAME_BY_ID[p.branch_id] || p.branch_name)}</span><span class="palace-name">${html(p.palace_name)}${p.is_body ? '<span class="body-mark">THÂN</span>' : ''}</span><span class="palace-limit">${html(p.major_limit)}</span></div>
    <div class="major-stars">${renderStarList(majors)}</div>
    <div class="star-columns">
      <div class="star-column good"><h4>SAO TỐT</h4><div class="star-list">${renderStarList(good)}</div></div>
      <div class="star-column bad"><h4>SAO XẤU</h4><div class="star-list">${renderStarList(bad)}</div></div>
    </div>
    ${(annualGood.length || annualBad.length) ? `<div class="annual-group"><div class="annual-title">LƯU NIÊN ${html(state.chart.annual.year)}</div><div class="star-columns"><div class="star-list">${renderStarList(annualGood)}</div><div class="star-list" style="text-align:right">${renderStarList(annualBad)}</div></div></div>` : ''}
    <div class="blockers"><span>${p.has_tuan ? '<b class="tuan">TUẦN</b>' : ''}</span><span>${p.has_triet ? '<b class="triet">TRIỆT</b>' : ''}</span></div>
    <div class="palace-bottom"><span class="minor-limit">Tiểu hạn ${html(p.minor_limit)}</span><span>${ts ? html(ts.saoTen) : '—'}</span><span>ĐH ${html(p.major_limit)}</span></div>
  </article>`;
}

function renderCenter() {
  const h = state.chart.heaven;
  return `<section class="center-info">
    <h2>THÔNG TIN LÁ SỐ</h2>
    <dl class="center-grid">
      <dt>Họ tên</dt><dd>${html(h.name)}</dd>
      <dt>Dương lịch</dt><dd>${html(h.input_time)}</dd>
      <dt>Âm lịch</dt><dd>${html(h.chart_lunar_date)}</dd>
      <dt>Tứ trụ</dt><dd>${html(h.year_can_chi)} · ${html(h.month_can_chi)} · ${html(h.day_can_chi)} · ${html(h.hour_can_chi)}</dd>
      <dt>Âm dương</dt><dd>${html(h.am_duong_menh)}</dd>
      <dt>Thân cư</dt><dd>${html(h.than_cu || h.than_palace || "—")}</dd>
      <dt>Chiều đại hạn</dt><dd>${html(h.major_limit_direction || "—")}</dd>
      <dt>Bản mệnh</dt><dd>${html(h.ban_menh)}</dd>
      <dt>Cục</dt><dd>${html(h.cuc)} — ${html(h.menh_cuc_relation)}</dd>
      <dt>Chủ Mệnh / Thân</dt><dd>${html(h.menh_chu)} / ${html(h.than_chu)}</dd>
      <dt>Lưu niên</dt><dd>${html(h.annual_year)} — ${html(h.annual_year_can_chi)}</dd>
      <dt>Khung địa chi</dt><dd>Dần → Mão → Thìn → Tỵ → Ngọ → Mùi → Thân → Dậu → Tuất → Hợi → Tý → Sửu</dd>
      <dt>Mã lá số</dt><dd>${html(state.chart.chart_id)}</dd>
    </dl>
    <div class="center-note">${html(h.placement_profile_label)}. ${html(h.time_rule)}</div>
  </section>`;
}

function renderTuViBoard() {
  const board = $("tuviBoard");
  board.innerHTML = state.chart.palaces.map(renderPalace).join("") + renderCenter();
  board.querySelectorAll(".palace").forEach(node => node.addEventListener("click", () => {
    state.selectedBranch = Number(node.dataset.branch);
    state.relationAll = false;
    $("relationSelect").value = String(state.selectedBranch);
    renderTuViBoard();
    renderRelations();
  }));
}

const elementColors = {"Kim":"#6B7280","Mộc":"#15803D","Thủy":"#1D4ED8","Hỏa":"#DC2626","Thổ":"#A16207"};
function renderBazi() {
  const b = state.chart.bazi;
  $("baziBasis").textContent = `${b.month_method_name} · ${b.month_basis_label}`;
  $("baziPillars").innerHTML = b.pillars.map(p => `<article class="pillar">
    <div class="pillar-label">TRỤ ${html(p.label).toUpperCase()}</div>
    <div class="pillar-text">${html(p.text)}</div>
    <div class="pillar-meta">${html(p.ten_god)}<br>Can ${html(p.stem_element)} · Chi ${html(p.branch_element)}<br>Nạp âm: ${html(p.nap_am)}<br>Tàng can: ${p.hidden_stems.map(x=>html(x.stem)+' ('+html(x.ten_god)+')').join(', ')}</div>
  </article>`).join("");
  const dm = b.day_master;
  $("dayMasterCard").innerHTML = `<h3>Nhật chủ</h3><strong style="font-size:22px;color:${elementColors[dm.element] || '#333'}">${html(dm.stem)} ${html(dm.element)}</strong><p>${html(dm.yin_yang)} · ${html(dm.preliminary_strength)} · tỷ lệ trợ lực ${html(dm.support_ratio_percent)}%</p><p><b>Cân bằng sơ bộ:</b> ${html(dm.balancing_elements_preliminary.join(', '))}</p><small>${html(dm.warning)}</small>`;
  const percentages = b.element_balance.percentages;
  $("elementBalance").innerHTML = Object.entries(percentages).map(([el,val]) => `<div class="element-row"><b>${html(el)}</b><div class="element-bar"><div class="element-fill" style="width:${val}%;background:${elementColors[el]}"></div></div><span>${val}%</span></div>`).join("") + `<small>Vượng: ${html(b.element_balance.dominant)} · Yếu: ${html(b.element_balance.weakest)}</small>`;
  const luck = b.luck_cycles;
  $("luckCycles").innerHTML = luck.cycles.map(c => `<div class="luck-cycle"><b>${html(c.text)}</b><br>${Number(c.start_age).toFixed(1)}–${Number(c.end_age).toFixed(1)} tuổi<br>${html(c.ten_god)}</div>`).join("");
}

const palaceOrder = ["mệnh","phụ mẫu","phúc đức","điền trạch","quan lộc","nô bộc","thiên di","tật ách","tài bạch","tử tức","phu thê","huynh đệ"];
function orderedPalaces() {
  if (!state.chart) return [];
  return [...state.chart.palaces].sort((a,b) => {
    const ai = palaceOrder.indexOf(normalizeName(a.palace_name));
    const bi = palaceOrder.indexOf(normalizeName(b.palace_name));
    return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
  });
}
function moveSelectedPalace(step) {
  const palaces = orderedPalaces();
  if (!palaces.length) return;
  let index = palaces.findIndex(p => Number(p.branch_id) === Number(state.selectedBranch));
  if (index < 0) index = 0;
  index = (index + step + palaces.length) % palaces.length;
  state.selectedBranch = Number(palaces[index].branch_id);
  state.relationAll = false;
  $("relationSelect").value = String(state.selectedBranch);
  renderRelations();
  renderTuViBoard();
}
function buildSelectors() {
  const palaces = orderedPalaces();
  $("relationSelect").innerHTML = palaces.map(p => `<option value="${p.branch_id}">${html(p.palace_name)} — ${html(p.branch_name)}</option>`).join("");
  $("relationSelect").value = String(state.selectedBranch);
  const topics = state.chart.combined_analysis.topics || [];
  $("combinedSelect").innerHTML = topics.map((t,i) => `<option value="${i}">${html(t.topic)}</option>`).join("");
  $("combinedSelect").value = String(state.selectedTopic);
}

function detailsChips(details) {
  if (!details?.length) return '<span class="muted">—</span>';
  return `<div class="star-chips">${details.map(s => `<span class="star-chip" style="color:${html(s.element_color || '#333')}">${html(s.label || `${s.name} (${s.element_name})`)}</span>`).join("")}</div>`;
}
function relationItem(title, item) {
  if (!item) return "";
  return `<article class="relation-item"><h3>${html(title)} · ${html(item.palace)} tại ${html(item.branch)}</h3>
    <p><span class="detail-label">Chính tinh:</span> ${detailsChips(item.major_star_details)}</p>
    <p><span class="detail-label">Sao tốt:</span> ${detailsChips(item.good_star_details)}</p>
    <p><span class="detail-label">Sao xấu:</span> ${detailsChips(item.bad_star_details)}</p>
    <p><span class="detail-label">Tứ Hóa:</span> ${detailsChips(item.transformation_details)}</p>
    <p><span class="detail-label">Tràng Sinh:</span> ${item.trang_sinh_detail ? detailsChips([item.trang_sinh_detail]) : '—'}</p>
    <p><span class="detail-label">Lưu niên:</span> ${detailsChips(item.annual_star_details)}</p>
    <p><b>${item.tuan ? 'Tuần' : ''}${item.tuan && item.triet ? ' · ' : ''}${item.triet ? 'Triệt' : ''}</b></p>
  </article>`;
}
function relationReport(rel) {
  return `<section class="relation-report card"><h2>${html(rel.palace)} tại ${html(rel.branch)}</h2><div class="relation-grid">
    ${relationItem("Bản cung",rel.self)}
    ${relationItem("Đối cung",rel.opposite)}
    ${(rel.trine || []).map((x,i)=>relationItem(`Tam hợp ${i+1}`,x)).join('')}
    ${(rel.adjacent || []).map((x,i)=>relationItem(`Giáp cung ${i+1}`,x)).join('')}
    ${relationItem("Nhị hợp",rel.six_harmony)}
    ${relationItem("Tương hại",rel.harm)}
    ${relationItem("Tương phá",rel.break)}
  </div></section>`;
}
function renderRelations() {
  if (!state.chart) return $("relationsContent").innerHTML = '<div class="empty-state card">Chưa có lá số.</div>';
  const relations = state.chart.relations;
  $("relationsContent").innerHTML = state.relationAll
    ? orderedPalaces().map(p => relationReport(relations[String(p.branch_id)])).join("")
    : relationReport(relations[String(state.selectedBranch)]);
}

function genericFacts(obj, depth=0) {
  if (obj == null) return "—";
  if (typeof obj !== "object") return html(obj);
  if (Array.isArray(obj)) return obj.slice(0,12).map(x => typeof x === "object" ? `<div class="fact-card">${genericFacts(x,depth+1)}</div>` : html(x)).join("");
  if (obj.label && obj.text) return `<b>${html(obj.label)}:</b> ${html(obj.text)}`;
  return Object.entries(obj).filter(([k]) => !["details","cycles","tu_vi_facts"].includes(k)).slice(0,16).map(([k,v]) => `<div class="fact-card"><b>${html(labelKey(k))}:</b> ${genericFacts(v,depth+1)}</div>`).join("");
}
function labelKey(k) {
  const map = {day_master:"Nhật chủ",month_pillar:"Trụ tháng",year_pillar:"Trụ năm",hour_pillar:"Trụ giờ",element_balance:"Ngũ Hành",dominant_element:"Hành vượng",weakest_element:"Hành yếu",wealth:"Tài tinh",officer:"Quan/Sát",resource:"Ấn tinh",output:"Thực/Thương",peer:"Tỷ/Kiếp",peer_resource:"Tỷ/Kiếp + Ấn",luck_cycles:"Đại vận",day_branch_spouse_palace:"Cung phối ngẫu",spouse_ten_gods:"Sao phối ngẫu",spouse_rule:"Quy tắc"};
  return map[k] || k.replaceAll('_',' ');
}
function combinedReport(topic) {
  const signals = state.chart.combined_analysis.cross_system_signals || [];
  return `<section class="combined-report card"><h2>${html(topic.topic)}</h2><div class="combined-columns">
    <article class="system-column"><h3>Tử Vi</h3>${(topic.tu_vi_facts || []).map(f => `<div class="fact-card"><b>${html(f.palace)} tại ${html(f.branch)}</b>${relationItem("Bản cung",f.self)}${relationItem("Đối cung",f.opposite)}</div>`).join('')}</article>
    <article class="system-column"><h3>Bát Tự</h3>${genericFacts(topic.bat_tu_facts)}</article>
    <article class="system-column"><h3>Đối chiếu</h3>${signals.map(s => `<div class="signal"><b>${html(s.relation)}</b><br>Tử Vi: ${html(s.tu_vi)} · Bát Tự: ${html(s.bat_tu)}${s.note ? '<br><small>'+html(s.note)+'</small>' : ''}</div>`).join('')}<div class="fact-card">Phần mềm chỉ chuẩn hóa dữ kiện. Kết luận diễn giải được tạo qua tab Prompt AI.</div></article>
  </div></section>`;
}
function renderCombined() {
  if (!state.chart) return $("combinedContent").innerHTML = '<div class="empty-state card">Chưa có lá số.</div>';
  const topics = state.chart.combined_analysis.topics || [];
  $("combinedContent").innerHTML = state.combinedAll ? topics.map(combinedReport).join("") : combinedReport(topics[state.selectedTopic]);
}

function renderJson() {
  $("jsonOutput").textContent = JSON.stringify(state.chart, null, 2);
}

async function buildPrompt() {
  if (!state.chart) { toast("Chưa có lá số"); return ""; }
  const kind = $("promptKind").value;
  let index = 0;
  if (kind === "relation") index = state.selectedBranch;
  if (kind === "combined") index = state.selectedTopic;
  $("buildPromptButton").disabled = true;
  try {
    const result = await callWorker("prompt", { kind, index });
    $("promptText").value = result.prompt;
    toast("Đã tạo prompt");
    return result.prompt;
  } catch (e) { alert(e.message); }
  finally { $("buildPromptButton").disabled = false; }
}

function downloadText(filename, content, type="text/plain;charset=utf-8") {
  const blob = new Blob([content], {type});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function copyText(text) {
  await navigator.clipboard.writeText(text);
  toast("Đã sao chép");
}
function downloadJson() {
  if (!state.chart) return;
  downloadText(`tuvi-battu-${state.chart.chart_id}.json`, JSON.stringify(state.chart,null,2), "application/json;charset=utf-8");
}
function saveProfile() {
  const parsed = parseForm();
  const profile = { ...parsed, date: $("birthDate").value, time: `${String(parsed.hour).padStart(2,"0")}:${String(parsed.minute).padStart(2,"0")}` };
  localStorage.setItem("tuvi-web-profile", JSON.stringify(profile));
  toast("Đã lưu hồ sơ trên trình duyệt");
}
function restoreProfile() {
  const raw = localStorage.getItem("tuvi-web-profile") || localStorage.getItem("tuvi-web-last-input");
  if (!raw) return;
  try {
    const p = JSON.parse(raw);
    if (p.name != null) $("name").value = p.name;
    if (p.gender != null) $("gender").value = String(p.gender);
    if (p.date) $("birthDate").value = p.date;
    else if (p.year) $("birthDate").value = `${String(p.year).padStart(4,'0')}-${String(p.month).padStart(2,'0')}-${String(p.day).padStart(2,'0')}`;
    let restoredHour = p.hour;
    let restoredMinute = p.minute;
    if (p.time && (restoredHour == null || restoredMinute == null)) {
      const match = String(p.time).match(/^(\d{1,2}):(\d{1,2})$/);
      if (match) { restoredHour = Number(match[1]); restoredMinute = Number(match[2]); }
    }
    if (restoredHour != null) $("birthHour").value = String(Math.min(23, Math.max(0, Number(restoredHour))));
    if (restoredMinute != null) $("birthMinute").value = String(Math.min(59, Math.max(0, Number(restoredMinute))));
    if (p.annual_year) $("annualYear").value = p.annual_year;
    if (p.tu_hoa_method) $("tuHoaMethod").value = p.tu_hoa_method;
  } catch (_) {}
}

function activateTab(tabName) {
  document.querySelectorAll(".tab-button").forEach(btn =>
    btn.classList.toggle("active", btn.dataset.tab === tabName)
  );
  document.querySelectorAll(".tab-panel").forEach(panel =>
    panel.classList.toggle("active", panel.id === `tab-${tabName}`)
  );
}

function bindEvents() {
  $("birthForm").addEventListener("submit", generate);
  $("saveProfileButton").addEventListener("click", saveProfile);
  document.querySelectorAll(".tab-button").forEach(btn =>
    btn.addEventListener("click", () => activateTab(btn.dataset.tab))
  );
  $("relationSelect").addEventListener("change", e => { state.selectedBranch=Number(e.target.value); state.relationAll=false; renderRelations(); renderTuViBoard(); });
  $("relationPrev").addEventListener("click", () => moveSelectedPalace(-1));
  $("relationNext").addEventListener("click", () => moveSelectedPalace(1));
  $("relationAll").addEventListener("click", () => { state.relationAll=true; renderRelations(); });
  $("combinedSelect").addEventListener("change", e => { state.selectedTopic=Number(e.target.value); state.combinedAll=false; renderCombined(); });
  $("combinedPrev").addEventListener("click", () => { const n=state.chart?.combined_analysis?.topics?.length||1; state.selectedTopic=(state.selectedTopic-1+n)%n; state.combinedAll=false; $("combinedSelect").value=state.selectedTopic; renderCombined(); });
  $("combinedNext").addEventListener("click", () => { const n=state.chart?.combined_analysis?.topics?.length||1; state.selectedTopic=(state.selectedTopic+1)%n; state.combinedAll=false; $("combinedSelect").value=state.selectedTopic; renderCombined(); });
  $("combinedAll").addEventListener("click", () => { state.combinedAll=true; renderCombined(); });
  $("buildPromptButton").addEventListener("click", buildPrompt);
  $("copyPromptButton").addEventListener("click", () => copyText($("promptText").value));
  $("downloadPromptButton").addEventListener("click", () => downloadText("prompt-tuvi-battu.txt", $("promptText").value));
  $("saveGeminiSettingsButton").addEventListener("click", saveGeminiSettings);
  $("testGeminiButton").addEventListener("click", testGeminiConnection);
  $("runGeminiButton").addEventListener("click", runGeminiAnalysis);
  $("runGeminiInlineButton")?.addEventListener("click", runGeminiAnalysis);
  $("copyGeminiButton").addEventListener("click", () => {
    const value = $("geminiOutput").dataset.raw || $("geminiOutput").innerText;
    copyText(value);
  });
  $("downloadGeminiButton").addEventListener("click", () => {
    const value = $("geminiOutput").dataset.raw || $("geminiOutput").innerText;
    downloadText("luan-giai-gemini.txt", value);
  });
  $("clearGeminiButton").addEventListener("click", clearGeminiResult);
  $("copyJsonButton").addEventListener("click", () => state.chart && copyText(JSON.stringify(state.chart,null,2)));
  $("downloadJsonButton").addEventListener("click", downloadJson);
  $("downloadJsonButton2").addEventListener("click", downloadJson);
  $("printButton").addEventListener("click", () => window.print());
}

window.addEventListener("DOMContentLoaded", () => {
  populateTime24Selects(17, 18);
  restoreProfile();
  restoreGeminiSettings();
  bindEvents();
  initWorker();
  setTimeout(() => testGeminiConnection({ silent: true }), 650);
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("service-worker.js?v=1.13").catch(()=>{});
});
