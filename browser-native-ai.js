"use strict";

(function initHiepNativeAI(root) {
  const VERSION = "1.0.1";
  let modelPromise = null;
  let viToEnPromise = null;
  let enToViPromise = null;
  let modelSession = null;
  let viToEn = null;
  let enToVi = null;
  let lastError = "";

  function modelSupported() {
    return typeof root.LanguageModel !== "undefined";
  }

  function translatorSupported() {
    return typeof root.Translator !== "undefined";
  }

  function supported() {
    return modelSupported() && translatorSupported();
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
    const result = { ok: false, model: "unavailable", viToEn: "unavailable", enToVi: "unavailable" };
    try {
      if (modelSupported()) {
        result.model = await root.LanguageModel.availability({
          expectedInputs: [{ type: "text", languages: ["en"] }],
          expectedOutputs: [{ type: "text", languages: ["en"] }],
        });
      }
      if (translatorSupported()) {
        [result.viToEn, result.enToVi] = await Promise.all([
          root.Translator.availability({ sourceLanguage: "vi", targetLanguage: "en" }),
          root.Translator.availability({ sourceLanguage: "en", targetLanguage: "vi" }),
        ]);
      }
      result.ok = result.model !== "unavailable" && result.viToEn !== "unavailable" && result.enToVi !== "unavailable";
      return result;
    } catch (error) {
      lastError = String(error?.message || error);
      return { ...result, error: lastError };
    }
  }

  function prepareTranslatorsFromGesture(options = {}) {
    if (!translatorSupported()) return Promise.reject(new Error("Chrome Translator API không khả dụng."));
    const onProgress = options.onProgress;

    // Call create() immediately while transient user activation is still present.
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
        return Promise.reject(error);
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
        return Promise.reject(error);
      }
    }

    return Promise.all([
      viToEn ? Promise.resolve(viToEn) : viToEnPromise,
      enToVi ? Promise.resolve(enToVi) : enToViPromise,
    ]).then(([toEn, toVi]) => {
      if (!toEn || !toVi) throw new Error("Chrome Translator chưa sẵn sàng cho Việt ↔ Anh.");
      return { ok: true, backend: "chrome-translator" };
    });
  }

  function prepareFromGesture(options = {}) {
    if (!modelSupported()) return Promise.reject(new Error("Chrome Built-in LanguageModel không khả dụng."));
    const onProgress = options.onProgress;

    // Important: call create() before the first await so transient user activation is preserved.
    if (!modelPromise && !modelSession) {
      try {
        modelPromise = root.LanguageModel.create({
          expectedInputs: [{ type: "text", languages: ["en"] }],
          expectedOutputs: [{ type: "text", languages: ["en"] }],
          initialPrompts: [{
            role: "system",
            content: "You are Hiep TuVi AI. Interpret only locked evidence supplied by tuvi111. Never recalculate stars. Be concise, causal, skeptical, and practical. Keep protected placeholder tokens unchanged.",
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

    const translators = prepareTranslatorsFromGesture(options);
    return Promise.all([
      modelSession ? Promise.resolve(modelSession) : modelPromise,
      translators,
    ]).then(([session]) => {
      if (!session || !viToEn || !enToVi) throw new Error("Chrome Built-in AI chưa đủ model/dịch để chạy tiếng Việt.");
      return { ok: true, backend: "chrome-built-in", model: "Gemini Nano / browser LanguageModel" };
    });
  }

  function prepared() {
    return Boolean(modelSession && viToEn && enToVi);
  }

  function translatorsPrepared() {
    return Boolean(viToEn && enToVi);
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

  async function translateProtected(text, sourceLanguage, targetLanguage, terms = []) {
    if (!translatorsPrepared()) throw new Error("Chrome Translator chưa được khởi tạo từ thao tác người dùng.");
    const protectedValue = protect(text, terms);
    let translated;
    if (sourceLanguage === "vi" && targetLanguage === "en") translated = await viToEn.translate(protectedValue.text);
    else if (sourceLanguage === "en" && targetLanguage === "vi") translated = await enToVi.translate(protectedValue.text);
    else throw new Error(`Cặp dịch không hỗ trợ: ${sourceLanguage}→${targetLanguage}`);
    return { text: restore(translated, protectedValue.mapping), raw: String(translated || ""), mapping: protectedValue.mapping };
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
    modelSupported,
    translatorSupported,
    availability,
    prepareFromGesture,
    prepareTranslatorsFromGesture,
    prepared,
    translatorsPrepared,
    collectProtectedTerms,
    translateProtected,
    generateVietnamese,
    destroyModelSession,
    get lastError() { return lastError; },
  });
})(typeof globalThis !== "undefined" ? globalThis : this);
