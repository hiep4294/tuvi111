"use strict";

/* Local-first Hiep TuVi AI adapter: tuvi111 computes, browser WebGPU AI only summarizes. */
(function installAutonomousMode() {
  const originalCallWorker = window.callWorker;
  const originalParseForm = window.parseForm;
  const originalToast = window.toast;
  const LOCAL_MODEL_KEY = "tuvi-browser-ai-model";
  const CLOUD_ENDPOINT_KEY = "tuvi-gemini-worker-endpoint";
  let hiepAiLoadPromise = null;
  let browserAiLoadPromise = null;

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
    return loadScript("HiepTuViAI", "hiep-tuvi-ai.js?v=1.2.0", hiepAiLoadPromise, (value) => { hiepAiLoadPromise = value; });
  }

  function loadBrowserAI() {
    return loadScript("HiepBrowserAI", "browser-ai.js?v=1.1.0", browserAiLoadPromise, (value) => { browserAiLoadPromise = value; });
  }

  function normalizeEndpoint(value) {
    return String(value || "").trim().replace(/\/+$/, "");
  }

  async function configureAiProxy() {
    const endpoint = normalizeEndpoint(localStorage.getItem(CLOUD_ENDPOINT_KEY) || "");
    if (!endpoint || !("serviceWorker" in navigator)) return false;
    const valid = endpoint.startsWith("https://") || endpoint.startsWith("http://localhost") || endpoint.startsWith("http://127.0.0.1");
    if (!valid) return false;
    const registration = await navigator.serviceWorker.ready;
    const worker = navigator.serviceWorker.controller || registration.active;
    if (!worker) return false;
    if (typeof MessageChannel === "undefined") {
      worker.postMessage({ type: "hiep-ai-endpoint", endpoint });
      return true;
    }
    return withTimeout(new Promise((resolve, reject) => {
      const channel = new MessageChannel();
      channel.port1.onmessage = (event) => {
        const data = event.data || {};
        if (data.ok) resolve(true);
        else reject(new Error(data.error || "Service Worker từ chối AI endpoint."));
      };
      worker.postMessage({ type: "hiep-ai-endpoint", endpoint }, [channel.port2]);
    }), 3000, "Service Worker chưa xác nhận AI fallback.");
  }

  function aiProxyUrl(path) {
    if (typeof location === "undefined") return path;
    return new URL(`./__hiep_ai_proxy__/${path}`, location.href).href;
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
    const buttons = [document.getElementById("runGeminiButton"), document.getElementById("runGeminiInlineButton")].filter(Boolean);
    for (const button of buttons) {
      button.disabled = busy;
      button.textContent = busy ? "AI local đang tổng kết..." : "AI local kết luận & tổng kết";
    }
  }

  function setProgress(message, progress) {
    const text = String(message || "Đang chuẩn bị AI local...");
    const pct = Number.isFinite(Number(progress)) ? Math.round(Number(progress) * 100) : null;
    if (typeof window.setGeminiStatus === "function") {
      window.setGeminiStatus(pct === null ? text : `${text} ${pct}%`, "busy");
    }
    const output = document.getElementById("geminiOutput");
    if (output) {
      output.innerHTML = `<div class="ai-loading"><span></span><p>${typeof window.html === "function" ? window.html(text) : text}${pct === null ? "" : ` ${pct}%`}</p></div>`;
    }
  }

  async function requestCloudSummary(prompt, model, metadata = {}) {
    await configureAiProxy();
    const response = await withTimeout(fetch(aiProxyUrl("analyze"), {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({
        prompt,
        model,
        max_output_tokens: 5000,
        metadata: { prompt_kind: "final_summary_only", summary_only: true, ...metadata },
      }),
      cache: "no-store",
    }), 180000, "AI fallback không phản hồi.");
    const text = await response.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch (_) { data = { error: text }; }
    if (!response.ok) throw new Error(data.error || data.message || `HTTP ${response.status}`);
    if (!data.text) throw new Error("AI fallback không trả về kết luận.");
    data.local = false;
    return data;
  }

  async function requestLocalSummary(prompt, model, options = {}) {
    const browserAi = await loadBrowserAI();
    if (!browserAi?.generate) throw new Error("Hiep Browser AI chưa sẵn sàng.");
    return browserAi.generate(prompt, {
      model,
      maxTokens: options.maxTokens || 1300,
      temperature: 0.2,
      onProgress(report) {
        setProgress(report?.text || "Đang tải/chạy model local...", report?.progress);
      },
    });
  }

  function renderFinalSummary(data, quality) {
    const output = document.getElementById("geminiOutput");
    if (!output) return;
    const usage = Number(data?.usage?.total_tokens || data?.usage?.total_token_count || data?.usage?.totalTokenCount || 0);
    const repaired = quality?.repaired ? " · đã tự sửa 1 lần" : "";
    const local = data?.local !== false;
    const model = String(data?.model || "");
    const meta = `${local ? "AI chạy cục bộ trên WebGPU" : "AI fallback cloud"}${model ? ` · ${model}` : ""}${repaired}${usage ? ` · ${usage} token` : ""}`;
    output.dataset.raw = String(data.text || "");
    if (typeof window.renderMarkdownSafe === "function") {
      output.innerHTML = `<div class="ai-meta">${meta}</div><section class="ai-report-part">${window.renderMarkdownSafe(data.text)}</section>`;
    } else {
      output.innerHTML = "";
      const metaNode = document.createElement("div");
      metaNode.className = "ai-meta";
      metaNode.textContent = meta;
      const pre = document.createElement("pre");
      pre.textContent = String(data.text || "");
      output.append(metaNode, pre);
    }
  }

  function renderAiError(error) {
    const output = document.getElementById("geminiOutput");
    if (!output) return;
    output.innerHTML = "";
    const node = document.createElement("div");
    node.className = "ai-error";
    node.textContent = `Không tạo được kết luận AI local: ${String(error?.message || error)}`;
    output.appendChild(node);
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

  window.restoreGeminiSettings = function restoreLocalAiSettings() {
    if (typeof window.setGeminiStatus === "function") window.setGeminiStatus("AI local · chưa kiểm tra", "");
    loadBrowserAI().then((browserAi) => {
      if (!browserAi) return;
      configureLocalAiUi(browserAi);
      if (typeof window.setGeminiStatus === "function") {
        window.setGeminiStatus(browserAi.webGpuAvailable() ? "AI local · WebGPU sẵn sàng" : "AI local · thiếu WebGPU", browserAi.webGpuAvailable() ? "ready" : "error");
      }
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
      if (typeof window.setGeminiStatus === "function") window.setGeminiStatus("WebGPU sẵn sàng · model chạy trên máy", "ready");
      window.toast?.("WebGPU sẵn sàng. Model sẽ được tải/cached khi chạy lần đầu.");
    } catch (error) {
      if (typeof window.setGeminiStatus === "function") window.setGeminiStatus("WebGPU không sẵn sàng", "error");
      if (!options.silent) alert("Không thể chạy AI trực tiếp trong trình duyệt:\n" + error.message);
    } finally {
      if (button) button.disabled = false;
    }
  };

  window.runGeminiAnalysis = async function runBrowserSummaryAi(options = {}) {
    if (options.automatic) return Promise.resolve();
    const chart = window.__HIEP_TUVI_CHART__;
    if (!chart) {
      alert("Chưa lập lá số. Hãy lập lá số trước khi yêu cầu AI kết luận.");
      return;
    }

    setAiBusy(true);
    setProgress("Đang chuẩn bị AI local...", null);
    try {
      const [ai, browserAi] = await Promise.all([loadHiepTuViAI(), loadBrowserAI()]);
      if (!ai?.buildBrowserSummaryPrompt) throw new Error("Lớp Hiep TuVi AI compact chưa sẵn sàng.");
      if (!browserAi) throw new Error("Lớp Browser AI chưa sẵn sàng.");
      configureLocalAiUi(browserAi);

      const selectedModel = document.getElementById("geminiModel")?.value || localStorage.getItem(LOCAL_MODEL_KEY) || browserAi.DEFAULT_MODEL;
      localStorage.setItem(LOCAL_MODEL_KEY, selectedModel);
      const subjectKind = subjectKindFromForm();
      const prompt = ai.buildBrowserSummaryPrompt(chart, {
        subjectKind,
        localSummary: localSummaryForAi(chart),
        includeAnnual: false,
      });

      let data;
      let usingLocal = browserAi.webGpuAvailable();
      if (usingLocal) {
        data = await requestLocalSummary(prompt, selectedModel, { maxTokens: 1300 });
      } else {
        const fallbackEndpoint = normalizeEndpoint(localStorage.getItem(CLOUD_ENDPOINT_KEY) || "");
        if (!fallbackEndpoint) throw new Error("Thiết bị không có WebGPU và chưa cấu hình fallback cloud.");
        const fullPrompt = ai.buildSummaryPrompt(chart, { subjectKind, localSummary: localSummaryForAi(chart) });
        data = await requestCloudSummary(fullPrompt, "gemini-3.8-flash", { chart_id: chart.chart_id || null });
        usingLocal = false;
      }

      const minLength = usingLocal ? 2200 : 3500;
      const issuesBefore = ai.validateSummary(data.text, { minLength });
      let quality = { repaired: false, issues_before: issuesBefore, issues_after: issuesBefore };

      if (issuesBefore.length) {
        if (typeof window.setGeminiStatus === "function") window.setGeminiStatus("Kết luận chưa đạt, đang tự sửa 1 lần...", "busy");
        if (usingLocal) {
          const repairPrompt = ai.buildRepairPrompt(prompt, data.text, issuesBefore, { priorLimit: 1200 });
          data = await requestLocalSummary(repairPrompt, selectedModel, { maxTokens: 1400 });
        } else {
          const fullPrompt = ai.buildSummaryPrompt(chart, { subjectKind, localSummary: localSummaryForAi(chart) });
          const repairPrompt = ai.buildRepairPrompt(fullPrompt, data.text, issuesBefore, { priorLimit: 6000 });
          data = await requestCloudSummary(repairPrompt, "gemini-3.8-flash", { chart_id: chart.chart_id || null, repair: true });
        }
        quality = { repaired: true, issues_before: issuesBefore, issues_after: ai.validateSummary(data.text, { minLength }) };
      }

      renderFinalSummary(data, quality);
      if (typeof window.setGeminiStatus === "function") {
        const mode = quality.issues_after.length ? "busy" : "ready";
        const prefix = data.local === false ? "AI fallback" : "AI local";
        window.setGeminiStatus(quality.issues_after.length ? `${prefix} · còn cảnh báo chất lượng` : `${prefix} · hoàn thành`, mode);
      }
      window.toast?.(data.local === false ? "Đã hoàn thành bằng AI fallback" : "Đã hoàn thành bằng AI chạy trực tiếp trên máy");
    } catch (error) {
      renderAiError(error);
      if (typeof window.setGeminiStatus === "function") window.setGeminiStatus("AI local lỗi", "error");
    } finally {
      setAiBusy(false);
    }
  };

  window.callWorker = function callWorkerWithTimeout(action, payload = {}) {
    return withTimeout(
      Promise.resolve(originalCallWorker.call(this, action, payload)),
      action === "generate" ? 120000 : 30000,
      action === "generate"
        ? "Bộ máy tính quá 120 giây. Hãy tải lại trang và thử lại."
        : "Bộ máy không phản hồi sau 30 giây."
    ).then((result) => {
      if (action === "generate" && result?.chart) window.__HIEP_TUVI_CHART__ = result.chart;
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
      if (heading) heading.textContent = "Hiep TuVi Local AI — kết luận & tổng kết";
      if (kicker) kicker.textContent = "TUVI111 LOCAL ENGINE · WEBGPU LOCAL LLM";
      if (tag) tag.textContent = "LOCAL · SUMMARY_ONLY";
      document.querySelectorAll("#runGeminiButton, #runGeminiInlineButton").forEach((node) => { node.textContent = "AI local kết luận & tổng kết"; });
      const inlineNote = document.querySelector(".inline-gemini-actions .muted");
      if (inlineNote) inlineNote.textContent = "Lá số/Bát Tự chạy bằng tuvi111; model AI chạy trực tiếp trên GPU của trình duyệt. Lần đầu tải model, các lần sau dùng cache trình duyệt.";
      const panelTitle = document.querySelector(".gemini-panel h2");
      if (panelTitle) panelTitle.textContent = "Hiep TuVi Local AI";
      const resultNote = document.querySelector(".ai-result-location-note");
      if (resultNote) resultNote.textContent = "Không cần API key/VPS. GitHub Pages chỉ host ứng dụng; model thực thi bằng WebGPU ngay trên thiết bị người dùng.";
    }

    window.addEventListener("offline", () => window.toast?.("Đang ngoại tuyến - tuvi111 vẫn hoạt động; AI local dùng được nếu runtime/model đã có trong cache"));
    window.addEventListener("online", () => window.toast?.("Đã kết nối lại mạng"));
  });
})();
