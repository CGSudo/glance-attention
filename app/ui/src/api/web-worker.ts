/// <reference lib="webworker" />
import * as ort from 'onnxruntime-web/webgpu';
import init, { preprocess, finish, compare } from '../wasm/glance_wasm';
import wasmUrl from '../wasm/glance_wasm_bg.wasm?url';
import { browserModels, modelBytes } from './browser-models';
import type { Aoi, ContentType } from './types';

export interface BrowserRequest {
  id: number;
  kind: 'analyze' | 'compare' | 'install';
  modelId: string;
  files: Blob[];
  aois: Aoi[];
  contentType: ContentType;
  layers?: 'squint';
  base: string;
  extension: boolean;
  backend?: 'wasm';
}

const scope = self as unknown as DedicatedWorkerGlobalScope;
let session: ort.InferenceSession | undefined;
let activeModel = '';
let provider = 'wasm';
let ready: Promise<unknown> | undefined;
let queue: Promise<unknown> = Promise.resolve();
ort.env.wasm.numThreads = 1;
ort.env.wasm.proxy = false;
ort.env.logLevel = 'error';

async function handle(request: BrowserRequest) {
  const model = browserModels.find(model => model.id === request.modelId && (request.extension || model.id === 'unisal'));
  if (!model) throw new Error('Choose an available image model');
  const status = (text: string, downloaded?: number) => scope.postMessage({ id: request.id, status: text, downloaded, total: model.size_bytes });
  ort.env.wasm.wasmPaths = {
    mjs: new URL('ort/ort-wasm-simd-threaded.jsep.mjs', request.base).href,
    wasm: new URL('ort/ort-wasm-simd-threaded.jsep.wasm', request.base).href,
  };
  if (activeModel !== model.id || !session || request.kind === 'install') {
    const bytes = await modelBytes(model, request.base, request.extension, downloaded =>
      status(`1/3: Loading ${model.name} — ${Math.round(downloaded / model.size_bytes * 100)}%`, downloaded));
    if (request.kind === 'install') return { ok: true };
    await session?.release();
    session = undefined;
    status('2/3: Preparing browser engine…');
    const gpu = (navigator as WorkerNavigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
    provider = !request.backend && await gpu?.requestAdapter().catch(() => null) ? 'webgpu' : 'wasm';
    try {
      session = await ort.InferenceSession.create(bytes, { executionProviders: provider === 'webgpu' ? ['webgpu', 'wasm'] : ['wasm'] });
    } catch (error) {
      if (provider === 'wasm') throw error;
      provider = 'wasm';
      session = await ort.InferenceSession.create(bytes, { executionProviders: ['wasm'] });
    }
    activeModel = model.id;
  }
  ready ??= init({ module_or_path: wasmUrl }).catch(error => { ready = undefined; throw error; });
  await ready;
  const analyze = async (file: Blob): Promise<string> => {
    if (file.size > 25 * 1024 * 1024) throw new Error('Image exceeds 25 MB upload limit');
    const prepared = preprocess(new Uint8Array(await file.arrayBuffer()), JSON.stringify(model));
    try {
      if (!session) throw new Error('Browser engine unavailable');
      const dims = Array.from(prepared.dims);
      const metadata = session.inputMetadata[0];
      if (metadata.isTensor && metadata.shape.length === 5) dims.splice(1, 0, 1);
      const feeds: Record<string, ort.Tensor> = { [session.inputNames[0]]: new ort.Tensor('float32', prepared.tensor, dims) };
      if (model.condition) {
        const values = new Float32Array(4);
        values[request.contentType === 'ui' ? 3 : request.contentType === 'ecommerce' ? 2 : 1] = 1;
        feeds[model.condition.name] = new ort.Tensor('float32', values, [1, 4]);
      }
      status(`3/3: Analyzing with ${provider === 'webgpu' ? 'WebGPU' : 'WASM'}…`);
      const outputs = await session.run(feeds);
      try {
        const output = outputs.heatmap ?? outputs[session.outputNames[0]];
        if (output.type !== 'float32' || !(output.data instanceof Float32Array)) throw new Error('Expected float32 heatmap');
        return finish(output.data, Uint32Array.from(output.dims), prepared.width, prepared.height, JSON.stringify(model), JSON.stringify(request.aois), request.layers);
      } finally { Object.values(outputs).forEach(output => output.dispose()); }
    } finally { prepared.free(); }
  };
  try {
    const a = await analyze(request.files[0]);
    return request.kind === 'compare' ? JSON.parse(compare(a, await analyze(request.files[1]))) : JSON.parse(a);
  } catch (error) {
    if (provider !== 'webgpu') throw error;
    await session.release();
    session = undefined;
    return handle({ ...request, backend: 'wasm' });
  }
}

scope.onmessage = ({ data }: MessageEvent<BrowserRequest>) => {
  queue = queue.then(async () => {
    try { scope.postMessage({ id: data.id, result: await handle(data), provider }); }
    catch (error) { scope.postMessage({ id: data.id, error: String(error) }); }
  });
};
