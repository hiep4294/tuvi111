"use strict";

(function installAnalysisChoice(root) {
  const CHOICE_KEY = "tuvi-analysis-choice";
  const TOKEN_KEY = "tuvi-bridge-token";
  let approvedChoice = null;
  let activeDialog = null;

  function savedValue(key) {
    try { return root.localStorage.getItem(key) || ""; }
    catch (_) { return ""; }
  }

  function openChoice(form) {
    const dialog = document.createElement("dialog");
    dialog.className = "analysis-choice";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "analysisChoiceTitle");
    dialog.innerHTML = `
      <h2 id="analysisChoiceTitle">Chọn cách lập lá số</h2>
      <button class="secondary-button" type="button" id="analysisChoiceLocal">Lá số cục bộ</button>
      <form id="analysisChoiceAi">
        <label for="analysisChoiceToken">Mã AI (ChatGPT)</label>
        <input id="analysisChoiceToken" type="password" inputmode="numeric" autocomplete="off" aria-describedby="analysisChoiceStatus">
        <button class="primary-button" type="submit">AI phân tích (ChatGPT)</button>
      </form>
      <p id="analysisChoiceStatus" class="analysis-choice-status" role="status"></p>
      <button class="secondary-button" type="button" id="analysisChoiceCancel">Hủy</button>`;

    const localButton = dialog.querySelector("#analysisChoiceLocal");
    const aiForm = dialog.querySelector("#analysisChoiceAi");
    const tokenInput = dialog.querySelector("#analysisChoiceToken");
    const cancelButton = dialog.querySelector("#analysisChoiceCancel");
    const status = dialog.querySelector("#analysisChoiceStatus");
    const buttons = dialog.querySelectorAll("button");
    const focusTarget = savedValue(CHOICE_KEY) === "ai" ? tokenInput : localButton;
    tokenInput.value = savedValue(TOKEN_KEY);
    focusTarget.autofocus = true;

    function close() {
      dialog.close();
      dialog.remove();
      activeDialog = null;
    }

    function submit(choice) {
      close();
      approvedChoice = choice;
      try { form.requestSubmit(); }
      finally { approvedChoice = null; }
    }

    localButton.addEventListener("click", () => submit("local"));
    cancelButton.addEventListener("click", close);
    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      close();
    });

    aiForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (tokenInput.readOnly) return;
      const token = tokenInput.value.trim();
      if (!token) {
        status.textContent = "Nhập mã AI";
        tokenInput.focus();
        return;
      }

      tokenInput.readOnly = true;
      buttons.forEach((button) => { button.disabled = true; });
      status.textContent = "Đang kiểm tra mã...";
      const cloud = root.HiepCloudAI;
      const result = (await cloud?.verifyToken?.(token)) ?? "offline";
      if (!dialog.open) return;
      tokenInput.readOnly = false;
      buttons.forEach((button) => { button.disabled = false; });

      if (result !== "ok") {
        status.textContent = result === "wrong" ? "Mã không đúng" : "Máy ChatGPT đang tắt — hãy chọn Lá số cục bộ";
        (result === "wrong" ? tokenInput : localButton).focus();
        return;
      }

      try {
        const { mode, endpoint } = cloud.settings();
        if (mode === "worker") {
          cloud.save({ mode, endpoint: endpoint === cloud.DEFAULT_BRIDGE_ENDPOINT ? "" : endpoint, token });
        } else {
          root.localStorage.setItem(TOKEN_KEY, token);
        }
      } catch (_) {
        status.textContent = "Không lưu được mã AI. Hãy chọn Lá số cục bộ.";
        localButton.focus();
        return;
      }
      submit("ai");
    });

    activeDialog = dialog;
    document.body.append(dialog);
    dialog.showModal();
  }

  document.addEventListener("submit", (event) => {
    const form = event.target;
    if (form.id !== "birthForm") return;
    if (approvedChoice) {
      const choice = approvedChoice;
      approvedChoice = null;
      root.__HIEP_ANALYSIS_CHOICE__ = choice;
      try { root.localStorage.setItem(CHOICE_KEY, choice); }
      catch (_) {}
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (!activeDialog && !document.getElementById("generateButton")?.disabled) openChoice(form);
  }, true);
})(window);
