import { browserModels, storedModel } from './browser-models';
import type { Transport } from './transport';
import type { Aoi, AnalyzeResult, CompareResult, Config, ContentType, InstallProgress, ModelInfo, SystemInfo, VideoResult } from './types';
import type { BrowserRequest } from './web-worker';

export class WebTransport implements Transport {
  private worker?: Worker;
  private sequence = 0;
  private pending = new Map<number, { resolve(value: unknown): void; reject(error: Error): void; progress?: (progress: InstallProgress) => void; modelId: string; kind: BrowserRequest['kind'] }>();
  private provider = 'Not initialized (WebGPU preferred, WASM fallback)';

  constructor(private base = new URL(import.meta.env.BASE_URL, location.href).href, private extension = false,
    private onStatus: (status: string) => void = () => {}) {}

  async getModels(): Promise<ModelInfo[]> {
    const cache = !this.extension && 'caches' in globalThis ? await caches.open('glance-models-v1').catch(() => undefined) : undefined;
    return Promise.all(browserModels.map(async model => ({
      ...model, tasks: ['image'], installed: model.id === 'unisal' || (this.extension
        ? !!await storedModel(model).catch(() => undefined)
        : !!await cache?.match(`${new URL(`models/${model.id}.onnx`, this.base).href}?sha256=${model.sha256}`).catch(() => undefined)),
    } as ModelInfo)));
  }
  async getSystemInfo(): Promise<SystemInfo> {
    return { provider: this.provider, cpu: 'Browser', threads: 1, recommended_model: 'unisal' };
  }
  async getConfig(): Promise<Config> { return { default_model: 'unisal' }; }
  async setConfig(config: Config): Promise<Config> {
    if (!browserModels.some(model => model.id === config.default_model)) throw new Error('Choose an available image model');
    return config;
  }

  private request<T>(kind: BrowserRequest['kind'], modelId: string, files: Blob[], aois: Aoi[], contentType: ContentType, layers?: 'squint', progress?: (progress: InstallProgress) => void): Promise<T> {
    if (!this.worker) {
      this.worker = new Worker(new URL('./web-worker.ts', import.meta.url), { type: 'module' });
      this.worker.onmessage = ({ data }) => {
        const pending = this.pending.get(data.id);
        if (!pending) return;
        if (data.status) {
          this.onStatus(data.status);
          if (data.downloaded !== undefined) pending.progress?.({ id: pending.modelId, downloaded: data.downloaded, total: data.total });
        } else {
          this.pending.delete(data.id);
          if (data.provider) this.provider = data.provider === 'webgpu' ? 'WebGPU (WASM fallback)' : 'WASM';
          if (data.error) pending.reject(new Error(data.error));
          else pending.resolve(data.result);
        }
      };
      this.worker.onerror = () => {
        for (const pending of this.pending.values()) pending.reject(new Error('The browser engine stopped, possibly because the tab ran out of memory. Use UNISAL or the desktop app.'));
        this.pending.clear();
        this.worker?.terminate();
        this.worker = undefined;
      };
    }
    const id = ++this.sequence;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: value => resolve(value as T), reject, progress, modelId, kind });
      this.worker!.postMessage({ id, kind, modelId, files, aois, contentType, layers, base: this.base, extension: this.extension } satisfies BrowserRequest);
    });
  }
  installModel(id: string, progress?: (progress: InstallProgress) => void) {
    return this.request<{ ok: boolean }>('install', id, [], [], 'natural', undefined, progress);
  }
  cancelInstall(id: string) {
    for (const [requestId, pending] of this.pending) {
      if (pending.kind === 'install' && pending.modelId === id) this.worker?.postMessage({ id: requestId, kind: 'cancel' });
    }
  }
  analyze(file: Blob, model = 'unisal', aois: Aoi[] = [], contentType: ContentType = 'natural', layers?: 'squint') {
    return this.request<AnalyzeResult>('analyze', model, [file], aois, contentType, layers);
  }
  compare(a: Blob, b: Blob, model = 'unisal', aois: Aoi[] = [], contentType: ContentType = 'natural') {
    return this.request<CompareResult>('compare', model, [a, b], aois, contentType);
  }
  async analyzeVideo(): Promise<VideoResult> { throw new Error('Get the desktop app for video analysis.'); }
}
