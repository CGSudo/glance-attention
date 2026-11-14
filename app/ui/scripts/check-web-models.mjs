import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, readdir, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { resolve, extname, delimiter, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

// Run from app/ui through npx --yes --package=playwright@1.56.1 -c "node scripts/check-web-models.mjs --proof".
const playwrightBin = process.env.PATH.split(delimiter).find(path => path.includes('_npx') && path.endsWith('.bin'));
const { chromium } = await import(pathToFileURL(resolve(playwrightBin, '../playwright/index.mjs')));
const proof = process.argv.includes('--proof');
const backend = process.argv.includes('--gpu') ? undefined : 'wasm';
const root = resolve('../..');
const assets = await readdir(resolve(root, 'docs/app/assets'));
const workerPath = `/glance-attention/app/assets/${assets.find(name => name.startsWith('web-worker-'))}`;
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.wasm': 'application/wasm', '.png': 'image/png' };
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    const path = url.pathname.startsWith('/samples/') ? resolve(root, `.${url.pathname}`)
      : resolve(root, 'docs', `.${url.pathname.replace('/glance-attention', '')}${url.pathname.endsWith('/') ? 'index.html' : ''}`);
    response.setHeader('Content-Type', types[extname(path)] || 'application/octet-stream');
    if (url.pathname === workerPath) {
      const source = await readFile(path, 'utf8');
      const bypassed = proof ? source.replace(/&&\(\w+\.extension\|\|\w+\.id==="unisal"\)/, '') : source;
      response.end(bypassed);
    } else {
      const stream = createReadStream(path);
      stream.on('error', () => { response.statusCode = 404; response.end(); });
      stream.pipe(response);
    }
  } catch (error) { response.statusCode = 500; response.end(String(error)); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
let context;
let profile;
let memoryTimer;
try {
  await mkdir('screenshots', { recursive: true });
  for (const model of process.argv.includes('--sum') ? ['sum'] : ['sum', 'transalnet']) {
    profile = await mkdtemp(resolve('screenshots/.web-model-profile-'));
    context = await chromium.launchPersistentContext(profile, { channel: 'msedge', headless: true, viewport: { width: 1440, height: 1000 } });
    const cdp = await context.browser().newBrowserCDPSession();
    console.log(JSON.stringify({ browser: context.browser().version(), proof, model }));
    const page = await context.newPage();
    if (!proof) await context.addInitScript(({ backend }) => {
      localStorage.setItem('glance_reduced_motion', 'true');
      localStorage.setItem('glance_hint_dismissed', 'true');
      localStorage.setItem('glance_client_guide_seen', 'true');
      Object.defineProperty(navigator, 'deviceMemory', { get: () => 4 });
      globalThis.modelRuns = [];
      const NativeWorker = Worker;
      globalThis.Worker = class extends NativeWorker {
        constructor(...args) {
          super(...args);
          this.requests = new Map();
          this.addEventListener('message', ({ data }) => {
            const request = this.requests.get(data.id);
            if (!request) return;
            if (data.status?.startsWith('3/3')) request.inferenceStart = performance.now();
            if (data.result || data.error) {
              globalThis.modelRuns.push({ ...request, ...data, seconds: (performance.now() - request.start) / 1000,
                inferenceSeconds: request.inferenceStart ? (performance.now() - request.inferenceStart) / 1000 : undefined });
              this.requests.delete(data.id);
            }
          });
        }
        postMessage(message, ...args) {
          this.requests.set(message.id, { kind: message.kind, model: message.modelId, start: performance.now() });
          super.postMessage({ ...message, backend }, ...args);
        }
      };
    }, { backend });
    page.on('console', message => { if (message.type() === 'error') console.log('console', message.text().slice(0, 400)); });
    await page.goto(`${base}/glance-attention/app/`);
    let peakRendererBytes = 0;
    let sampling = false;
    memoryTimer = setInterval(async () => {
      if (sampling) return;
      sampling = true;
      try {
        const { processInfo } = await cdp.send('SystemInfo.getProcessInfo');
        const ids = processInfo.filter(process => process.type === 'renderer').map(process => process.id);
        if (ids.length) {
          const sample = spawnSync('powershell.exe', ['-NoProfile', '-Command', `(Get-Process -Id ${ids.join(',')} -ErrorAction SilentlyContinue | Measure-Object -Property WorkingSet64 -Sum).Sum`], { encoding: 'utf8' });
          peakRendererBytes = Math.max(peakRendererBytes, Number(sample.stdout.trim()) || 0);
        }
      } catch { /* Memory sampling is optional when CDP cannot inspect renderer processes. */ }
      finally { sampling = false; }
    }, 1000);
    const result = proof ? await page.evaluate(async ({ model, workerPath, backend }) => {
      const worker = new Worker(workerPath, { type: 'module' });
      const file = await fetch('/samples/webpage.png').then(response => response.blob());
      const start = performance.now();
      let inferenceStart;
      const statuses = [];
      return new Promise(resolve => {
        const timeout = setTimeout(() => { worker.terminate(); resolve({ model, error: 'WASM exceeded 120 s', seconds: (performance.now() - start) / 1000, statuses }); }, 120_000);
        worker.onerror = event => { clearTimeout(timeout); resolve({ model, error: event.message, seconds: (performance.now() - start) / 1000, statuses }); };
        worker.onmessage = ({ data }) => {
          if (data.status) {
            if (!data.status.startsWith('1/3') && !statuses.some(status => status.text === data.status)) statuses.push({ text: data.status, seconds: (performance.now() - start) / 1000 });
            if (data.status.startsWith('3/3')) inferenceStart = performance.now();
          } else {
            clearTimeout(timeout);
            worker.terminate();
            resolve({ model, error: data.error, provider: data.provider, seconds: (performance.now() - start) / 1000,
              inferenceSeconds: inferenceStart ? (performance.now() - inferenceStart) / 1000 : undefined,
              statuses, result: data.result });
          }
        };
        const request = { id: 1, kind: 'analyze', modelId: model, files: [file], aois: [], contentType: 'ui', base: new URL('/glance-attention/app/', location.href).href, extension: false, backend };
        worker.postMessage({ ...request, id: 0, kind: 'install' });
        const onmessage = worker.onmessage;
        worker.onmessage = event => {
          if (event.data.id === 0 && event.data.result) worker.postMessage(request);
          else onmessage(event);
        };
      });
    }, { model, workerPath, backend }) : await checkUi(page, model);
    clearInterval(memoryTimer);
    result.peakRendererBytes = peakRendererBytes;
    if (result.result) {
      const comparison = spawnSync('python', ['-c', 'import sys,json,base64,io; import numpy as np; from PIL import Image; d=json.load(sys.stdin); a=np.asarray(Image.open(io.BytesIO(base64.b64decode(d["heatmap"]))))[:,:,3].astype(float).ravel(); b=np.asarray(Image.open(d["expected"])).astype(float).ravel(); print(float(np.corrcoef(a,b)[0,1]))'], {
        input: JSON.stringify({ heatmap: result.result.heatmap_png_b64, expected: resolve(root, `samples/expected/${model}/webpage.png`) }), encoding: 'utf8',
      });
      assert.equal(comparison.status, 0, comparison.stderr);
      result.cc = Number(comparison.stdout.trim());
      result.clarity = result.result.metrics.clarity;
      delete result.result;
    }
    console.log(JSON.stringify(result));
    assert.equal(result.error, undefined);
    assert.ok(result.cc > 0.98, `${model} reference CC ${result.cc}`);
    assert.ok(result.seconds < 120, `${model} exceeded 120 seconds`);
    await cleanup();
  }
} finally {
  await cleanup();
  await new Promise(resolve => server.close(resolve));
}

async function cleanup() {
  clearInterval(memoryTimer);
  await context?.close();
  context = undefined;
  if (profile) {
    assert.ok(profile.startsWith(`${resolve('screenshots')}${sep}.web-model-profile-`));
    await rm(profile, { recursive: true, force: true });
    profile = undefined;
  }
}

async function checkUi(page, model) {
  const modelName = model === 'sum' ? 'SUM' : 'TranSalNet Dense';
  const downloads = [];
  page.on('request', request => { if (request.url().includes(`/models/${model}.onnx`)) downloads.push(request.url()); });
  await page.getByRole('button', { name: 'Switch active attention prediction model' }).click();
  await page.getByRole('button', { name: new RegExp(`^${modelName}`) }).click();
  await page.waitForURL('**/#models');
  const card = page.locator('div.rounded-lg.p-4').filter({ has: page.getByRole('heading', { name: modelName, exact: true }) });
  await card.getByText('Large model. Best on a computer.', { exact: true }).waitFor();
  assert.equal(downloads.length, 0, 'Choosing a model must not auto-download');
  await card.getByRole('button', { name: /^Download once/ }).click();
  await card.getByRole('progressbar').waitFor();
  await card.getByRole('button', { name: 'Cancel download', exact: true }).waitFor();
  try {
    await card.getByRole('button', { name: 'Use', exact: true }).waitFor({ timeout: 120_000 });
  } catch (error) {
    console.log('Download errors', await page.getByRole('alert').allTextContents());
    console.log('Worker errors', await page.evaluate(() => globalThis.modelRuns.filter(run => run.error)));
    throw error;
  }
  await card.getByText(/Stored in this browser/).waitFor();
  assert.equal(downloads.length, 1);
  await card.getByRole('button', { name: 'Use', exact: true }).click();
  if (model === 'sum') await page.getByRole('combobox', { name: 'Content type', exact: true }).selectOption('ui');
  await page.evaluate(() => { location.hash = 'analyze'; });
  await page.locator('input[type=file]').first().setInputFiles(resolve(root, 'samples/webpage.png'));
  await page.waitForFunction(() => globalThis.modelRuns.some(run => run.kind === 'analyze'), undefined, { timeout: 120_000 });
  const result = await page.evaluate(() => globalThis.modelRuns.findLast(run => run.kind === 'analyze'));
  assert.equal(result.error, undefined);
  await page.getByRole('img', { name: 'Attention Heatmap', exact: true }).waitFor();
  await page.waitForFunction(() => document.querySelector('canvas[aria-label="Attention Heatmap"]')?.width === 1024);
  await page.getByText('Visual Clarity', { exact: true }).waitFor();
  await page.screenshot({ path: `screenshots/web-${model}.png` });
  assert.equal(downloads.length, 1, 'Analysis must use cached model');
  await page.reload();
  await page.getByRole('button', { name: 'Switch active attention prediction model' }).click();
  await page.getByRole('button', { name: new RegExp(`^${modelName}`) }).click();
  try {
    await page.waitForFunction(name => document.querySelector('button[aria-label="Switch active attention prediction model"]')?.textContent.includes(name), modelName, { timeout: 5000 });
  } catch (error) {
    console.log('Reload failed', page.url(), await page.getByRole('button', { name: 'Switch active attention prediction model' }).textContent());
    throw error;
  }
  assert.equal(downloads.length, 1, 'Reload must retain cached model');
  for (const width of [320, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const dimensions = await page.locator('header').evaluate(element => ({ scroll: element.scrollWidth, client: element.clientWidth }));
    assert.ok(dimensions.scroll <= dimensions.client, `${model} toolbar overflows at ${width}px ${JSON.stringify(dimensions)}`);
  }
  if (model === 'sum') {
    await page.setViewportSize({ width: 320, height: 1000 });
    await page.getByRole('button', { name: 'Switch active attention prediction model' }).click();
    await page.getByRole('combobox', { name: /Content type/ }).selectOption('ecommerce');
    await page.getByRole('combobox', { name: /Content type/ }).selectOption('ui');
  }
  return result;
}
