import registry from '../../../../models/registry.json';
import { downloadModel, verifyModel } from './model-download';

export const browserModels = registry.filter(model => model.tasks.includes('image'));
export type BrowserModel = typeof browserModels[number];

export async function storedModel(model: BrowserModel, bytes?: Uint8Array): Promise<Uint8Array | undefined> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open('glance-models', 1);
    open.onupgradeneeded = () => open.result.createObjectStore('models');
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      const transaction = db.transaction('models', bytes ? 'readwrite' : 'readonly');
      const store = transaction.objectStore('models');
      const request = bytes ? store.put(bytes, model.sha256) : store.get(model.sha256);
      transaction.oncomplete = () => { db.close(); resolve(bytes ?? request.result); };
      transaction.onabort = transaction.onerror = () => { db.close(); reject(transaction.error); };
    };
  });
}

export async function modelBytes(model: BrowserModel, base: string, extension: boolean, progress: (bytes: number) => void, allowDownload = true, signal?: AbortSignal): Promise<Uint8Array> {
  const url = new URL(`models/${model.id}.onnx`, base).href;
  const cache = !extension && 'caches' in globalThis ? await caches.open('glance-models-v1').catch(() => undefined) : undefined;
  const cacheKey = `${url}?sha256=${model.sha256}`;
  const cached = extension ? await storedModel(model).catch(() => undefined)
    : await cache?.match(cacheKey).then(async response => response ? new Uint8Array(await response.arrayBuffer()) : undefined);
  if (cached) {
    try { await verifyModel(cached, model); progress(cached.length); return cached; }
    catch { await cache?.delete(cacheKey); }
  }
  signal?.throwIfAborted();
  if (!allowDownload) throw new Error(`Download ${model.name} once from Models before analyzing.`);
  if (!extension && !cache && model.id !== 'unisal') throw new Error('Browser storage is full or unavailable. Free space, then retry.');
  const urls = extension && model.id !== 'unisal'
    ? [model.url, `https://cgsudo.github.io/glance-attention/app/models/${model.id}.onnx`] : [url];
  const bytes = await downloadModel(urls, model, progress, signal);
  signal?.throwIfAborted();
  if (extension && model.id !== 'unisal') {
    try { await storedModel(model, bytes); }
    catch { throw new Error('Model verified, but browser storage is full or unavailable. Free space, then retry.'); }
  }
  else {
    try { await cache?.put(cacheKey, new Response(new Uint8Array(bytes).buffer)); }
    catch { if (model.id !== 'unisal') throw new Error('Browser storage is full or unavailable. Free space, then retry.'); }
  }
  return bytes;
}
