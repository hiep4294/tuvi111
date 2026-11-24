import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(new URL("../analysis-choice.js", import.meta.url), "utf8");
const choiceKey = "tuvi-analysis-choice";
const tokenKey = "tuvi-bridge-token";

function harness() {
  const storage = new Map([[tokenKey, "saved-token"]]);
  const submitted = [];
  const probes = [];
  const saves = [];
  const endpoint = "https://bridge.example.test";
  let captureSubmit;
  let dialog;
  let focused;
  let finishProbe;

  function node() {
    return {
      addEventListener(type, handler) { this[type] = handler; },
      focus() { focused = this; },
    };
  }

  function createDialog(tag) {
    assert.equal(tag, "dialog");
    const selectors = ["Local", "Ai", "Token", "Cancel", "Status"];
    const controls = Object.fromEntries(selectors.map(name => ["#analysisChoice" + name, node()]));
    const buttons = [controls["#analysisChoiceLocal"], controls["#analysisChoiceCancel"], node()];
    return {
      ...node(), controls, buttons,
      setAttribute() {},
      querySelector: selector => controls[selector],
      querySelectorAll: () => buttons,
      showModal() {
        this.open = true;
        Object.values(controls).find(control => control.autofocus).focus();
      },
      close() { this.open = false; },
      remove() { dialog = null; },
    };
  }

  const window = {
    localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
    HiepCloudAI: {
      DEFAULT_BRIDGE_ENDPOINT: endpoint,
      settings: () => ({ mode: "worker", endpoint }),
      save(config) { saves.push({ ...config }); storage.set(tokenKey, config.token); },
      verifyToken(token) {
        probes.push(token);
        return new Promise(resolve => { finishProbe = resolve; });
      },
    },
  };
  const form = {
    id: "birthForm",
    requestSubmit() {
      const event = { target: this, preventDefault() {}, stopPropagation() { this.stopped = true; } };
      captureSubmit(event);
      if (!event.stopped) submitted.push(window.__HIEP_ANALYSIS_CHOICE__);
    },
  };
  const document = {
    addEventListener(type, handler, capture) {
      assert.equal(type, "submit");
      assert.equal(capture, true);
      captureSubmit = handler;
    },
    getElementById: () => ({ disabled: false }),
    createElement: createDialog,
    body: { append(value) { dialog = value; } },
  };
  vm.runInNewContext(source, { window, document });
  return {
    form, storage, submitted, probes, saves,
    get dialog() { return dialog; },
    get focused() { return focused; },
    control: name => dialog.controls["#analysisChoice" + name],
    answer: result => finishProbe(result),
    submitAi: () => dialog.controls["#analysisChoiceAi"].submit({ preventDefault() {} }),
  };
}

test("birth form shows the modal every time and only a local choice or a verified code submits", async () => {
  const h = harness();
  h.form.requestSubmit();
  assert.equal(h.focused, h.control("Local"));
  assert.equal(h.control("Token").value, "saved-token");
  assert.deepEqual(h.submitted, []);

  h.control("Token").value = "  ";
  await h.submitAi();
  assert.equal(h.control("Status").textContent, "Nhập mã AI");
  assert.deepEqual(h.probes, []);
  h.control("Token").value = " token-test ";
  for (const [result, message] of [["wrong", "Mã không đúng"], ["offline", "Máy ChatGPT đang tắt — hãy chọn Lá số cục bộ"]]) {
    const checking = h.submitAi();
    assert.ok(h.dialog.buttons.every(button => button.disabled));
    assert.equal(h.control("Status").textContent, "Đang kiểm tra mã...");
    h.answer(result);
    await checking;
    assert.equal(h.control("Status").textContent, message);
    assert.ok(h.dialog.buttons.every(button => !button.disabled));
    assert.deepEqual(h.submitted, []);
  }
  h.control("Local").click();
  assert.equal(h.dialog, null);
  assert.deepEqual(h.submitted, ["local"]);
  assert.deepEqual(h.probes, ["token-test", "token-test"]);
  assert.equal(h.storage.get(choiceKey), "local");

  h.form.requestSubmit();
  assert.equal(h.focused, h.control("Local"));
  h.control("Token").value = " verified-test ";
  const checking = h.submitAi();
  h.answer("ok");
  await checking;
  assert.deepEqual(h.saves, [{ mode: "worker", endpoint: "", token: "verified-test" }]);
  assert.deepEqual(h.submitted, ["local", "ai"]);
  assert.equal(h.storage.get(choiceKey), "ai");
  h.form.requestSubmit();
  assert.equal(h.focused, h.control("Token"));
  assert.equal(h.control("Token").value, "verified-test");
  h.control("Cancel").click();
  assert.equal(h.dialog, null);
});

test("cancelling with Escape while a code is checked invalidates the pending submission", async () => {
  const h = harness();
  h.form.requestSubmit();
  const checking = h.submitAi();
  h.dialog.cancel({ preventDefault() {} });
  h.form.requestSubmit();
  h.answer("ok");
  await checking;
  assert.equal(h.dialog.open, true);
  assert.deepEqual(h.saves, []);
  assert.deepEqual(h.submitted, []);
});
