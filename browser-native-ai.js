"use strict";

(function initHiepNativeAI(root) {
  const VERSION = "1.0.0";
  let modelPromise = null;
  let viToEnPromise = null;
  let enToViPromise = null;
  let modelSession = null;
  let viToEn = null;
  let enToVi = null;
  let lastError = "";

  function supported() {
    return typeof root.LanguageModel !== "undefined" && typeof root.Translator !== "undefined";
  }

  function progressMonitor(onProgress, label) {
    return (monitor) => {
      try {
        monitor.addEventListener("downloadprogress", (event) => {
          const loaded = Number(event?.loaded);
          onProgress?.({
            text: label,
            progress: Number.isFinite(loaded) ? Math.max(0, Math.min(1, loaded)) : undefined,
          });
        });
      } catch (_) {}
    };
  }

  async function availability() {
    if (!supported()) return { ok: false, model: "unavailable", viToEn: "unavailable", enToVi: "unavailable" };
    try {
      const [model, a, b] = await Promise.all([
        root.LanguageModel.availability({
          expectedInputs: [{ type: "text", languages: ["en"] }],
          expectedOutputs: [{ type: "text", languages: ["en"] }],
        }),
        root.Translator.availability({ sourceLanguage: "vi", targetLanguage: "en" }),
        root.Translator.availability({ sourceLanguage: "en", targetLanguage: "vi" }),
      ]);
      return { ok: model !== "unavailable" && a !== "unavailable" && b !== "unavailable", model, viToEn: a, enToVi: b };
    } catch (error) {
      lastError = String(error?.message || error);
      return { ok: false, model: "error", viToEn: "error", enToVi: "error", error: lastError };
    }
  }

  function prepareFromGesture(options = {}) {
    if (!supported()) return Promise.reject(new Error("Chrome Built-in AI không khả dụng trên trình duyệt này."));
    const onProgress = options.onProgress;

    // Important: call create() before the first await so transient user activation is preserved.
    if (!modelPromise && !modelSession) {
      try {
        modelPromise = root.LanguageModel.create({
          expectedInputs: [{ type: "text", languages: ["en"] }],
          expectedOutputs: [{ type: "text", languages: ["en"] }],
          initialPrompts: [{
            role: "system",
            content: "You are Hiep TuVi AI. Interpret only the locked evidence supplied by tuvi111. Never recalculate stars. Be concise, causal, skeptical, and practical. Keep protected placeholder tokens unchanged.",
          }],
          monitor: progressMonitor(onProgress, "Đang chuẩn bị AI tích hợp trong Chrome..."),
        }).then((session) => {
          modelSession = session;
          return session;
        }).catch((error) => {
          modelPromise = null;
          lastError = String(error?.message || error);
          throw error;
        });
      } catch (error) {
        modelPromise = null;
        lastError = String(error?.message || error);
        return Promise.reject(error);
      }
    }

    if (!viToEnPromise && !viToEn) {
      try {
        viToEnPromise = root.Translator.create({
          sourceLanguage: "vi",
          targetLanguage: "en",
          monitor: progressMonitor(onProgress, "Đang chuẩn bị dịch Việt → Anh trên thiết bị..."),
        }).then((translator) => {
          viToEn = translator;
          return translator;
        }).catch((error) => {
          viToEnPromise = null;
          lastError = String(error?.message || error);
          throw error;
        });
      } catch (error) {
        viToEnPromise = null;
        lastError = String(error?.message || error);
      }
    }

    if (!enToViPromise && !enToVi) {
      try {
        enToViPromise = root.Translator.create({
          sourceLanguage: "en",
          targetLanguage: "vi",
          monitor: progressMonitor(onProgress, "Đang chuẩn bị dịch Anh → Việt trên thiết bị..."),
        }).then((translator) => {
          enToVi = translator;
          return translator;
        }).catch((error) => {
          enToViPromise = null;
          lastError = String(error?.message || error);
          throw error;
        });
      } catch (error) {
        enToViPromise = null;
        lastError = String(error?.message || error);
      }
    }

    return Promise.all([
      modelSession ? Promise.resolve(modelSession) : modelPromise,
      viToEn ? Promise.resolve(viToEn) : viToEnPromise,
      enToVi ? Promise.resolve(enToVi) : enToViPromise,
    ]).then(([session, toEn, toVi]) => {
      if (!session || !toEn || !toVi) throw new Error("Chrome Built-in AI chưa đủ model/dịch để chạy tiếng Việt.");
      return { ok: true, backend: "chrome-built-in", model: "Gemini Nano / browser LanguageModel" };
    });
  }

  function prepared() {
    return Boolean(modelSession && viToEn && enToVi);
  }

  function collectProtectedTerms(chart) {
    const terms = new Set([
      "Tử Vi", "Bát Tự", "Ngũ Hành", "Mệnh", "Tài Bạch", "Quan Lộc", "Thiên Di", "Phu Thê",
      "Phúc Đức", "Điền Trạch", "Tật Ách", "Huynh Đệ", "Phụ Mẫu", "Nô Bộc", "Tử Tức",
      "Hóa Lộc", "Hóa Quyền", "Hóa Khoa", "Hóa Kỵ", "Tuần", "Triệt", "Tràng Sinh",
    ]);
    for (const palace of chart?.palaces || []) {
      if (palace?.palace_name) terms.add(String(palace.palace_name));
      if (palace?.branch_name) terms.add(String(palace.branch_name));
      for (const star of palace?.stars || []) {
        const name = String(star?.saoTen || star?.name || star?.label || "").trim();
        if (name) terms.add(name);
      }
    }
    return [...terms].filter((x) => x.length > 1).sort((a, b) => b.length - a.length);
  }

  function protect(text, terms) {
    let value = String(text || "");
    const mapping = [];
    let index = 0;
    for (const term of terms || []) {
      if (!value.includes(term)) continue;
      const token = `HIEPTERM${String(index++).padStart(4, "0")}ZXQ`;
      value = value.split(term).join(token);
      mapping.push([token, term]);
    }
    return { text: value, mapping };
  }

  function restore(text, mapping) {
    let value = String(text || "");
    for (const [token, term] of mapping || []) value = value.split(token).join(term);
    return value;
  }

  async function generateVietnamese(prompt, options = {}) {
    if (!prepared()) throw new Error("Chrome Built-in AI chưa được khởi tạo từ thao tác người dùng.");
    const terms = options.terms || collectProtectedTerms(options.chart);
    const protectedPrompt = protect(prompt, terms);
    options.onProgress?.({ text: "AI tích hợp: đang dịch gói dữ liệu sang tiếng Anh..." });
    const englishPrompt = await viToEn.translate(protectedPrompt.text);
    options.onProgress?.({ text: "AI tích hợp trong Chrome đang tổng hợp..." });
    const english = await modelSession.prompt(String(englishPrompt || ""));
    if (!String(english || "").trim()) throw new Error("Chrome Built-in AI không trả về nội dung.");
    options.onProgress?.({ text: "AI tích hợp: đang dịch kết quả về tiếng Việt..." });
    const vietnameseProtected = await enToVi.translate(String(english));
    const text = restore(vietnameseProtected, protectedPrompt.mapping).trim();
    if (!text) throw new Error("Không dịch được kết quả AI tích hợp về tiếng Việt.");
    return { text, backend: "chrome-built-in", model: "Gemini Nano / LanguageModel", local: true };
  }

  function destroyModelSession() {
    try { modelSession?.destroy?.(); } catch (_) {}
    modelSession = null;
    modelPromise = null;
  }

  root.HiepNativeAI = Object.freeze({
    VERSION,
    supported,
    availability,
    prepareFromGesture,
    prepared,
    collectProtectedTerms,
    generateVietnamese,
    destroyModelSession,
    get lastError() { return lastError; },
  });
})(typeof globalThis !== "undefined" ? globalThis : this);
