"use strict";

/* Resilience layer for Tu Vi + Bat Tu Web v1.18.
 * Loaded after app.js and before DOMContentLoaded.
 */
(function installAutonomousMode() {
  const originalRunGemini = window.runGeminiAnalysis;
  const originalTestGemini = window.testGeminiConnection;
  const originalCallWorker = window.callWorker;
  const originalParseForm = window.parseForm;
  const originalToast = window.toast;

  function withTimeout(promise, timeoutMs, message) {
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(message)), timeoutMs);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
  }

  window.restoreGeminiSettings = function restoreOptionalAiSettings() {
    const endpoint = String(localStorage.getItem("tuvi-gemini-worker-endpoint") || "").trim();
    const endpointNode = document.getElementById("geminiEndpoint");
    if (endpointNode) endpointNode.value = endpoint;
    const modelNode = document.getElementById("geminiModel");
    if (modelNode) modelNode.value = "gemini-3.5-flash";
    if (typeof window.setGeminiStatus === "function") {
      window.setGeminiStatus(endpoint ? "Đã cấu hình tùy chọn" : "AI đang tắt", endpoint ? "ready" : "");
    }
  };

  window.testGeminiConnection = function testOptionalAi(options = {}) {
    if (options.silent) return Promise.resolve();
    return withTimeout(
      Promise.resolve(originalTestGemini.call(this, options)),
      12000,
      "Hết thời gian kiểm tra kết nối AI."
    );
  };

  window.runGeminiAnalysis = function runOptionalAi(options = {}) {
    if (options.automatic) return Promise.resolve();
    return withTimeout(
      Promise.resolve(originalRunGemini.call(this, options)),
      90000,
      "AI không phản hồi sau 90 giây. Lá số vẫn được giữ nguyên."
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

    window.addEventListener("offline", () => window.toast?.("Đang ngoại tuyến - bộ máy cục bộ vẫn hoạt động"));
    window.addEventListener("online", () => window.toast?.("Đã kết nối lại mạng"));
  });
})();
