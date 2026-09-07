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

  function clearBlocked() {
    try { sessionStorage.removeItem(SESSION_KEY); }
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
    warning.textContent = "WebGPU/GPU driver không tương thích. Đang chuyển sang AI CPU/WASM; báo cáo Local Rules đầy đủ vẫn được giữ làm dự phòng.";
    const details = document.createElement("details");
    details.className = "ai-tech-details";
    const summary = document.createElement("summary");
    summary.textContent = "Chi tiết kỹ thuật WebGPU";
    const code = document.createElement("code");
    code.textContent = String(rawText || "WebGPU shader validation failed.").slice(0, 1200);
    details.append(summary, code);
    warning.insertAdjacentElement?.("afterend", details);
  }

  function showConstrainedMode(reason) {
    const label = reason === "mobile" ? "Thiết bị di động" : "Thiết bị RAM thấp";
    window.setGeminiStatus?.(`${label}: bỏ qua model WebGPU · chuẩn bị AI CPU/WASM`, "busy");
  }

  window.runGeminiAnalysis = async function guardedHiepTuViAnalysis(options = {}) {
    const automatic = Boolean(options.automatic);
    const constrainedReason = skipAutomaticAiReason();

    // Do not start a multi-GB WebGPU model when memory pressure is predictable.
    // The CPU/WASM router loaded after this guard will take over with the 0.5B model.
    if (isMobileLike()) {
      showConstrainedMode("mobile");
      return { skipped: true, reason: "mobile-memory-guard" };
    }
    if (automatic && constrainedReason) {
      showConstrainedMode(constrainedReason);
      return { skipped: true, reason: constrainedReason };
    }
    if (blocked()) {
      window.setGeminiStatus?.("WebGPU đã bị chặn trong phiên · chuyển AI CPU/WASM", "busy");
      return { skipped: true, reason: "webgpu-session-blocked" };
    }

    const result = await original.call(this, options);
    const output = document.getElementById("geminiOutput");
    const text = output?.textContent || output?.innerText || "";
    if (isShaderFailure(text)) {
      markBlocked();
      softenShaderFailure(text);
      window.setGeminiStatus?.("WebGPU lỗi shader · chuyển AI CPU/WASM", "busy");
      return { ...(result || {}), webgpuFailed: true, reason: "shader-failure" };
    }
    return result;
  };

  window.HiepWebGpuFailureGuard = Object.freeze({
    isMobileLike,
    isLowMemoryDevice,
    skipAutomaticAiReason,
    isShaderFailure,
    webGpuBlocked: blocked,
    markGpuBlocked: markBlocked,
    clearGpuBlocked: clearBlocked,
  });
})();
