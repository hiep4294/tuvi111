"use strict";

/* Resilience + Hiep TuVi AI summary-only adapter for Tu Vi + Bat Tu Web. */
(function installAutonomousMode() {
  const originalCallWorker = window.callWorker;
  const originalParseForm = window.parseForm;
  const originalToast = window.toast;
  let hiepAiLoadPromise = null;

  function withTimeout(promise, timeoutMs, message) {
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(message)), timeoutMs);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
  }

  function loadHiepTuViAI() {
    if (window.HiepTuViAI) return Promise.resolve(window.HiepTuViAI);
    if (hiepAiLoadPromise) return hiepAiLoadPromise;
    if (!document.head?.appendChild || !document.createElement) return Promise.resolve(null);
    hiepAiLoadPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "hiep-tuvi-ai.js?v=1.1.0";
      script.async = false;
      script.onload = () => resolve(window.HiepTuViAI || null);
      script.onerror = () => reject(new Error("Không tải được lớp Hiep TuVi AI."));
      document.head.appendChild(script);
    }).catch((error) => {
      hiepAiLoadPromise = null;
      console.warn(error);
      return null;
    });
    return hiepAiLoadPromise;
  }

  function normalizeEndpoint(value) {
    return String(value || "").trim().replace(/\/+$/, "");
  }

  async function configureAiProxy() {
    const endpoint = normalizeEndpoint(localStorage.getItem("tuvi-gemini-worker-endpoint") || document.getElementById("geminiEndpoint")?.value || "");
    if (!endpoint || !("serviceWorker" in navigator)) return false;
    const valid = endpoint.startsWith("https://") || endpoint.startsWith("http://localhost") || endpoint.startsWith("http://127.0.0.1");
    if (!valid) throw new Error("AI Worker phải dùng HTTPS hoặc localhost.");
    const registration = await navigator.serviceWorker.ready;
    const worker = navigator.serviceWorker.controller || registration.active;
    if (!worker) throw new Error("Service Worker chưa sẵn sàng. Hãy tải lại trang một lần.");

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
    }), 3000, "Service Worker chưa xác nhận cấu hình AI endpoint.");
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
      button.textContent = busy ? "AI đang tổng kết..." : "AI kết luận & tổng kết";
    }
  }

  async function requestFinalSummary(prompt, model, metadata = {}) {
    const response = await withTimeout(fetch(aiProxyUrl("analyze"), {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({
        prompt,
        model,
        max_output_tokens: 7000,
        metadata: {
          prompt_kind: "final_summary_only",
          summary_only: true,
          ...metadata,
        },
      }),
      cache: "no-store",
    }), 180000, "Hiep TuVi AI không phản hồi sau 180 giây.");
    const text = await response.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; }
    catch (_) { data = { error: text }; }
    if (!response.ok) throw new Error(data.error || data.message || `HTTP ${response.status}`);
    if (!data.text) throw new Error("AI không trả về phần kết luận.");
    return data;
  }

  function renderFinalSummary(data, quality) {
    const output = document.getElementById("geminiOutput");
    if (!output) return;
    const usage = Number(data?.usage?.total_token_count || data?.usage?.totalTokenCount || 0);
    const repaired = quality?.repaired ? " · đã tự sửa 1 lần" : "";
    const meta = `AI chỉ kết luận/tổng kết${repaired}${usage ? ` · ${usage} token` : ""}`;
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
    node.textContent = `Không tạo được kết luận AI: ${String(error?.message || error)}`;
    output.appendChild(node);
  }

  window.restoreGeminiSettings = function restoreOptionalAiSettings() {
    const endpoint = String(localStorage.getItem("tuvi-gemini-worker-endpoint") || "").trim();
    const endpointNode = document.getElementById("geminiEndpoint");
    if (endpointNode) endpointNode.value = endpoint;
    const modelNode = document.getElementById("geminiModel");
    if (modelNode) {
      modelNode.innerHTML = '<option value="gemini-3.8-flash" selected>Gemini 3.8 Flash — tổng kết</option>';
      modelNode.value = "gemini-3.8-flash";
    }
    if (typeof window.setGeminiStatus === "function") {
      window.setGeminiStatus(endpoint ? "Hiep TuVi AI đã cấu hình" : "AI đang tắt", endpoint ? "ready" : "");
    }
  };

  window.testGeminiConnection = async function testOptionalAi(options = {}) {
    if (options.silent) return Promise.resolve();
    const endpoint = normalizeEndpoint(document.getElementById("geminiEndpoint")?.value || localStorage.getItem("tuvi-gemini-worker-endpoint"));
    if (!endpoint) {
      if (!options.silent) alert("Chưa nhập địa chỉ AI Worker.");
      return;
    }
    if (typeof window.setGeminiStatus === "function") window.setGeminiStatus("Đang kiểm tra Hiep TuVi AI...", "busy");
    const button = document.getElementById("testGeminiButton");
    if (button) button.disabled = true;
    try {
      await loadHiepTuViAI();
      await configureAiProxy();
      const response = await withTimeout(fetch(aiProxyUrl("health"), { headers: { "Accept": "application/json" }, cache: "no-store" }), 12000, "Hết thời gian kiểm tra kết nối AI.");
      const text = await response.text();
      let data = {};
      try { data = text ? JSON.parse(text) : {}; } catch (_) { data = { error: text }; }
      if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
      if (typeof window.setGeminiStatus === "function") window.setGeminiStatus("Hiep TuVi AI kết nối tốt", "ready");
      window.toast?.("AI Worker hoạt động — AI chỉ dùng cho kết luận/tổng kết");
    } catch (error) {
      if (typeof window.setGeminiStatus === "function") window.setGeminiStatus("Kết nối AI lỗi", "error");
      if (!options.silent) alert("Không kết nối được Hiep TuVi AI:\n" + error.message);
    } finally {
      if (button) button.disabled = false;
    }
  };

  window.runGeminiAnalysis = async function runSummaryOnlyAi(options = {}) {
    if (options.automatic) return Promise.resolve();
    const chart = window.__HIEP_TUVI_CHART__;
    if (!chart) {
      alert("Chưa lập lá số. Hãy lập lá số trước khi yêu cầu AI kết luận.");
      return;
    }
    const endpoint = normalizeEndpoint(document.getElementById("geminiEndpoint")?.value || localStorage.getItem("tuvi-gemini-worker-endpoint"));
    if (!endpoint) {
      alert("Chưa cấu hình AI Worker. Phần lập lá số và phân tích cục bộ vẫn dùng được bình thường.");
      return;
    }

    setAiBusy(true);
    if (typeof window.setGeminiStatus === "function") window.setGeminiStatus("AI đang đọc kết quả cục bộ và tổng kết...", "busy");
    const output = document.getElementById("geminiOutput");
    if (output) output.innerHTML = '<div class="ai-loading"><span></span><p>AI chỉ đang đối chiếu và kết luận từ dữ liệu đã tính.</p></div>';

    try {
      const ai = await loadHiepTuViAI();
      if (!ai?.buildSummaryPrompt) throw new Error("Lớp Hiep TuVi AI SUMMARY_ONLY chưa sẵn sàng.");
      await configureAiProxy();
      const model = document.getElementById("geminiModel")?.value || "gemini-3.8-flash";
      const prompt = ai.buildSummaryPrompt(chart, {
        subjectKind: subjectKindFromForm(),
        localSummary: localSummaryForAi(chart),
      });
      let data = await requestFinalSummary(prompt, model, { chart_id: chart.chart_id || null });
      const issuesBefore = ai.validateSummary(data.text);
      let quality = { repaired: false, issues_before: issuesBefore, issues_after: issuesBefore };

      if (issuesBefore.length) {
        if (typeof window.setGeminiStatus === "function") window.setGeminiStatus("Kết luận chưa đạt, AI đang tự sửa một lần...", "busy");
        const repairPrompt = ai.buildRepairPrompt(prompt, data.text, issuesBefore);
        data = await requestFinalSummary(repairPrompt, model, { chart_id: chart.chart_id || null, repair: true });
        quality = { repaired: true, issues_before: issuesBefore, issues_after: ai.validateSummary(data.text) };
      }

      renderFinalSummary(data, quality);
      if (typeof window.setGeminiStatus === "function") {
        window.setGeminiStatus(quality.issues_after.length ? "Đã tổng kết · còn cảnh báo chất lượng" : "Đã kết luận & tổng kết", quality.issues_after.length ? "busy" : "ready");
      }
      window.toast?.("Đã hoàn thành kết luận AI");
    } catch (error) {
      renderAiError(error);
      if (typeof window.setGeminiStatus === "function") window.setGeminiStatus("AI tổng kết lỗi", "error");
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
    const button = document.getElementById("generateButton");
    if (button) {
      const keepIndependentLabel = () => {
        if (!button.disabled && button.textContent !== "Lập lá số") button.textContent = "Lập lá số";
      };
      keepIndependentLabel();
      new MutationObserver(keepIndependentLabel).observe(button, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ["disabled"] });
    }

    const endpoint = document.getElementById("geminiEndpoint");
    if (endpoint && !localStorage.getItem("tuvi-gemini-worker-endpoint")) endpoint.value = "";

    if (document.querySelectorAll) {
      document.querySelectorAll(".gemini-panel, .inline-gemini-actions").forEach((node) => { node.hidden = false; });
      const resultPanel = document.getElementById("geminiResultPanel");
      const heading = resultPanel?.querySelector?.("h2");
      const kicker = resultPanel?.querySelector?.(".section-kicker");
      const tag = resultPanel?.querySelector?.(".tag");
      if (heading) heading.textContent = "Hiep TuVi AI — kết luận & tổng kết";
      if (kicker) kicker.textContent = "TUVI111 TỰ TÍNH · AI CHỈ KẾT LUẬN";
      if (tag) tag.textContent = "SUMMARY_ONLY";
      document.querySelectorAll("#runGeminiButton, #runGeminiInlineButton").forEach((node) => { node.textContent = "AI kết luận & tổng kết"; });
      const inlineNote = document.querySelector(".inline-gemini-actions .muted");
      if (inlineNote) inlineNote.textContent = "12 cung, Bát Tự và quan hệ cung chạy bằng engine cục bộ. AI chỉ nhận kết quả cuối để đối chiếu, phản biện và tổng kết.";
      const panelTitle = document.querySelector(".gemini-panel h2");
      if (panelTitle) panelTitle.textContent = "Hiep TuVi AI";
      const resultNote = document.querySelector(".ai-result-location-note");
      if (resultNote) resultNote.textContent = "AI không lập lại 12 cung. Sau khi hệ thống tính xong, bấm AI kết luận & tổng kết để gửi một gói evidence cuối tới Worker.";
    }

    window.addEventListener("offline", () => window.toast?.("Đang ngoại tuyến - bộ máy cục bộ vẫn hoạt động"));
    window.addEventListener("online", () => window.toast?.("Đã kết nối lại mạng"));
  });
})();
