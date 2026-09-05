"use strict";

(function mergeHiepTuViStarData(root) {
  const kb = root.HiepTuViKBData || (root.HiepTuViKBData = {});
  const core = Array.isArray(kb.stars) ? kb.stars : [];
  const minor = Array.isArray(kb.minorStars) ? kb.minorStars : [];
  const seen = new Set();
  kb.stars = Object.freeze([...core, ...minor].filter((rule) => {
    const key = String(rule?.id || rule?.name || "");
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }));
})(typeof globalThis !== "undefined" ? globalThis : this);
