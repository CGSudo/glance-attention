import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { open } from '@tauri-apps/plugin-dialog';
import { Transport } from './transport';
import { Aoi, AnalyzeResult, CompareResult, Config, ContentType, InstallProgress, ModelInfo, SystemInfo, VideoResult } from './types';
import { sampleVideoFrames } from './video';

async function bytes(file: Blob): Promise<number[]> {
  if (file.size > 25 * 1024 * 1024) throw new Error('Image exceeds 25 MB upload limit');
  return Array.from(new Uint8Array(await file.arrayBuffer()));
}

export class TauriTransport implements Transport {
  getModels() { return invoke<ModelInfo[]>('list_models'); }
  getSystemInfo() { return invoke<SystemInfo>('system_info'); }
  getConfig() { return invoke<Config>('get_config'); }
  setConfig(config: Config) { return invoke<Config>('set_config', { config }); }

  async installModel(id: string, onProgress?: (progress: InstallProgress) => void) {
    const unlisten = await listen<InstallProgress>('model-install-progress', ({ payload }) => {
      if (payload.id === id) onProgress?.(payload);
    });
    try {
      return await invoke<{ ok: boolean }>('install_model', { id });
    } finally {
      unlisten();
    }
  }

  async importModel() {
    const path = await open({ title: 'Choose ONNX model', filters: [{ name: 'ONNX model', extensions: ['onnx'] }] });
    if (!path) return null;
    const metadataPath = await open({ title: 'Choose model JSON metadata', filters: [{ name: 'Model metadata', extensions: ['json'] }] });
    if (!metadataPath) return null;
    return invoke<{ ok: boolean }>('import_model', { path, metadataPath });
  }

  async analyze(file: Blob, model?: string, aois: Aoi[] = [], contentType: ContentType = 'natural', layers?: 'squint') {
    return invoke<AnalyzeResult>('analyze', { image: await bytes(file), model, aois, contentType, layers });
  }

  async compare(fileA: Blob, fileB: Blob, model?: string, aois: Aoi[] = [], contentType: ContentType = 'natural') {
    return invoke<CompareResult>('compare', { a: await bytes(fileA), b: await bytes(fileB), model, aois, contentType });
  }

  async analyzeVideo(file: Blob, aois: Aoi[] = [], onProgress?: (pct: number) => void): Promise<VideoResult> {
    const frames: number[][] = [];
    for await (const sample of sampleVideoFrames(file)) {
      frames.push(await bytes(sample.frame));
      onProgress?.(sample.progress);
    }
    const unlisten = await listen<number>('video-progress', ({ payload }) => onProgress?.(50 + payload / 2));
    try {
      return await invoke<VideoResult>('analyze_video_frames', { frames, model: 'unisal_video', aois });
    } finally {
      unlisten();
    }
  }
}
