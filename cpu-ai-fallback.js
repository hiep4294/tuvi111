"use strict";

(function installCpuAiFallback() {
  const gpuPath = window.runGeminiAnalysis;
  if (typeof gpuPath !== "function") return;

  let cpuBusy = false;
  let cpuLoadPromise = null;

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[char]);
  }

  function loadScript(globalName, src) {
    if (window[globalName]) return Promise.resolve(window[globalName]);
    return new Promise((resolve, reject) => {
      const existing = document.querySelector?.(`script[data-cpu-loader="${globalName}"]`);
      if (existing) {
        existing.addEventListener("load", () => resolve(window[globalName] || null), { once: true });
        existing.addEventListener("error", () => reject(new Error(`Không tải được ${src}.`)), { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = src;
      script.async = false;
      script.dataset.cpuLoader = globalName;
      script.onload = () => resolve(window[globalName] || null);
      script.onerror = () => reject(new Error(`Không tải được ${src}.`));
      document.head.appendChild(script);
    });
  }

  function loadCpuStack() {
    if (cpuLoadPromise) return cpuLoadPromise;
    cpuLoadPromise = Promise.all([
      loadScript("HiepCpuAI", "browser-cpu-ai.js?v=1.0.0"),
      loadScript("HiepTuViAI", "hiep-tuvi-ai.js?v=2.0.0"),
      loadScript("HiepTuViKnowledge", "hiep-tuvi-knowledge.js?v=1.0.0"),
    ]).then(([cpu, ai, knowledge]) => ({ cpu, ai, knowledge })).catch((error) => {
      cpuLoadPromise = null;
      throw error;
    });
    return cpuLoadPromise;
  }

  function setStatus(message, mode = "busy") {
    window.setGeminiStatus?.(message, mode);
  }

  function subjectKindFromForm() {
    const value = String(document.getElementById("birthDate")?.value || "");
    const match = value.match(/^(\d{4})-/);
    if (!match) return "unknown";
    return new Date().getFullYear() - Number(match[1]) < 18 ? "child" : "adult";
  }

  function localSummaryForAi(chart) {
    try { return window.OfflineReading?.buildOfflineReading?.(chart) || null; }
    catch (_) { return null; }
  }

  function withKnowledge(prompt, knowledge, chart, job) {
    const pack = knowledge?.forJob?.(chart, job);
    if (!pack) return prompt;
    return `${prompt}\n\n### HIEP TUVI KNOWLEDGE PACK — FACT/CALC CỦA TUVI111 ƯU TIÊN\n${pack}`;
  }

  function cpuSafeEnough() {
    try {
      const memoryGb = Number(navigator.deviceMemory || 0);
      return !(memoryGb > 0 && memoryGb < 4);
    } catch (_) {
      return true;
    }
  }

  function reportMeta(completed, total, repairs) {
    return [
      "Hiep TuVi AI · CPU/WASM",
      "Qwen2.5 0.5B",
      `${completed}/${total} phần`,
      repairs ? `đã tự sửa ${repairs} phần` : "",
    ].filter(Boolean).join(" · ");
  }

  function renderCpuReport(parts, options = {}) {
    const output = document.getElementById("geminiOutput");
    if (!output) return;
    const total = Number(options.total || parts.length || 1);
    const raw = parts.map((part) => String(part.text || "").trim()).filter(Boolean).join("\n\n---\n\n");
    output.dataset.raw = raw;
    const sections = parts.map((part) => {
      const body = typeof window.renderMarkdownSafe === "function"
        ? window.renderMarkdownSafe(part.text)
        : `<pre>${escapeHtml(part.text)}</pre>`;
      return `<section class="ai-report-part" data-report-part="${escapeHtml(part.id || "")}">${body}</section>`;
    }).join("");
    const loading = options.loading
      ? `<div class="ai-loading"><span></span><p>${escapeHtml(options.loading)}${Number.isFinite(options.progress) ? ` ${Math.round(options.progress * 100)}%` : ""}</p></div>`
      : "";
    output.innerHTML = `<div class="ai-meta">${escapeHtml(reportMeta(parts.length, total, options.repairs || 0))}</div>${sections}${loading}`;
  }

  function showCpuLoadingOverFallback(fallback, message, progress) {
    const output = document.getElementById("geminiOutput");
    if (!output) return;
    const pct = Number.isFinite(progress) ? ` ${Math.round(progress * 100)}%` : "";
    output.innerHTML = `<div class="ai-loading"><span></span><p>${escapeHtml(message)}${pct}</p></div>${fallback.html || ""}`;
    output.dataset.raw = fallback.raw || "";
  }

  function restoreLocalRules(fallback, error) {
    const output = document.getElementById("geminiOutput");
    if (!output) return;
    output.innerHTML = "";
    const warning = document.createElement("div");
    warning.className = "ai-error";
    warning.textContent = "AI WebGPU và AI CPU/WASM đều không chạy được trên thiết bị này. Đang dùng Hiep TuVi Local Rules đầy đủ; không mất 12 cung/Bát Tự/phản biện/tổng kết.";
    const details = document.createElement("details");
    details.className = "ai-tech-details";
    const summary = document.createElement("summary");
    summary.textContent = "Chi tiết kỹ thuật AI CPU";
    const code = document.createElement("code");
    code.textContent = String(error?.message || error || "CPU/WASM unavailable").slice(0, 1200);
    details.append(summary, code);
    output.append(warning, details);
    const holder = document.createElement("div");
    holder.innerHTML = fallback.html || '<p class="muted">Không có bản báo cáo dự phòng.</p>';
    while (holder.firstChild) output.appendChild(holder.firstChild);
    output.dataset.raw = fallback.raw || "";
  }

  function gpuPathFailed(result, error) {
    if (error) return true;
    if (result?.skipped || result?.webgpuFailed) return true;
    if (window.HiepWebGpuFailureGuard?.webGpuBlocked?.()) return true;
    const browserAi = window.HiepBrowserAI;
    if (browserAi?.webGpuAvailable && !browserAi.webGpuAvailable()) return true;
    const output = document.getElementById("geminiOutput");
    const text = String(output?.textContent || output?.innerText || "");
    return /AI local chưa hoàn thành|Không tạo được báo cáo Hiep TuVi AI|Invalid ShaderModule|index_kernel|GPU\/driver|WebGPU.*không/i.test(text);
  }

  async function runCpuReport(options = {}, fallback) {
    if (cpuBusy) return { skipped: true, reason: "cpu-busy" };
    if (!cpuSafeEnough()) {
      const error = new Error("Thiết bị dưới 4 GB RAM: không tự tải model CPU 0.5B để tránh treo trình duyệt.");
      restoreLocalRules(fallback, error);
      setStatus("RAM quá thấp · dùng Hiep TuVi Local Rules", "ready");
      return { skipped: true, reason: "cpu-low-memory" };
    }

    const chart = window.__HIEP_TUVI_CHART__;
    if (!chart) return { skipped: true, reason: "no-chart" };
    cpuBusy = true;
    setStatus("WebGPU không dùng được → đang chuyển sang AI CPU/WASM...", "busy");
    showCpuLoadingOverFallback(fallback, "Đang chuẩn bị AI CPU/WASM; lần đầu cần tải model khoảng 0.5 GB");

    try {
      const { cpu, ai, knowledge } = await loadCpuStack();
      if (!cpu?.available?.()) throw new Error("WebAssembly/Web Worker không khả dụng.");
      if (!ai?.fullReportPlan || !ai?.buildFullReportSectionPrompt) throw new Error("Hiep TuVi FULL_REPORT chưa sẵn sàng.");
      if (!knowledge?.forJob) throw new Error("Hiep TuVi Knowledge Base chưa sẵn sàng.");

      const subjectKind = subjectKindFromForm();
      const localSummary = localSummaryForAi(chart);
      const plan = ai.fullReportPlan();
      const parts = [];
      let repairs = 0;

      for (let index = 0; index < plan.length; index += 1) {
        const job = plan[index];
        const label = `AI CPU đang luận ${index + 1}/${plan.length}: ${job.label}`;
        setStatus(label, "busy");
        if (parts.length) renderCpuReport(parts, { total: plan.length, repairs, loading: label });
        else showCpuLoadingOverFallback(fallback, label);

        const basePrompt = ai.buildFullReportSectionPrompt(chart, job, { subjectKind, localSummary });
        const prompt = withKnowledge(basePrompt, knowledge, chart, job);
        const maxTokens = job.kind === "palaces" ? 680 : job.kind === "bazi" ? 650 : 780;
        let data = await cpu.generate(prompt, {
          maxTokens,
          onProgress(report) {
            const text = String(report?.text || label);
            const progress = Number(report?.progress);
            setStatus(Number.isFinite(progress) ? `${text} ${Math.round(progress * 100)}%` : text, "busy");
            if (parts.length) renderCpuReport(parts, { total: plan.length, repairs, loading: label, progress: Number.isFinite(progress) ? progress : undefined });
            else showCpuLoadingOverFallback(fallback, text, Number.isFinite(progress) ? progress : undefined);
          },
        });

        let issues = ai.validateFullReportSection?.(data.text, job) || [];
        if (issues.length && repairs < 1 && ai.buildSectionRepairPrompt) {
          repairs += 1;
          setStatus(`AI CPU tự sửa phần ${index + 1} theo quality gate`, "busy");
          const repairPrompt = ai.buildSectionRepairPrompt(prompt, data.text, issues);
          data = await cpu.generate(repairPrompt, { maxTokens });
          issues = ai.validateFullReportSection?.(data.text, job) || [];
        }
        parts.push({ id: job.id, text: data.text, issues });
        renderCpuReport(parts, { total: plan.length, repairs });
      }

      const remainingIssues = parts.flatMap((part) => part.issues || []);
      setStatus(remainingIssues.length ? "AI CPU/WASM hoàn thành · còn cảnh báo chất lượng" : "Hiep TuVi AI CPU/WASM · hoàn thành", remainingIssues.length ? "busy" : "ready");
      window.toast?.("AI CPU/WASM đã hoàn thành báo cáo Hiep TuVi");
      return { ok: true, backend: "cpu-wasm", model: cpu.MODEL?.id, issues: remainingIssues };
    } catch (error) {
      restoreLocalRules(fallback, error);
      setStatus("AI CPU không chạy được · dùng Hiep TuVi Local Rules", "ready");
      return { ok: false, backend: "local-rules", error: String(error?.message || error) };
    } finally {
      cpuBusy = false;
    }
  }

  window.runGeminiAnalysis = async function runHiepTuViWithCpuFallback(options = {}) {
    const output = document.getElementById("geminiOutput");
    const fallback = { html: output?.innerHTML || "", raw: output?.dataset?.raw || "" };
    let result = null;
    let gpuError = null;
    try {
      result = await gpuPath.call(this, options);
    } catch (error) {
      gpuError = error;
    }

    if (!gpuPathFailed(result, gpuError)) {
      if (gpuError) throw gpuError;
      return result;
    }

    const rawError = String(gpuError?.message || "");
    if (/Invalid ShaderModule|index_kernel|shader/i.test(rawError)) {
      window.HiepWebGpuFailureGuard?.markGpuBlocked?.();
    }
    try { await window.HiepBrowserAI?.unload?.(); } catch (_) {}
    return runCpuReport(options, fallback);
  };

  window.HiepCpuFallbackRouter = Object.freeze({
    cpuSafeEnough,
    runCpuReport: (options = {}) => {
      const output = document.getElementById("geminiOutput");
      return runCpuReport(options, { html: output?.innerHTML || "", raw: output?.dataset?.raw || "" });
    },
  });
})();
