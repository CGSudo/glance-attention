import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

const bundle = await build({
  entryPoints: [fileURLToPath(new URL('../src/api/web.ts', import.meta.url))],
  bundle: true, write: false, format: 'esm',
  define: {
    'import.meta.env.BASE_URL': '"/glance-attention/app/"',
    'import.meta.url': JSON.stringify(new URL('../src/api/web.ts', import.meta.url).href),
  },
});

const { WebTransport } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const modelBundle = await build({
  entryPoints: [fileURLToPath(new URL('../src/api/browser-models.ts', import.meta.url))],
  bundle: true, write: false, format: 'esm',
});
const { modelBytes } = await import(`data:text/javascript;base64,${Buffer.from(modelBundle.outputFiles[0].text).toString('base64')}`);

test('web offers only verified image models, keeps UNISAL default, and detects cached downloads', async () => {
  const originalCaches = globalThis.caches;
  const matches = [];
  globalThis.caches = { async open() { return { async match(key) {
    matches.push(key);
    return key.includes('/sum.onnx?sha256=') ? new Response('cached') : undefined;
  } }; } };
  try {
    const transport = new WebTransport('http://localhost/glance-attention/app/');
    const models = await transport.getModels();
    assert.deepEqual(models.map(model => model.id).sort(), ['sum', 'transalnet', 'unisal']);
    assert.equal(models.find(model => model.id === 'sum').installed, true);
    assert.equal(models.find(model => model.id === 'transalnet').installed, false);
    assert.equal(models.find(model => model.id === 'unisal').installed, true);
    assert.equal(matches.length, 2);
    assert.deepEqual(await transport.getConfig(), { default_model: 'unisal' });
    for (const default_model of ['unisal', 'sum', 'transalnet']) {
      assert.deepEqual(await transport.setConfig({ default_model }), { default_model });
    }
    await assert.rejects(transport.setConfig({ default_model: 'unisal_video' }), /available image model/);
    await assert.rejects(transport.setConfig({ default_model: 'unknown' }), /available image model/);
  } finally { globalThis.caches = originalCaches; }
});

test('large models require an explicit download and successful browser storage', async () => {
  const originalCaches = globalThis.caches;
  const originalFetch = globalThis.fetch;
  const bytes = new TextEncoder().encode('abc');
  const model = { id: 'sum', name: 'SUM', size_bytes: 3, sha256: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad' };
  const base = 'http://localhost/glance-attention/app/';
  let fetched = 0;
  globalThis.fetch = async () => { fetched++; return new Response(bytes); };
  try {
    globalThis.caches = { async open() { return { async match() {}, async put() { throw new DOMException('Full', 'QuotaExceededError'); } }; } };
    await assert.rejects(modelBytes(model, base, false, () => {}, false), /Download SUM once/);
    assert.equal(fetched, 0);
    await assert.rejects(modelBytes(model, base, false, () => {}), /storage is full or unavailable/);
    assert.equal(fetched, 1);
    globalThis.caches = { async open() { return { async match() { return new Response(bytes); } }; } };
    assert.deepEqual(await modelBytes(model, base, false, () => {}, false), bytes);
    assert.equal(fetched, 1);
    globalThis.caches = { async open() { throw new Error('Disabled storage'); } };
    await assert.rejects(modelBytes(model, base, false, () => {}), /storage is full or unavailable/);
    assert.equal(fetched, 1);
  } finally { globalThis.caches = originalCaches; globalThis.fetch = originalFetch; }
});

test('cancel targets a pending install while analysis remains usable', async () => {
  const originalWorker = globalThis.Worker;
  const messages = [];
  let worker;
  globalThis.Worker = class {
    constructor() { worker = this; }
    postMessage(message) { messages.push(message); }
  };
  try {
    const transport = new WebTransport('http://localhost/glance-attention/app/');
    const install = transport.installModel('sum');
    const analysis = transport.analyze(new Blob(['image']), 'unisal');
    transport.cancelInstall('sum');
    assert.deepEqual(messages.map(({ id, kind }) => ({ id, kind })), [
      { id: 1, kind: 'install' }, { id: 2, kind: 'analyze' }, { id: 1, kind: 'cancel' },
    ]);
    worker.onmessage({ data: { id: 1, error: 'Download canceled' } });
    worker.onmessage({ data: { id: 2, result: { model: 'unisal' }, provider: 'wasm' } });
    await assert.rejects(install, /Download canceled/);
    assert.deepEqual(await analysis, { model: 'unisal' });
    transport.cancelInstall('sum');
    assert.equal(messages.length, 3);
  } finally { globalThis.Worker = originalWorker; }
});
