import test from 'node:test';
import assert from 'node:assert/strict';
import { downloadModel, verifyModel } from '../src/api/model-download.ts';

const bytes = new TextEncoder().encode('abc');
const model = { id: 'test', size_bytes: 3, sha256: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad' };
test('download verifies SHA-256, caps bytes, reports progress, and falls back on CORS', async () => {
  const originalFetch = globalThis.fetch;
  try {
    const urls = [];
    globalThis.fetch = async url => {
      urls.push(url);
      if (url === 'release') throw new TypeError('CORS');
      return new Response(bytes);
    };
    const progress = [];
    assert.deepEqual(await downloadModel(['release', 'mirror'], model, n => progress.push(n)), bytes);
    assert.deepEqual(urls, ['release', 'mirror']);
    assert.deepEqual(progress, [3]);
    await assert.rejects(verifyModel(bytes, { ...model, sha256: '0'.repeat(64) }), /SHA-256 mismatch/);
    await verifyModel(new Uint8Array([0, ...bytes, 0]).subarray(1, 4), model);
    await assert.rejects(verifyModel(bytes.subarray(1), model), /size mismatch/);
    await assert.rejects(downloadModel(['mirror'], { ...model, size_bytes: 2 }, () => {}), /exceeds registry size/);
    await assert.rejects(downloadModel(['mirror'], { ...model, size_bytes: 4 }, () => {}), /incomplete download/);
    globalThis.fetch = async () => new Response(null, { status: 404 });
    await assert.rejects(downloadModel(['release', 'mirror'], model, () => {}), /not published yet/);
  } finally { globalThis.fetch = originalFetch; }
});
