import { WebTransport } from '../../app/ui/src/api/web.ts';
const api = globalThis.browser || globalThis.chrome;
const status = document.querySelector("#status");
const overlay = document.querySelector("#overlay");
const gaze = document.querySelector("#gaze");
const retry = document.querySelector("#retry");
const heatmap = document.querySelector("#heatmap");
const dots = document.querySelector("#dots");
const squint = document.querySelector("#squint");
const squintImage = document.querySelector("#squint-image");
const web = new WebTransport(api.runtime.getURL('/'), true, text => { status.textContent = text; });
const id = location.hash.slice(1);
let original;
document.querySelector("#settings").onclick = () => api.runtime.openOptionsPage();
overlay.onchange = () => { heatmap.hidden = !overlay.checked; };
gaze.onchange = () => { dots.hidden = !gaze.checked; };
squint.onchange = () => { squintImage.hidden = !squint.checked; };
retry.onclick = analyze;

async function analyze() {
  retry.hidden = true;
  overlay.disabled = gaze.disabled = squint.disabled = true;
  heatmap.hidden = dots.hidden = squintImage.hidden = true;
  document.querySelector("#clarity").textContent = "";
  try {
    const { mode, token, model = 'unisal' } = await api.storage.local.get(['mode', 'token', 'model']);
    const image = await (await fetch(original)).blob();
    let result;
    if (mode !== 'server') {
      result = await web.analyze(image, model, [], 'natural', 'squint');
    } else {
      if (!token) throw new Error("Open Connection settings and save your Glance token, then retry.");
    status.textContent = "2/2: Analyzing locally…";
    const form = new FormData();
    form.append("image", image, "capture.png");
    form.append('model', model);
    form.append('layers', 'squint');
    let response;
    try {
      response = await fetch("http://127.0.0.1:7878/v1/analyze", {
        method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form,
        signal: AbortSignal.timeout(120000)
      });
    } catch (error) {
      throw new Error(error.name === "TimeoutError" ? "Analysis timed out. Retry analysis." : "Start Glance, then retry");
    }
    if (!response.ok) throw new Error(response.status === 401 || response.status === 403
      ? "Token rejected. Update Connection settings, then retry."
      : `Glance returned HTTP ${response.status}. Check Glance, then retry.`);
    result = await response.json();
    }
    if (!(result.width > 0 && result.height > 0) || !result.overlay_png_b64 ||
        !Number.isFinite(result.metrics?.clarity) || !Array.isArray(result.scanpath)) {
      throw new Error("Invalid Glance response. Check API version, then retry.");
    }
    heatmap.src = `data:image/png;base64,${result.overlay_png_b64}`;
    heatmap.hidden = !overlay.checked;
    squint.disabled = !result.squint_png_b64;
    if (result.squint_png_b64) {
      squintImage.src = `data:image/png;base64,${result.squint_png_b64}`;
      squintImage.hidden = !squint.checked;
    }
    dots.replaceChildren();
    // Scanpath x/y are 0-100 percentages of the image (glance-core contract).
    for (const point of result.scanpath) {
      if (![point.x, point.y, point.order].every(Number.isFinite)) continue;
      const dot = document.createElement("span");
      dot.className = "dot";
      dot.textContent = point.order;
      dot.style.left = `${point.x}%`;
      dot.style.top = `${point.y}%`;
      dots.append(dot);
    }
    dots.hidden = !gaze.checked;
    overlay.disabled = gaze.disabled = false;
    document.querySelector("#clarity").textContent = `Clarity: ${result.metrics.clarity.toFixed(1)} / 100 · Higher means more focused predicted attention.`;
    status.textContent = "Complete. Toggle heatmap or gaze order to inspect your screenshot.";
  } catch (error) {
    status.textContent = error.message;
  } finally {
    retry.hidden = false;
  }
}

(async () => {
  const stored = await api.storage.session.get(id);
  const capture = stored[id];
  await api.storage.session.remove(id);
  original = capture?.original;
  if (!original) {
    status.textContent = capture?.error || "Screenshot unavailable. Return to your page and click Glance again.";
    return;
  }
  document.querySelector("#original").src = original;
  await analyze();
})().catch((error) => { status.textContent = error.message; });
