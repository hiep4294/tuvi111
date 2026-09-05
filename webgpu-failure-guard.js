"use strict";

(function installWebGpuFailureGuard() {
  const SESSION_KEY = "hiep-tuvi-webgpu-shader-failed";
  const original = window.runGeminiAnalysis;
  if (typeof original !== "function") return;

  function blocked() {
    try { return sessionStorage.getItem(SESSION_KEY) === "1"; }
    catch (_) { return false; }
  }

  function markBlocked() {
    try { sessionStorage.setItem(SESSION_KEY, "1"); }
    catch (_) {}
  }

  function isShaderFailure(text) {
    return /Invalid ShaderModule|index_kernel|shader module|shader compilation/i.test(String(text || ""));
  }

  function softenShaderFailure(rawText) {
    const output = document.getElementById("geminiOutput");
    if (!output) return;
    const warning = output.querySelector?.(".ai-error");
    if (!warning) return;
    warning.textContent = "GPU/driver hiện tại không chạy được model WebGPU. Phần dưới vẫn là báo cáo Hiep TuVi cục bộ đầy đủ: đủ 12 cung, Bát Tự, phản biện và tổng kết.";
    const details = document.createElement("details");
    details.className = "ai-tech-details";
    const summary = document.createElement("summary");
    summary.textContent = "Chi tiết kỹ thuật WebGPU";
    const code = document.createElement("code");
    code.textContent = String(rawText || "WebGPU shader validation failed.").slice(0, 1200);
    details.append(summary, code);
    warning.insertAdjacentElement?.("afterend", details);
  }

  window.runGeminiAnalysis = async function guardedHiepTuViAnalysis(options = {}) {
    if (options.automatic && blocked()) {
      window.setGeminiStatus?.("WebGPU không tương thích · dùng báo cáo local đầy đủ", "ready");
      return;
    }

    const result = await original.call(this, options);
    const output = document.getElementById("geminiOutput");
    const text = output?.textContent || output?.innerText || "";
    if (isShaderFailure(text)) {
      markBlocked();
      softenShaderFailure(text);
      window.setGeminiStatus?.("Đã chuyển sang Hiep TuVi Local Rules", "ready");
    }
    return result;
  };
})();
