"use strict";

(function installHiepAiLiteRouter(root) {
  const VERSION = "1.2.0";
  const GPU_LITE_MODEL = "Qwen3-1.7B-q4f16_1-MLC";
  let busy = false;
  let nativePreparePromise = null;
  let translatorPreparePromise = null;
  let nativeState = "idle";
  let translatorState = "idle";
  let enhancedChartId = "";
  let retryWhenNativeReady = false;
  let latestDiagnostics = [];
  const loadPromises = new Map();

  function setStatus(message, mode = "busy") {
    const prefix = root.navigator?.onLine === false ? "Offline · dùng AI cục bộ/Local Rules · " : "";
    root.setGeminiStatus?.(prefix + message, mode);
  }

  function withTimeout(promise, ms, message) {
    let timer;
    return Promise.race([
      promise,
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(message)), ms); }),
    ]).finally(() => clearTimeout(timer));
  }

  function loadScript(globalName, src) {
    if (root[globalName]) return Promise.resolve(root[globalName]);
    if (loadPromises.has(globalName)) return loadPromises.get(globalName);
    const promise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = false;
      script.onload = () => resolve(root[globalName] || null);
      script.onerror = () => reject(new Error(`Không tải được ${src}.`));
      document.head.appendChild(script);
    }).catch((error) => {
      loadPromises.delete(globalName);
      throw error;
    });
    loadPromises.set(globalName, promise);
    return promise;
  }

  function subjectKindFromForm() {
    const value = String(document.getElementById("birthDate")?.value || "");
    const match = value.match(/^(\d{4})-/);
    if (!match) return "unknown";
    return new Date().getFullYear() - Number(match[1]) < 18 ? "child" : "adult";
  }

  function localSummary(chart) {
    try { return root.OfflineReading?.buildOfflineReading?.(chart) || null; }
    catch (_) { return null; }
  }

  function clip(value, maxChars) {
    let text;
    if (typeof value === "string") text = value;
    else {
      try { text = JSON.stringify(value); }
      catch (_) { text = String(value ?? ""); }
    }
    return text.length > maxChars ? `${text.slice(0, maxChars)}...[rút gọn]` : text;
  }

  function buildSynthesisPrompt(chart, ai, knowledge, cpuLite = false) {
    const subjectKind = subjectKindFromForm();
    const offline = localSummary(chart);
    if (cpuLite) {
      const evidence = ai.buildCompactEvidenceText(chart, { includeBazi: true, includeAnnual: false });
      return `HIEP TUVI AI LITE — FACT/CALC LOCKED BY TUVI111.\nChỉ tổng hợp; không an lại sao, không viết lại 12 cung, không bịa dữ kiện.\nViết 250–350 từ, đúng 5 mục: (1) Lõi Mệnh–Tài–Quan–Di–Thân, (2) điểm mạnh có điều kiện, (3) rủi ro/ma sát cần quản, (4) đối chiếu Bát Tự + một phản biện mạnh, (5) 3 hành động thực tế. Không dùng một sao = một kết luận.\n\nEVIDENCE:\n${clip(evidence, 5600)}`;
    }

    let prompt = ai.buildBrowserSummaryPrompt(chart, { subjectKind, localSummary: offline });
    const pack = knowledge?.forJob?.(chart, { id: "synthesis", kind: "synthesis", label: "Đối chiếu + phản biện + tổng kết" });
    if (pack) prompt += `\n\n### KNOWLEDGE PACK TỔNG HỢP\n${clip(pack, 3200)}`;
    prompt += `\n\n### GIỚI HẠN AI LITE\nKhông viết lại 12 cung. Chỉ tạo phần **AI TỔNG HỢP BỔ SUNG** khoảng 500–800 từ: cơ chế lõi, Mệnh–Tài–Quan–Di–Thân, Bát Tự đối chiếu, 3 phản biện mạnh, 3–5 hành động, 3 góc nhìn dễ bỏ sót. Ưu tiên câu cụ thể kiểu “vì A + B + modifier C nên...” thay vì mô tả từ khóa.`;
    return prompt;
  }

  function setBusy(value) {
    busy = value;
    document.querySelectorAll?.("#runGeminiButton, #runGeminiInlineButton").forEach((node) => {
      node.disabled = value;
      node.textContent = value ? "AI đang tổng hợp..." : "AI tổng hợp lại";
    });
  }

  function outputNode() {
    return document.getElementById("geminiOutput");
  }

  function rememberLocalRaw(output) {
    if (!output) return "";
    if (!output.dataset.localRulesRaw) output.dataset.localRulesRaw = output.dataset.raw || output.innerText || "";
    return output.dataset.localRulesRaw || "";
  }

  function removeTransient() {
    const output = outputNode();
    if (!output) return;
    output.querySelectorAll?.(".ai-lite-status, .ai-lite-enhancement, .ai-lite-fallback-note").forEach((node) => node.remove());
  }

  function renderLoading(message, progress) {
    const output = outputNode();
    if (!output) return;
    rememberLocalRaw(output);
    let node = output.querySelector?.(".ai-lite-status");
    if (!node) {
      node = document.createElement("div");
      node.className = "ai-lite-status";
      output.prepend(node);
    }
    const pct = Number.isFinite(progress) ? ` ${Math.round(progress * 100)}%` : "";
    node.textContent = `${message}${pct}`;
  }

  function renderSuccess(text, backend, model) {
    const output = outputNode();
    if (!output) return;
    const localRaw = rememberLocalRaw(output);
    removeTransient();
    const section = document.createElement("section");
    section.className = "ai-lite-enhancement";
    const meta = document.createElement("div");
    meta.className = "ai-meta";
    meta.textContent = `AI TỔNG HỢP BỔ SUNG · ${backend}${model ? ` · ${model}` : ""}`;
    const body = document.createElement("div");
    body.className = "ai-lite-body";
    if (typeof root.renderMarkdownSafe === "function") body.innerHTML = root.renderMarkdownSafe(String(text || ""));
    else body.textContent = String(text || "");
    section.append(meta, body);
    output.prepend(section);
    output.dataset.raw = `AI TỔNG HỢP BỔ SUNG (${backend})\n${String(text || "").trim()}\n\n---\n\n${localRaw}`;
  }

  function renderNoAi(diagnostics) {
    const output = outputNode();
    if (!output) return;
    output.dataset.raw = rememberLocalRaw(output);
    removeTransient();
    const note = document.createElement("div");
    note.className = "ai-lite-fallback-note";
    note.textContent = "AI tăng cường chưa khả dụng trên thiết bị này. Báo cáo Hiep TuVi Local Rules đầy đủ bên dưới vẫn là kết quả chính; Hiep TuVi 0.6B có thể thử riêng từng cung nếu WebGPU phù hợp.";
    output.prepend(note);
    latestDiagnostics = diagnostics;
  }

  function onProgress(report) {
    const text = String(report?.text || "Đang xử lý AI Lite...");
    const progress = Number(report?.progress);
    renderLoading(text, Number.isFinite(progress) ? progress : undefined);
    setStatus(text, "busy");
  }

  function prewarmFromGesture() {
    const native = root.HiepNativeAI;
    if (!native) return;

    if (!translatorPreparePromise && native.translatorSupported?.()) {
      translatorState = "pending";
      try {
        translatorPreparePromise = native.prepareTranslatorsFromGesture({ onProgress })
          .then((value) => { translatorState = "ready"; return value; })
          .catch((error) => {
            translatorState = "failed";
            latestDiagnostics.push({ backend: "chrome-translator", error: String(error?.message || error) });
            throw error;
          });
        translatorPreparePromise.catch(() => {});
      } catch (_) {
        translatorState = "failed";
      }
    }

    if (!nativePreparePromise && native.modelSupported?.()) {
      nativeState = "pending";
      try {
        nativePreparePromise = native.prepareFromGesture({ onProgress })
          .then((value) => {
            nativeState = "ready";
            if (retryWhenNativeReady && root.__HIEP_TUVI_CHART__ && !busy) {
              retryWhenNativeReady = false;
              setTimeout(() => root.runGeminiAnalysis?.({ automatic: false, preferNative: true }), 50);
            }
            return value;
          })
          .catch((error) => {
            nativeState = "failed";
            latestDiagnostics.push({ backend: "chrome-built-in", error: String(error?.message || error) });
            throw error;
          });
        nativePreparePromise.catch(() => {});
      } catch (_) {
        nativeState = "failed";
      }
    }
  }

  async function tryNative(chart, prompt) {
    const native = root.HiepNativeAI;
    if (!native?.modelSupported?.()) throw new Error("Chrome LanguageModel không có trên trình duyệt.");
    if (native.prepared?.()) nativeState = "ready";

    if (nativeState === "pending") {
      retryWhenNativeReady = true;
      throw Object.assign(new Error("NATIVE_DOWNLOADING"), { code: "NATIVE_DOWNLOADING" });
    }
    if (nativeState !== "ready" && !native.prepared?.()) throw new Error("Chrome Built-in AI chưa sẵn sàng.");

    renderLoading("Đang dùng AI tích hợp trong Chrome...", undefined);
    const result = await native.generateVietnamese(prompt, { chart, onProgress });
    native.destroyModelSession?.();
    nativeState = "idle";
    nativePreparePromise = null;
    return result;
  }

  async function tryWebGpu(prompt) {
    const guard = root.HiepWebGpuFailureGuard;
    if (guard?.isMobileLike?.() || guard?.isLowMemoryDevice?.()) throw new Error("Bỏ qua WebGPU do thiết bị di động/RAM thấp.");
    if (guard?.webGpuBlocked?.()) throw new Error("WebGPU đã lỗi shader trong phiên này.");
    const browserAi = await loadScript("HiepBrowserAI", "browser-ai.js?v=1.1.1");
    if (!browserAi?.webGpuAvailable?.()) throw new Error("WebGPU không khả dụng.");
    renderLoading("AI WebGPU Lite đang tổng hợp một lượt...", undefined);
    try {
      return await browserAi.generate(prompt, {
        model: GPU_LITE_MODEL,
        maxTokens: 700,
        temperature: 0.18,
        onProgress,
      });
    } catch (error) {
      if (guard?.isShaderFailure?.(String(error?.message || error))) guard.markGpuBlocked?.();
      throw error;
    } finally {
      try { await browserAi.unload?.(); } catch (_) {}
    }
  }

  function cpuSafe() {
    try {
      if (root.HiepWebGpuFailureGuard?.isMobileLike?.()) return false;
      const memory = Number(navigator.deviceMemory || 0);
      return !(memory > 0 && memory < 4);
    } catch (_) {
      return true;
    }
  }

  async function tryCpu(chart, cpuPrompt) {
    if (!cpuSafe()) throw new Error("Thiết bị không đủ biên RAM cho CPU Lite.");
    const native = root.HiepNativeAI;
    if (!native?.translatorsPrepared?.()) throw new Error("Chrome Translator chưa sẵn sàng; không chạy model CPU tiếng Anh để tránh trả sai ngôn ngữ.");
    const cpu = await loadScript("HiepCpuAI", "browser-cpu-ai.js?v=1.1.0");
    if (!cpu?.available?.()) throw new Error("WebAssembly/Web Worker không khả dụng.");
    const terms = native.collectProtectedTerms?.(chart) || [];
    renderLoading("Đang dịch gói nén cho AI CPU Lite...", undefined);
    const translatedPrompt = await native.translateProtected(cpuPrompt, "vi", "en", terms);
    renderLoading("AI CPU Lite 135M đang tổng hợp ngắn...", undefined);
    const result = await cpu.generate(translatedPrompt.text, { maxTokens: 280, onProgress });
    const translatedResult = await native.translateProtected(result.text, "en", "vi", terms);
    try { await cpu.unload?.(); } catch (_) {}
    return { ...result, text: translatedResult.text, backend: "cpu-wasm-lite" };
  }

  async function runLite(options = {}) {
    if (busy) return { skipped: true, reason: "ai-lite-busy" };
    const automatic = Boolean(options.automatic);
    const chart = root.__HIEP_TUVI_CHART__;
    if (!chart) {
      if (!automatic) alert("Chưa lập lá số.");
      return { skipped: true, reason: "no-chart" };
    }

    // v1.25: không tự tải bất kỳ model AI nào sau khi lập lá số.
    // Local Rules hiển thị ngay; Hiep TuVi 0.6B và AI Lite chỉ chạy khi người dùng chủ động bấm.
    if (automatic) {
      setStatus("Local Rules đã sẵn sàng · AI 0.6B chạy theo yêu cầu", "ready");
      return { skipped: true, reason: "manual-ai-only" };
    }

    const useCloud = !options.preferNative && root.HiepCloudAI?.isAvailable();
    if (!useCloud) prewarmFromGesture();

    const chartId = String(chart.chart_id || "chart");
    setBusy(true);
    if (!options.preferNative) latestDiagnostics = [];
    try {
      const [ai, knowledge] = await Promise.all([
        loadScript("HiepTuViAI", "hiep-tuvi-ai.js?v=2.0.0"),
        loadScript("HiepTuViKnowledge", "hiep-tuvi-knowledge.js?v=2.0.1"),
      ]);
      if (!ai?.buildBrowserSummaryPrompt || !ai?.buildCompactEvidenceText) throw new Error("Hiep TuVi synthesis layer chưa sẵn sàng.");
      const prompt = buildSynthesisPrompt(chart, ai, knowledge, false);
      const cpuPrompt = buildSynthesisPrompt(chart, ai, knowledge, true);

      const backends = [
        ["chrome-built-in", async () => {
          if (useCloud && !root.HiepNativeAI?.prepared?.()) {
            prewarmFromGesture();
            await nativePreparePromise;
          }
          return tryNative(chart, prompt);
        }],
        ["webgpu-lite", () => tryWebGpu(prompt)],
        ["cpu-wasm-lite", () => tryCpu(chart, cpuPrompt)],
      ];

      if (useCloud) {
        backends.unshift(["cloud", () => {
          renderLoading("Đang tổng hợp bằng AI Cloud...");
          setStatus("Đang tổng hợp bằng AI Cloud...", "busy");
          return root.HiepCloudAI.analyze(prompt, { maxTokens: 1800 });
        }]);
      }

      for (const [name, execute] of backends) {
        if (chart !== root.__HIEP_TUVI_CHART__) return { skipped: true, reason: "chart-changed" };
        try {
          const result = await execute();
          if (!result?.text) throw new Error(`${name} không trả về nội dung.`);
          if (chart !== root.__HIEP_TUVI_CHART__) return { skipped: true, reason: "chart-changed" };
          const backend = result.backend || name;
          const label = name === "cloud" ? ({ anthropic: "Claude", openai: "ChatGPT", gemini: "Gemini" }[result.provider] || "AI Cloud") : backend;
          renderSuccess(result.text, label, result.model || "");
          enhancedChartId = chartId;
          setStatus(`Đã tổng hợp · ${label}${result.model ? ` · ${result.model}` : ""}`, "ready");
          root.toast?.("AI đã tổng hợp bổ sung; báo cáo 12 cung gốc vẫn được giữ nguyên.");
          return { ok: true, backend, model: result.model || "" };
        } catch (error) {
          if (error?.code === "NATIVE_DOWNLOADING") {
            renderLoading("Chrome Built-in AI đang tải; Local Rules vẫn sẵn sàng. Khi tải xong hãy bấm AI tổng hợp lại.");
            setStatus("Chrome Built-in AI đang tải · chưa chạy model khác", "busy");
            return { skipped: true, reason: "native-downloading" };
          }
          latestDiagnostics.push({ backend: name, error: String(error?.message || error) });
        }
      }

      renderNoAi(latestDiagnostics);
      setStatus("AI tăng cường không khả dụng · Local Rules đầy đủ đang hoạt động", "ready");
      return { ok: false, backend: "local-rules", diagnostics: latestDiagnostics };
    } catch (error) {
      latestDiagnostics.push({ backend: "router", error: String(error?.message || error) });
      renderNoAi(latestDiagnostics);
      setStatus("Local Rules đầy đủ đang hoạt động", "ready");
      return { ok: false, backend: "local-rules", error: String(error?.message || error) };
    } finally {
      setBusy(false);
    }
  }

  root.runGeminiAnalysis = runLite;

  root.testGeminiConnection = async function testAiLite() {
    if (root.HiepCloudAI?.isAvailable()) {
      const button = document.getElementById("testGeminiButton");
      if (button) button.disabled = true;
      setStatus("Đang kiểm tra AI Cloud...", "busy");
      try {
        const label = await root.HiepCloudAI.test();
        latestDiagnostics = [];
        setStatus(`Kết nối AI Cloud thành công · ${label}`, "ready");
      } catch (error) {
        latestDiagnostics = [{ backend: "cloud", error: String(error.message || error) }];
        setStatus(`Kết nối AI Cloud lỗi · ${error.message || error}`, "error");
      } finally {
        if (button) button.disabled = false;
      }
      return;
    }
    setStatus("Đang kiểm tra AI cục bộ theo yêu cầu...", "busy");
    const diagnostics = [];
    try {
      const browserAi = await loadScript("HiepBrowserAI", "browser-ai.js?v=1.1.1");
      const info = await browserAi.inspectGpu?.();
      if (info?.ok && !root.HiepWebGpuFailureGuard?.webGpuBlocked?.()) {
        setStatus("WebGPU có thể thử · ưu tiên Hiep TuVi 0.6B theo từng cung", "ready");
        return;
      }
      if (cpuSafe()) {
        setStatus("WebGPU không sẵn sàng · Local Rules vẫn hoạt động", "ready");
        return;
      }
      setStatus("Không có backend AI phù hợp · dùng Local Rules", "ready");
    } catch (error) {
      diagnostics.push(String(error?.message || error));
      setStatus("AI model chưa sẵn sàng · dùng Local Rules", "ready");
      alert("AI model chưa sẵn sàng. Báo cáo Local Rules vẫn hoạt động đầy đủ.\n\n" + diagnostics.slice(0, 3).join("\n"));
    } finally {
      latestDiagnostics = diagnostics.map((error) => ({ backend: "test", error }));
    }
  };

  root.HiepAiLiteRouter = Object.freeze({
    VERSION,
    GPU_LITE_MODEL,
    runLite,
    prewarmFromGesture,
    cpuSafe,
    get diagnostics() { return [...latestDiagnostics]; },
    get nativeState() { return nativeState; },
    get translatorState() { return translatorState; },
  });
})(window);
