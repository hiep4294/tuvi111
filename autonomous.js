"use strict";

/* Hiep TuVi AUTO full-report adapter: tuvi111 locks FACT/CALC, local WebGPU AI writes the report. */
(function installAutonomousMode() {
  const originalCallWorker = window.callWorker;
  const originalParseForm = window.parseForm;
  const originalToast = window.toast;
  const LOCAL_MODEL_KEY = "tuvi-browser-ai-model";
  let hiepAiLoadPromise = null;
  let browserAiLoadPromise = null;
  let knowledgeLoadPromise = null;
  let aiBusy = false;
  let activeRun = 0;
  let chartGeneration = 0;

  function withTimeout(promise, timeoutMs, message) {
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(message)), timeoutMs);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
  }

  function loadScript(globalName, src, currentPromise, setPromise) {
    if (window[globalName]) return Promise.resolve(window[globalName]);
    if (currentPromise) return currentPromise;
    if (!document.head?.appendChild || !document.createElement) return Promise.resolve(null);
    const promise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = false;
      script.onload = () => resolve(window[globalName] || null);
      script.onerror = () => reject(new Error(`Không tải được ${src}.`));
      document.head.appendChild(script);
    }).catch((error) => {
      setPromise(null);
      console.warn(error);
      return null;
    });
    setPromise(promise);
    return promise;
  }

  function loadHiepTuViAI() {
    return loadScript("HiepTuViAI", "hiep-tuvi-ai.js?v=2.0.0", hiepAiLoadPromise, (value) => { hiepAiLoadPromise = value; });
  }

  function loadBrowserAI() {
    return loadScript("HiepBrowserAI", "browser-ai.js?v=1.1.1", browserAiLoadPromise, (value) => { browserAiLoadPromise = value; });
  }

  function loadHiepTuViKnowledge() {
    return loadScript("HiepTuViKnowledge", "hiep-tuvi-knowledge.js?v=1.0.0", knowledgeLoadPromise, (value) => { knowledgeLoadPromise = value; });
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[char]);
  }

  function subjectKindFromForm() {
    const value = String(document.getElementById("birthDate")?.value || "");
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return "unknown";
    const birthYear = Number(match[1]);
    const currentYear = new Date().getFullYear();
    return currentYear - birthYear < 18 ? "child" : "adult";
  }

  function localSummaryForAi(chart) {
    try {
      if (window.OfflineReading?.buildOfflineReading) return window.OfflineReading.buildOfflineReading(chart);
    } catch (_) {}
    return null;
  }

  function setAiBusy(busy) {
    aiBusy = busy;
    const buttons = [document.getElementById("runGeminiButton"), document.getElementById("runGeminiInlineButton")].filter(Boolean);
    for (const button of buttons) {
      button.disabled = busy;
      button.textContent = busy ? "AI đang tự luận giải..." : "AI luận giải lại";
    }
  }

  function setStatus(message, mode = "busy") {
    if (typeof window.setGeminiStatus === "function") window.setGeminiStatus(message, mode);
  }

  function reportMeta(model, completed, total, repairs) {
    const parts = ["Hiep TuVi AI chạy cục bộ trên WebGPU"];
    if (model) parts.push(model);
    parts.push(`${completed}/${total} phần`);
    if (repairs) parts.push(`đã tự sửa ${repairs} phần`);
    return parts.join(" · ");
  }

  function renderFullReport(parts, options = {}) {
    const output = document.getElementById("geminiOutput");
    if (!output) return;
    const total = Number(options.total || parts.length || 1);
    const raw = parts.map((part) => String(part.text || "").trim()).filter(Boolean).join("\n\n---\n\n");
    output.dataset.raw = raw;

    if (typeof window.renderMarkdownSafe === "function") {
      const sections = parts.map((part) => `<section class="ai-report-part" data-report-part="${escapeHtml(part.id || "")}">${window.renderMarkdownSafe(part.text)}</section>`).join("");
      const loading = options.loading
        ? `<div class="ai-loading"><span></span><p>${escapeHtml(options.loading)}${Number.isFinite(options.progress) ? ` ${Math.round(options.progress * 100)}%` : ""}</p></div>`
        : "";
      output.innerHTML = `<div class="ai-meta">${escapeHtml(reportMeta(options.model || "", parts.length, total, options.repairs || 0))}</div>${sections}${loading}`;
    } else {
      output.innerHTML = "";
      const meta = document.createElement("div");
      meta.className = "ai-meta";
      meta.textContent = reportMeta(options.model || "", parts.length, total, options.repairs || 0);
      const pre = document.createElement("pre");
      pre.textContent = raw + (options.loading ? `\n\n${options.loading}` : "");
      output.append(meta, pre);
    }
  }

  function renderAiError(error) {
    const output = document.getElementById("geminiOutput");
    if (!output) return;
    output.innerHTML = "";
    const node = document.createElement("div");
    node.className = "ai-error";
    node.textContent = `Không tạo được báo cáo Hiep TuVi AI: ${String(error?.message || error)}`;
    output.appendChild(node);
  }

  function restoreFallbackAfterAutoFailure(fallback, error) {
    const output = document.getElementById("geminiOutput");
    if (!output) return;
    output.innerHTML = "";
    const warning = document.createElement("div");
    warning.className = "ai-error";
    warning.textContent = `AI local chưa hoàn thành; giữ bản quy tắc cục bộ bên dưới. Lỗi: ${String(error?.message || error)}`;
    output.appendChild(warning);
    const holder = document.createElement("div");
    holder.innerHTML = fallback.html || '<p class="muted">Không có bản tổng luận dự phòng.</p>';
    while (holder.firstChild) output.appendChild(holder.firstChild);
    output.dataset.raw = fallback.raw || "";
  }

  function populateLocalModels(browserAi) {
    const modelNode = document.getElementById("geminiModel");
    if (!modelNode || !browserAi?.MODELS) return;
    const saved = localStorage.getItem(LOCAL_MODEL_KEY) || browserAi.DEFAULT_MODEL;
    modelNode.disabled = false;
    modelNode.innerHTML = "";
    for (const model of browserAi.MODELS) {
      const option = document.createElement("option");
      option.value = model.id;
      option.textContent = model.label;
      modelNode.appendChild(option);
    }
    modelNode.value = browserAi.MODELS.some((model) => model.id === saved) ? saved : browserAi.DEFAULT_MODEL;
    localStorage.setItem(LOCAL_MODEL_KEY, modelNode.value);
    modelNode.onchange = () => localStorage.setItem(LOCAL_MODEL_KEY, modelNode.value);
  }

  function configureLocalAiUi(browserAi) {
    const endpoint = document.getElementById("geminiEndpoint");
    const endpointLabel = endpoint?.closest?.("label");
    if (endpointLabel) endpointLabel.hidden = true;
    if (endpoint) endpoint.value = "";
    const save = document.getElementById("saveGeminiSettingsButton");
    if (save) save.hidden = true;
    const test = document.getElementById("testGeminiButton");
    if (test) test.textContent = "Kiểm tra WebGPU";
    populateLocalModels(browserAi);
  }

  function localModelCandidates(browserAi, preferredId) {
    const models = Array.isArray(browserAi?.MODELS) ? [...browserAi.MODELS] : [];
    const preferred = browserAi.modelRecord?.(preferredId) || models[0];
    const lighter = models
      .filter((model) => model.id !== preferred?.id && Number(model.vramMB || Infinity) < Number(preferred?.vramMB || Infinity))
      .sort((a, b) => Number(b.vramMB || 0) - Number(a.vramMB || 0));
    return [preferred, ...lighter].filter(Boolean);
  }

  async function requestLocal(prompt, model, options = {}) {
    const browserAi = await loadBrowserAI();
    if (!browserAi?.generate) throw new Error("Hiep Browser AI chưa sẵn sàng.");
    return browserAi.generate(prompt, {
      model,
      maxTokens: options.maxTokens || 1650,
      temperature: 0.18,
      onProgress: options.onProgress,
    });
  }

  async function requestLocalWithFallback(prompt, browserAi, preferredId, options = {}) {
    const candidates = localModelCandidates(browserAi, preferredId);
    let lastError = null;
    for (let index = 0; index < candidates.length; index += 1) {
      const model = candidates[index];
      try {
        if (index > 0) setStatus(`Model trước không chạy được · tự hạ xuống ${model.label}`, "busy");
        const data = await requestLocal(prompt, model.id, options);
        localStorage.setItem(LOCAL_MODEL_KEY, model.id);
        const modelNode = document.getElementById("geminiModel");
        if (modelNode) modelNode.value = model.id;
        return data;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error("Không có model local phù hợp với GPU hiện tại.");
  }

  function withKnowledge(prompt, knowledge, chart, job) {
    const pack = knowledge?.forJob?.(chart, job);
    if (!pack) return prompt;
    return `${prompt}\n\n### HIEP TUVI KNOWLEDGE PACK — NATIVE RULES, KHÔNG ĐƯỢC DÙNG NHƯ VERDICT\n${pack}`;
  }

  window.restoreGeminiSettings = function restoreAutoHiepTuViSettings() {
    setStatus("AI tự động · đang kiểm tra WebGPU", "");
    Promise.all([loadBrowserAI(), loadHiepTuViKnowledge()]).then(([browserAi]) => {
      if (!browserAi) return;
      configureLocalAiUi(browserAi);
      setStatus(browserAi.webGpuAvailable() ? "AI tự động · WebGPU sẵn sàng" : "AI tự động · thiếu WebGPU", browserAi.webGpuAvailable() ? "ready" : "error");
    });
  };

  window.testGeminiConnection = async function testLocalAi(options = {}) {
    if (options.silent) return Promise.resolve();
    const button = document.getElementById("testGeminiButton");
    if (button) button.disabled = true;
    try {
      const browserAi = await loadBrowserAI();
      if (!browserAi) throw new Error("Không tải được lớp Browser AI.");
      configureLocalAiUi(browserAi);
      const info = await browserAi.inspectGpu();
      if (!info.ok) throw new Error(info.reason || "WebGPU không sẵn sàng.");
      setStatus("WebGPU sẵn sàng · Hiep TuVi AI sẽ tự chạy sau khi lập lá số", "ready");
      window.toast?.("WebGPU sẵn sàng. Lập lá số xong AI sẽ tự luận giải.");
    } catch (error) {
      setStatus("WebGPU không sẵn sàng", "error");
      if (!options.silent) alert("Không thể chạy AI trực tiếp trong trình duyệt:\n" + error.message);
    } finally {
      if (button) button.disabled = false;
    }
  };

  window.runGeminiAnalysis = async function runAutoHiepTuViReport(options = {}) {
    if (aiBusy) return;
    const automatic = Boolean(options.automatic);
    const chart = window.__HIEP_TUVI_CHART__;
    if (!chart) {
      if (!automatic) alert("Chưa lập lá số. Hãy lập lá số trước.");
      return;
    }

    const output = document.getElementById("geminiOutput");
    const fallback = { html: output?.innerHTML || "", raw: output?.dataset?.raw || "" };
    const runId = ++activeRun;
    setAiBusy(true);
    setStatus(automatic ? "AI tự động đang chuẩn bị báo cáo Hiep Tuvi..." : "AI đang luận giải lại...", "busy");

    try {
      const [ai, browserAi, knowledge] = await Promise.all([loadHiepTuViAI(), loadBrowserAI(), loadHiepTuViKnowledge()]);
      if (runId !== activeRun) throw new Error("SUPERSEDED");
      if (!ai?.fullReportPlan || !ai?.buildFullReportSectionPrompt) throw new Error("Lớp Hiep TuVi FULL_REPORT chưa sẵn sàng.");
      if (!knowledge?.forJob) throw new Error("Knowledge pack Hiep Tuvi chưa sẵn sàng.");
      if (!browserAi?.webGpuAvailable()) throw new Error("Thiết bị không có WebGPU. AI local không thể tự chạy.");
      configureLocalAiUi(browserAi);

      let selectedModel = document.getElementById("geminiModel")?.value || localStorage.getItem(LOCAL_MODEL_KEY) || browserAi.DEFAULT_MODEL;
      localStorage.setItem(LOCAL_MODEL_KEY, selectedModel);
      const subjectKind = subjectKindFromForm();
      const localSummary = localSummaryForAi(chart);
      const plan = ai.fullReportPlan();
      const parts = [];
      let actualModel = selectedModel;
      let repairs = 0;

      for (let index = 0; index < plan.length; index += 1) {
        if (runId !== activeRun) throw new Error("SUPERSEDED");
        const job = plan[index];
        const label = `Đang luận ${index + 1}/${plan.length}: ${job.label}`;
        setStatus(label, "busy");
        renderFullReport(parts, { model: actualModel, total: plan.length, repairs, loading: label });

        const basePrompt = ai.buildFullReportSectionPrompt(chart, job, { subjectKind, localSummary });
        const prompt = withKnowledge(basePrompt, knowledge, chart, job);
        const maxTokens = job.kind === "palaces" ? 1700 : 1600;
        let data = await requestLocalWithFallback(prompt, browserAi, selectedModel, {
          maxTokens,
          onProgress(report) {
            if (runId !== activeRun) return;
            const text = String(report?.text || label);
            const progress = Number(report?.progress);
            setStatus(Number.isFinite(progress) ? `${text} ${Math.round(progress * 100)}%` : text, "busy");
            renderFullReport(parts, { model: actualModel, total: plan.length, repairs, loading: label, progress: Number.isFinite(progress) ? progress : undefined });
          },
        });
        if (runId !== activeRun) throw new Error("SUPERSEDED");
        actualModel = data.model || actualModel;
        selectedModel = actualModel;

        let issues = ai.validateFullReportSection(data.text, job);
        if (issues.length && repairs < 1) {
          repairs += 1;
          setStatus(`Phần ${index + 1} chưa đạt quality gate · tự sửa 1 lần`, "busy");
          const repairPrompt = ai.buildSectionRepairPrompt(prompt, data.text, issues);
          data = await requestLocalWithFallback(repairPrompt, browserAi, selectedModel, { maxTokens });
          if (runId !== activeRun) throw new Error("SUPERSEDED");
          actualModel = data.model || actualModel;
          selectedModel = actualModel;
          issues = ai.validateFullReportSection(data.text, job);
        }

        parts.push({ id: job.id, text: data.text, issues });
        renderFullReport(parts, { model: actualModel, total: plan.length, repairs });
      }

      if (runId !== activeRun) throw new Error("SUPERSEDED");
      const remainingIssues = parts.flatMap((part) => part.issues || []);
      renderFullReport(parts, { model: actualModel, total: plan.length, repairs });
      setStatus(remainingIssues.length ? "Hiep TuVi AI hoàn thành · còn cảnh báo chất lượng" : "Hiep TuVi AI · hoàn thành đầy đủ", remainingIssues.length ? "busy" : "ready");
      window.toast?.(automatic ? "AI đã tự hoàn thành báo cáo Hiep Tuvi" : "Đã luận giải lại theo Hiep Tuvi");
    } catch (error) {
      if (runId !== activeRun || String(error?.message || error) === "SUPERSEDED") return;
      if (automatic) {
        restoreFallbackAfterAutoFailure(fallback, error);
        setStatus("AI tự động chưa hoàn thành · đang hiển thị bản cục bộ", "error");
      } else {
        renderAiError(error);
        setStatus("Hiep TuVi AI lỗi", "error");
      }
    } finally {
      setAiBusy(false);
    }
  };

  function scheduleAutomaticReport(generation, chartId) {
    const tryStart = () => {
      if (generation !== chartGeneration) return;
      if (window.__HIEP_TUVI_CHART__?.chart_id !== chartId) return;
      if (aiBusy) {
        setTimeout(tryStart, 250);
        return;
      }
      window.runGeminiAnalysis?.({ automatic: true });
    };
    setTimeout(tryStart, 180);
  }

  window.callWorker = function callWorkerWithTimeout(action, payload = {}) {
    return withTimeout(
      Promise.resolve(originalCallWorker.call(this, action, payload)),
      action === "generate" ? 120000 : 30000,
      action === "generate"
        ? "Bộ máy tính quá 120 giây. Hãy tải lại trang và thử lại."
        : "Bộ máy không phản hồi sau 30 giây."
    ).then((result) => {
      if (action === "generate" && result?.chart) {
        window.__HIEP_TUVI_CHART__ = result.chart;
        const generation = ++chartGeneration;
        activeRun += 1; // invalidate any report still running for the previous chart
        scheduleAutomaticReport(generation, result.chart.chart_id);
      }
      return result;
    });
  };

  window.parseForm = function parseAndValidateForm() {
    const form = document.getElementById("birthForm");
    if (!form || !form.reportValidity()) throw new Error("Vui lòng kiểm tra các trường bắt buộc.");
    const value = originalParseForm.call(this);
    const birthDate = document.getElementById("birthDate")?.value || "";
    const match = birthDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const parsedDate = match ? new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))) : null;
    if (!match || parsedDate.getUTCFullYear() !== Number(match[1])
      || parsedDate.getUTCMonth() !== Number(match[2]) - 1
      || parsedDate.getUTCDate() !== Number(match[3])) {
      throw new Error("Ngày sinh không hợp lệ.");
    }
    if (value.year < 1600 || value.year > 2600) throw new Error("Năm sinh phải từ 1600 đến 2600.");
    if (!Number.isInteger(value.annual_year) || value.annual_year < 1600 || value.annual_year > 2600) {
      throw new Error("Năm lưu niên phải từ 1600 đến 2600.");
    }
    if (![1, -1].includes(value.gender)) throw new Error("Giới tính không hợp lệ.");
    if (value.name.length > 120) throw new Error("Họ tên không được quá 120 ký tự.");
    return value;
  };

  window.copyText = async function copyTextWithFallback(value) {
    const text = String(value || "");
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable");
      await navigator.clipboard.writeText(text);
    } catch (_) {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      if (!document.execCommand("copy")) throw new Error("Không thể sao chép tự động.");
      area.remove();
    }
    if (typeof window.toast === "function") window.toast("Đã sao chép");
  };

  window.toast = function resilientToast(message) {
    const normalized = String(message || "")
      .replace("Da lap la so. Gemini dang tu dong tong luan...", "Da lap la so tren thiet bi")
      .replace("Đã lập lá số. Gemini đang tự động tổng luận...", "Đã lập lá số trên thiết bị");
    return originalToast.call(this, normalized);
  };

  window.addEventListener("DOMContentLoaded", () => {
    loadHiepTuViAI();
    loadHiepTuViKnowledge();
    loadBrowserAI().then((browserAi) => {
      if (browserAi) configureLocalAiUi(browserAi);
    });

    const button = document.getElementById("generateButton");
    if (button) {
      const keepIndependentLabel = () => {
        if (!button.disabled && button.textContent !== "Lập lá số") button.textContent = "Lập lá số";
      };
      keepIndependentLabel();
      new MutationObserver(keepIndependentLabel).observe(button, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ["disabled"] });
    }

    if (document.querySelectorAll) {
      document.querySelectorAll(".gemini-panel, .inline-gemini-actions").forEach((node) => { node.hidden = false; });
      const resultPanel = document.getElementById("geminiResultPanel");
      const heading = resultPanel?.querySelector?.("h2");
      const kicker = resultPanel?.querySelector?.(".section-kicker");
      const tag = resultPanel?.querySelector?.(".tag");
      if (heading) heading.textContent = "Hiep TuVi AI — tự luận giải đầy đủ";
      if (kicker) kicker.textContent = "TUVI111 FACT/CALC · LOCAL WEBGPU · AUTO";
      if (tag) tag.textContent = "AUTO · HIEP_TUVI";
      document.querySelectorAll("#runGeminiButton, #runGeminiInlineButton").forEach((node) => { node.textContent = "AI luận giải lại"; });
      const inlineNote = document.querySelector(".inline-gemini-actions .muted");
      if (inlineNote) inlineNote.textContent = "Sau khi lập lá số, AI local tự viết: Data Quality → 12 cung → Bát Tự → Ngũ Hành → đối chiếu → phản biện → tổng kết. Không cần bấm thêm.";
      const panelTitle = document.querySelector(".gemini-panel h2");
      if (panelTitle) panelTitle.textContent = "Hiep TuVi AI — AUTO FULL REPORT";
      const resultNote = document.querySelector(".ai-result-location-note");
      if (resultNote) resultNote.textContent = "tuvi111 khóa dữ liệu an sao/Bát Tự; AI dùng knowledge pack Hiep Tuvi để diễn giải và tự chạy ngay sau khi lập lá số.";
    }

    window.addEventListener("offline", () => window.toast?.("Đang ngoại tuyến - tuvi111 vẫn hoạt động; AI dùng được nếu runtime/model đã cache"));
    window.addEventListener("online", () => window.toast?.("Đã kết nối lại mạng"));
  });
})();
