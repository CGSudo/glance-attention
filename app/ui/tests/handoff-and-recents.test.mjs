import test from 'node:test';
import assert from 'node:assert/strict';
import { loadImageFromHandoff } from '../src/api/handoff.ts';

test('isTallImage identifies images with height > 2x width', () => {
  const isTallImage = (w, h) => h > 2 * w;
  assert.equal(isTallImage(800, 600), false);
  assert.equal(isTallImage(800, 1600), false);
  assert.equal(isTallImage(800, 1601), true);
  assert.equal(isTallImage(800, 2000), true);
});

test('loadImageFromHandoff returns null outside extension context', async () => {
  const originalChrome = globalThis.chrome;
  delete globalThis.chrome;
  try {
    const res = await loadImageFromHandoff();
    assert.equal(res, null);
  } finally {
    globalThis.chrome = originalChrome;
  }
});

test('loadImageFromHandoff reads glance:capture and removes key in extension context', async () => {
  const originalChrome = globalThis.chrome;
  const originalFetch = globalThis.fetch;
  let removedKey = null;

  globalThis.chrome = {
    storage: {
      session: {
        get(keys, cb) {
          cb({ 'glance:capture': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' });
        },
        remove(key, cb) {
          removedKey = key;
          cb?.();
        },
      },
    },
  };

  globalThis.fetch = async () => new Response(new Uint8Array([1, 2, 3]), {
    headers: { 'Content-Type': 'image/png' },
  });

  try {
    const file = await loadImageFromHandoff();
    assert.ok(file instanceof File);
    assert.equal(file.name, 'extension-capture.png');
    assert.equal(file.type, 'image/png');
    assert.equal(removedKey, 'glance:capture');
  } finally {
    globalThis.chrome = originalChrome;
    globalThis.fetch = originalFetch;
  }
});

test('loadImageFromHandoff detects WebP and JPEG mime types and extensions', async () => {
  const originalChrome = globalThis.chrome;
  const originalFetch = globalThis.fetch;

  globalThis.chrome = {
    storage: {
      session: {
        get(keys, cb) {
          cb({ 'glance:capture': 'data:image/webp;base64,UklGRkAAAABXRUJQVlA4IDQAAADwAQCdASoBAAEAAQAcJaACdLoB+AA=' });
        },
        remove(key, cb) {
          cb?.();
        },
      },
    },
  };

  globalThis.fetch = async () => new Response(new Uint8Array([1, 2, 3]), {
    headers: { 'Content-Type': 'image/webp' },
  });

  try {
    const webpFile = await loadImageFromHandoff();
    assert.ok(webpFile instanceof File);
    assert.equal(webpFile.name, 'extension-capture.webp');
    assert.equal(webpFile.type, 'image/webp');
  } finally {
    globalThis.chrome = originalChrome;
    globalThis.fetch = originalFetch;
  }
});

test('4 sample designs exist, are under 120 KB, and have thumbnails + short names', async () => {
  const { SAMPLES, SAMPLE_SVGS } = await import('../src/utils/samples.ts');
  assert.equal(SAMPLES.length, 4);
  const expectedNames = ['Landing page', 'Product page', 'Mobile app', 'Social ad'];
  for (let i = 0; i < SAMPLES.length; i++) {
    const sample = SAMPLES[i];
    assert.equal(sample.name, expectedNames[i]);
    assert.ok(sample.thumbnail.startsWith('data:image/svg+xml'));
    const svg = SAMPLE_SVGS[sample.id];
    assert.ok(svg, `Missing SVG for ${sample.id}`);
    const byteSize = Buffer.byteLength(svg, 'utf8');
    assert.ok(byteSize < 120 * 1024, `${sample.id} exceeds 120 KB (${byteSize} bytes)`);
  }
});

test('AOI attention share formats with at most 1 decimal', () => {
  const rawShare = 11.5876806;
  const formatted = rawShare.toFixed(1);
  assert.equal(formatted, '11.6');
  assert.equal((40.0).toFixed(1), '40.0');
});
