import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';
import { fitCapture } from './capture-size.js';

const source = (await readFile(new URL('./background.js', import.meta.url), 'utf8')).replace(/^import .*;\r?\n/gm, '');

function fixture({ pageHeight = 125, viewport = 50, fail = false, switched = false, storageError = false, webp = true, large = false } = {}) {
  let click, canvas, title, badge, removed = false, captures = 0;
  const draws = [], stored = {}, tabs = [], waits = [], visibility = [], popups = [], encodings = [];
  const properties = new Map([['visibility', ['visible', 'important']]]);
  const element = { style: {
    getPropertyValue: key => properties.get(key)?.[0] || '',
    getPropertyPriority: key => properties.get(key)?.[1] || '',
    setProperty: (key, value, priority) => properties.set(key, [value, priority]),
    removeProperty: key => properties.delete(key),
  } };
  const context = vm.createContext({
    fitCapture, noticeUrl: 'assets/capture-notice.html',
    scrollX: 7, scrollY: 22, innerWidth: 50, innerHeight: viewport,
    document: {
      createElement: () => ({ remove() { removed = true; } }),
      documentElement: { scrollHeight: pageHeight, append() {} },
      body: { scrollHeight: pageHeight }, querySelectorAll: () => [element],
    },
    getComputedStyle: () => ({ position: 'fixed' }),
    setTimeout: (callback, delay) => { waits.push(delay); callback(); },
    fetch: async data => { assert.match(data, /^data:image\/png/); return { blob: async () => new Blob() }; },
    createImageBitmap: async () => ({ width: 100, height: viewport * 2, close() {} }),
    OffscreenCanvas: class {
      constructor(width, height) { this.width = width; this.height = height; canvas = this; }
      getContext() { return { drawImage: (...args) => draws.push(args.slice(1)) }; }
      async convertToBlob(options) {
        encodings.push(options);
        const blob = new Blob(['image'], { type: options.type === 'image/webp' && !webp ? 'image/png' : options.type });
        if (large && this.height > 100) Object.defineProperty(blob, 'size', { value: 8 * 1024 * 1024 });
        return blob;
      }
    },
    Uint8Array, btoa: value => Buffer.from(value, 'binary').toString('base64'),
    chrome: {
      action: {
        onClicked: { addListener: callback => { click = callback; } },
        setBadgeText: async value => { badge = value.text; },
        setTitle: async value => { title = value.title; },
      },
      scripting: { executeScript: async ({ func, args }) => [{ result: func(...args) }] },
      tabs: {
        query: async () => [{ id: switched ? 2 : 1 }],
        captureVisibleTab: async () => {
          captures++;
          visibility.push(properties.get('visibility')[0]);
          if (fail) throw new Error('Capture denied');
          return 'data:image/png;base64,cG5n';
        },
        create: async value => tabs.push(value),
      },
      storage: { session: { set: async value => {
        if (storageError) throw new Error('Storage unavailable');
        Object.assign(stored, value);
      } } },
      windows: { create: async value => popups.push(value) },
      runtime: { getURL: path => `chrome-extension://glance/${path}` },
    },
  });
  context.window = { scrollTo({ left, top }) {
    context.scrollX = left;
    context.scrollY = Math.min(top, Math.max(0, pageHeight - viewport));
  } };
  vm.runInContext(source, context);
  return { run: () => click({ id: 1, windowId: 1 }), context, draws, stored, tabs, waits, visibility, popups, encodings,
    get result() { return { canvas, title, badge, removed, captures, properties }; } };
}

test('DPR stitching crops overlapping final viewport; restores page; hands off WebP', async () => {
  const f = fixture();
  await f.run();
  assert.equal(f.result.canvas.height, 250);
  assert.deepEqual(f.draws.slice(0, 3).map(draw => [draw[1], draw[3], draw[5]]), [[0, 100, 0], [0, 100, 100], [50, 50, 200]]);
  assert.deepEqual(f.visibility, ['visible', 'hidden', 'hidden']);
  assert.deepEqual(f.result.properties.get('visibility'), ['visible', 'important']);
  assert.equal(f.context.scrollX, 7);
  assert.equal(f.context.scrollY, 22);
  assert.equal(f.result.removed, true);
  assert.ok(f.waits.every(delay => delay >= 500));
  assert.match(f.stored['glance:capture'], /^data:image\/webp;base64,/);
  assert.equal(f.encodings[0].quality, 0.85);
  assert.equal(f.tabs[0].url, 'chrome-extension://glance/index.html');
});

test('caps capture at 20000 device pixels and reports truncation', async () => {
  const f = fixture({ pageHeight: 12000, viewport: 500 });
  await f.run();
  assert.equal(f.result.canvas.height, 20000);
  assert.equal(f.result.captures, 20);
  assert.equal(f.result.badge, '20k');
  assert.match(f.result.title, /top 20000/);
});

test('unsupported WebP falls back to JPEG at quality 0.85', async () => {
  const f = fixture({ webp: false });
  await f.run();
  assert.match(f.stored['glance:capture'], /^data:image\/jpeg;base64,/);
  assert.equal(f.encodings[1].type, 'image/jpeg');
  assert.equal(f.encodings[1].quality, 0.85);
});

test('storage errors show popup without opening analysis', async () => {
  const f = fixture({ storageError: true });
  await f.run();
  assert.equal(f.tabs.length, 0);
  assert.match(f.popups[0].url, /#storage-error$/);
  assert.equal(f.popups[0].type, 'popup');
  assert.match(f.result.title, /Session storage is full or unavailable/);
});

test('oversize capture keeps top rows and reports cropping in popup', async () => {
  const f = fixture({ large: true });
  await f.run();
  assert.ok(f.result.canvas.height <= 100);
  const draw = f.draws.at(-1);
  assert.equal(draw[1], 0);
  assert.equal(draw[3], f.result.canvas.height);
  assert.equal(f.result.badge, 'Top');
  assert.match(f.popups[0].url, /#cropped$/);
  assert.equal(f.tabs.length, 1);
});

test('capture failure and tab switch restore page without handoff', async () => {
  for (const options of [{ fail: true }, { switched: true }]) {
    const f = fixture(options);
    await f.run();
    assert.equal(f.context.scrollY, 22);
    assert.equal(f.result.removed, true);
    assert.equal(f.result.badge, '!');
    assert.equal(f.tabs.length, 0);
    assert.deepEqual(f.stored, {});
  }
});
