"use strict";

/* Resilience + Hiep TuVi AI adapter for Tu Vi + Bat Tu Web v1.18. */
(function installAutonomousMode() {
  const originalRunGemini = window.runGeminiAnalysis;
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
      script.src = "hiep-tuvi-ai.js?v=1.0.0";
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
    worker.postMessage({ type: "hiep-ai-endpoint", endpoint });
    return true;
  }

  function aiProxyUrl(path) {
    if (typeof location === "undefined") return path;
    return new URL(`./__hiep_ai_proxy__/${path}`, location.href).href;
  }

  // requestGeminiPart() trong app.js gọi hàm này. Đổi sang same-origin proxy để
  // GitHub Pages vẫn giữ CSP chặt trong khi Service Worker gọi AI Worker bên ngoài.
  window.geminiAnalyzeUrl = function hiepProxyAnalyzeUrl() {
    return aiProxyUrl("analyze");
  };

  window.restoreGeminiSettings = function restoreOptionalAiSettings() {
    const endpoint = String(localStorage.getItem("tuvi-gemini-worker-endpoint") || "").trim();
    const endpointNode = document.getElementById("geminiEndpoint");
    if (endpointNode) endpointNode.value = endpoint;
    const modelNode = document.getElementById("geminiModel");
    if (modelNode) modelNode.value = "gemini-3.5-flash";
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
      window.toast?.("AI Worker hoạt động và đã nối lớp Hiep TuVi AI");
    } catch (error) {
      if (typeof window.setGeminiStatus === "function") window.setGeminiStatus("Kết nối AI lỗi", "error");
      if (!options.silent) alert("Không kết nối được Hiep TuVi AI:\n" + error.message);
    } finally {
      if (button) button.disabled = false;
    }
  };

  window.runGeminiAnalysis = async function runOptionalAi(options = {}) {
    if (options.automatic) return Promise.resolve();
    await loadHiepTuViAI();
    await configureAiProxy();
    return withTimeout(
      Promise.resolve(originalRunGemini.call(this, options)),
      180000,
      "Hiep TuVi AI không phản hồi sau 180 giây. Lá số vẫn được giữ nguyên."
    );
  };

  window.callWorker = function callWorkerWithTimeout(action, payload = {}) {
    return withTimeout(
      Promise.resolve(originalCallWorker.call(this, action, payload)),
      action === "generate" ? 120000 : 30000,
      action === "generate"
        ? "Bộ máy tính quá 120 giây. Hãy tải lại trang và thử lại."
        : "Bộ máy không phản hồi sau 30 giây."
    );
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
      if (heading) heading.textContent = "Hiep TuVi AI — luận giải chuyên sâu";
      if (kicker) kicker.textContent = "TUVI111 ENGINE · HIEP TUVI AI";
      if (tag) tag.textContent = "LONG_INTEGRATED";
      document.querySelectorAll("#runGeminiButton, #runGeminiInlineButton").forEach((node) => { node.textContent = "Phân tích chuyên sâu — 15 bước"; });
    }

    window.addEventListener("offline", () => window.toast?.("Đang ngoại tuyến - bộ máy cục bộ vẫn hoạt động"));
    window.addEventListener("online", () => window.toast?.("Đã kết nối lại mạng"));
  });
})();
