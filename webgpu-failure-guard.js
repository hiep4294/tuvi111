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

  function userAgentText() {
    try { return String(navigator.userAgent || ""); }
    catch (_) { return ""; }
  }

  function isMobileLike() {
    try {
      if (navigator.userAgentData?.mobile) return true;
      const ua = userAgentText();
      if (/Android|iPhone|iPad|iPod|Mobile/i.test(ua)) return true;
      // iPadOS can present a desktop/Macintosh user agent.
      if (/Macintosh/i.test(ua) && Number(navigator.maxTouchPoints || 0) > 1) return true;
      return false;
    } catch (_) {
      return false;
    }
  }

  function isLowMemoryDevice() {
    try {
      const memoryGb = Number(navigator.deviceMemory || 0);
      return memoryGb > 0 && memoryGb < 8;
    } catch (_) {
      return false;
    }
  }

  function skipAutomaticAiReason() {
    if (isMobileLike()) return "mobile";
    if (isLowMemoryDevice()) return "low-memory";
    return "";
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

  function showMobileSafeMode() {
    window.setGeminiStatus?.("Điện thoại: AI WebGPU đã tắt để tránh quá tải RAM", "ready");
    window.toast?.("Đã giữ chế độ ổn định trên điện thoại; báo cáo Hiep TuVi cục bộ vẫn đầy đủ.");
  }

  window.runGeminiAnalysis = async function guardedHiepTuViAnalysis(options = {}) {
    const automatic = Boolean(options.automatic);
    const constrainedReason = skipAutomaticAiReason();

    // Critical mobile stability guard: local Qwen models need multiple GB of GPU/RAM.
    // Safari/iOS can terminate the whole WebContent process before JS gets an exception.
    if (isMobileLike()) {
      showMobileSafeMode();
      return { skipped: true, reason: "mobile-memory-guard" };
    }

    if (automatic && constrainedReason) {
      window.setGeminiStatus?.("Thiết bị RAM thấp: dùng báo cáo local đầy đủ", "ready");
      return { skipped: true, reason: constrainedReason };
    }

    if (automatic && blocked()) {
      window.setGeminiStatus?.("WebGPU không tương thích · dùng báo cáo local đầy đủ", "ready");
      return { skipped: true, reason: "webgpu-session-blocked" };
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

  window.HiepWebGpuFailureGuard = Object.freeze({
    isMobileLike,
    isLowMemoryDevice,
    skipAutomaticAiReason,
  });
})();
