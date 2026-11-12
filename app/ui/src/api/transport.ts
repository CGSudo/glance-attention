import { Aoi, AnalyzeResult, CompareResult, Config, ContentType, InstallProgress, ModelInfo, SystemInfo, VideoResult } from './types';

export interface Transport {
  getModels(): Promise<ModelInfo[]>;
  installModel(id: string, onProgress?: (progress: InstallProgress) => void): Promise<{ ok: boolean }>;
  importModel?(): Promise<{ ok: boolean } | null>;
  getSystemInfo(): Promise<SystemInfo>;
  getConfig(): Promise<Config>;
  setConfig(config: Config): Promise<Config>;
  analyze(file: File | Blob, model?: string, aois?: Aoi[], contentType?: ContentType, layers?: 'squint'): Promise<AnalyzeResult>;
  compare(fileA: File | Blob, fileB: File | Blob, model?: string, aois?: Aoi[], contentType?: ContentType): Promise<CompareResult>;
  analyzeVideo(file: File | Blob, aois?: Aoi[], onProgress?: (pct: number) => void): Promise<VideoResult>;
}

export function pngDataUrl(data: string): string {
  return data.startsWith('data:') ? data : `data:image/png;base64,${data}`;
}
