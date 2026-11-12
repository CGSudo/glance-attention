const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { execFileSync } = require("node:child_process");

function files(folder) {
  return fs.readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const name = path.join(folder, entry.name);
    return entry.name === "node_modules" ? [] : entry.isDirectory() ? files(name) : [name];
  });
}

function panel() {
  const elements = {};
  const element = () => ({
    checked: true, value: "test-token", style: {}, children: [],
    append(child) { this.children.push(child); },
    replaceChildren() { this.children = []; }
  });
  return { elements, document: {
    querySelector: (selector) => elements[selector] ||= element(),
    createElement: element
  } };
}

(async () => {
  let jsCount = 0;
  let jsonCount = 0;
  for (const name of files(__dirname)) {
    if (/\.(js|cjs)$/.test(name)) {
      execFileSync(process.execPath, ["--check", name]);
      jsCount++;
    }
    if (name.endsWith(".json")) {
      JSON.parse(fs.readFileSync(name, "utf8"));
      jsonCount++;
    }
  }
  const html = fs.readFileSync(path.join(__dirname, "figma-plugin/ui.html"), "utf8");
  const ui = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  new vm.Script(ui);

  const messages = [];
  const frame = {
    type: "FRAME", width: 100, height: 60, relativeTransform: [[1, 0, 20], [0, 1, 30]],
    async exportAsync(options) { assert.equal(options.constraint.value, 2); return new Uint8Array([137, 80]); }
  };
  const parent = { children: [frame], layoutMode: "HORIZONTAL", insertChild(i, node) { this.children.splice(i, 0, node); } };
  frame.parent = parent;
  let layer;
  const figma = {
    showUI() {}, ui: { postMessage: (message) => messages.push(message) }, currentPage: { selection: [] },
    createImage(bytes) { assert.equal(bytes[0], 137); return { hash: "heatmap" }; },
    createRectangle() { return layer = { resize(w, h) { this.width = w; this.height = h; } }; }
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "figma-plugin/code.js"), "utf8"), { figma, __html__: "", Uint8Array });
  await figma.ui.onmessage({ type: "analyze" });
  assert.match(messages.pop().message, /Select one frame/);
  figma.currentPage.selection = [frame];
  await figma.ui.onmessage({ type: "analyze" });
  assert.equal(messages.pop().type, "image");
  await figma.ui.onmessage({ type: "place", bytes: [-1] });
  assert.match(messages.pop().message, /Heatmap unavailable/);
  await figma.ui.onmessage({ type: "place", bytes: [137, 80] });
  assert.equal(messages.pop().type, "placed");
  assert.equal(parent.children[1], layer);
  assert.equal(layer.layoutPositioning, "ABSOLUTE");
  assert.equal(layer.width, 100);
  assert.deepEqual(layer.relativeTransform, frame.relativeTransform);
  assert.equal(layer.fills[0].imageHash, "heatmap");

  const { document, elements } = panel();
  let token;
  let mode = "ok";
  let transportMode = "server";
  let browserRequests = 0;
  let requests = 0;
  const context = {
    document, location: { hash: "#capture" }, FormData, Blob, AbortSignal,
    sessionStorage: { getItem() {}, setItem() {} },
    chrome: {
      runtime: { openOptionsPage() {}, getURL(path) { return `chrome-extension://test${path}`; } },
      storage: { local: { async get() { return { token, mode: transportMode }; } }, session: {
        async get() { return { capture: { original: "data:image/png;base64,iVBORw==" } }; }, async remove() {}
      } }
    },
    WebTransport: class {
      async analyze(image, model, aois, contentType, layers) {
        browserRequests++;
        assert.ok(image instanceof Blob);
        assert.equal(model, 'unisal');
        assert.equal(layers, 'squint');
        return { width: 200, height: 100, overlay_png_b64: 'iVBORw==', squint_png_b64: 'iVBORw==', metrics: { clarity: 42 }, scanpath: [] };
      }
    },
    async fetch(url, options) {
      if (url.startsWith("data:")) return { blob: async () => new Blob(["png"]) };
      requests++;
      assert.equal(url, "http://127.0.0.1:7878/v1/analyze");
      assert.equal(options.headers.Authorization, "Bearer test-token");
      assert.equal(options.body.get("image").name, "capture.png");
      if (mode === "offline") throw new TypeError("Failed to fetch");
      return { ok: mode === "ok", status: 401, json: async () => ({
        width: 200, height: 100, overlay_png_b64: "iVBORw==", metrics: { clarity: 42 },
        scanpath: [{ x: 50, y: 25, order: 1 }]
      }) };
    }
  };
  vm.createContext(context);
  const resultSource = fs.readFileSync(path.join(__dirname, "browser-extension/result.js"), "utf8").replace(/^import .*;\r?\n/gm, '');
  vm.runInContext(resultSource, context);
  await new Promise(setImmediate);
  assert.match(elements["#status"].textContent, /save your Glance token/);
  assert.equal(requests, 0);
  token = "test-token";
  await vm.runInContext("analyze()", context);
  assert.match(elements["#clarity"].textContent, /42.0/);
  assert.equal(elements["#dots"].children[0].style.left, "50%");
  assert.equal(elements["#dots"].children[0].style.top, "25%");
  mode = "offline";
  await vm.runInContext("analyze()", context);
  assert.equal(elements["#status"].textContent, "Start Glance, then retry");
  mode = "unauthorized";
  await vm.runInContext("analyze()", context);
  assert.match(elements["#status"].textContent, /Token rejected/);
  transportMode = 'browser';
  token = undefined;
  await vm.runInContext('analyze()', context);
  assert.equal(browserRequests, 1);
  assert.equal(elements['#squint'].disabled, false);
  assert.equal(elements['#squint-image'].src, 'data:image/png;base64,iVBORw==');
  console.log(`PASS: ${jsCount} JS/CJS syntax checks, ${jsonCount} JSON parses, inline UI syntax, Figma export/validation/layer placement, Chrome auth/multipart/gaze/errors.`);
})().catch((error) => { console.error(error); process.exitCode = 1; });
