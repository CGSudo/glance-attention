import { WebTransport } from '../../app/ui/src/api/web.ts';
const api = globalThis.browser || globalThis.chrome;
const token = document.querySelector("#token");
const mode = document.querySelector('#mode');
const model = document.querySelector('#model');
const status = document.querySelector('#status');
const download = document.querySelector('#download');
const web = new WebTransport(api.runtime.getURL('/'), true, text => { status.textContent = text; });
api.storage.local.get(['token', 'mode', 'model']).then(stored => {
  token.value = stored.token || '';
  mode.value = stored.mode || 'browser';
  model.value = stored.model || 'unisal';
});
download.onclick = async () => {
  if (model.value === 'unisal') { status.textContent = 'UNISAL is included. Choose SUM or TranSalNet to download.'; return; }
  download.disabled = true;
  try { await web.installModel(model.value); status.textContent = 'Model verified and saved. Save settings to use it.'; }
  catch (error) { status.textContent = error.message; }
  finally { download.disabled = false; }
};
document.querySelector("form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (mode.value === 'server' && !token.value.trim()) { status.textContent = 'Paste your desktop token first.'; return; }
  await api.storage.local.set({ token: token.value.trim(), mode: mode.value, model: model.value });
  document.querySelector("#status").textContent = "Saved. Open a web page, then click Glance or press Alt+Shift+G.";
});
