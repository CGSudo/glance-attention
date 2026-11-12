import { Transport } from './transport';
import {
  Aoi,
  AnalyzeResult,
  CompareResult,
  ModelInfo,
  VideoResult,
  Config,
  ContentType,
  SystemInfo,
} from './types';
import { sampleVideoFrames } from './video';

export class HttpTransport implements Transport {
  private baseUrl: string;
  private token: string;

  constructor(baseUrl = 'http://127.0.0.1:7878', token = '') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.token = token;
  }

  setToken(token: string) {
    this.token = token;
  }

  setBaseUrl(url: string) {
    this.baseUrl = url.replace(/\/$/, '');
  }

  private getHeaders(): HeadersInit {
    const headers: Record<string, string> = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  async getSystemInfo(): Promise<SystemInfo> {
    const res = await fetch(`${this.baseUrl}/v1/system`, { headers: this.getHeaders() });
    if (!res.ok) throw new Error(`System information failed: ${res.statusText}`);
    return res.json();
  }

  async getConfig(): Promise<Config> {
    const res = await fetch(`${this.baseUrl}/v1/config`, { headers: this.getHeaders() });
    if (!res.ok) throw new Error(`Configuration failed: ${res.statusText}`);
    return res.json();
  }

  async setConfig(config: Config): Promise<Config> {
    const res = await fetch(`${this.baseUrl}/v1/config`, {
      method: 'POST', headers: { ...this.getHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify(config),
    });
    if (!res.ok) throw new Error(`Save configuration failed: ${res.statusText}`);
    return res.json();
  }

  async getModels(): Promise<ModelInfo[]> {
    const res = await fetch(`${this.baseUrl}/v1/models`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch models: ${res.statusText}`);
    }
    return res.json();
  }

  async installModel(id: string): Promise<{ ok: boolean }> {
    const res = await fetch(`${this.baseUrl}/v1/models/${id}/install`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      throw new Error(`Failed to install model ${id}: ${res.statusText}`);
    }
    return res.json();
  }

  async analyze(file: File | Blob, model?: string, aois: Aoi[] = [], contentType: ContentType = 'natural', layers?: 'squint'): Promise<AnalyzeResult> {
    const formData = new FormData();
    formData.append('image', file);
    if (layers) formData.append('layers', layers);
    if (model) formData.append('model', model);
    formData.append('content_type', contentType);
    if (aois.length > 0) formData.append('aois', JSON.stringify(aois));

    const res = await fetch(`${this.baseUrl}/v1/analyze`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: formData,
    });
    if (!res.ok) {
      throw new Error(`Analyze request failed: ${res.statusText}`);
    }
    return res.json();
  }

  async compare(
    fileA: File | Blob,
    fileB: File | Blob,
    model?: string,
    aois: Aoi[] = [],
    contentType: ContentType = 'natural'
  ): Promise<CompareResult> {
    const formData = new FormData();
    formData.append('a', fileA);
    formData.append('b', fileB);
    if (model) formData.append('model', model);
    formData.append('content_type', contentType);
    if (aois.length > 0) formData.append('aois', JSON.stringify(aois));

    const res = await fetch(`${this.baseUrl}/v1/compare`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: formData,
    });
    if (!res.ok) {
      throw new Error(`Compare request failed: ${res.statusText}`);
    }
    return res.json();
  }

  async analyzeVideo(file: File | Blob, aois: Aoi[] = [], onProgress?: (pct: number) => void): Promise<VideoResult> {
    const formData = new FormData();
    for await (const sample of sampleVideoFrames(file)) {
      formData.append('frames[]', sample.frame);
      onProgress?.(sample.progress);
    }
    formData.append('model', 'unisal_video');
    if (aois.length > 0) formData.append('aois', JSON.stringify(aois));

    const res = await fetch(`${this.baseUrl}/v1/video`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: formData,
    });
    if (!res.ok) {
      throw new Error(`Video analyze failed: ${res.statusText}`);
    }
    const result: VideoResult = await res.json();
    onProgress?.(100);
    return result;
  }
}
