export interface BenchmarkScores {
  dataset?: string;
  AUC: number | null;
  CC: number | null;
  NSS?: number | null;
  source?: string;
}

export interface ModelInputConfig {
  w: number;
  h: number;
  layout: string;
  mean: number[];
  std: number[];
}

export interface ModelInfo {
  id: string;
  name: string;
  tasks: ('image' | 'video' | 'scanpath')[];
  license: string;
  installed: boolean;
  size_mb?: number;
  citation?: string;
  source?: string;
  benchmark?: BenchmarkScores;
  input?: ModelInputConfig;
  output?: string;
  url?: string;
  sha256?: string;
  conditions?: string[];
  condition?: { name: string } | null;
}

export type ContentType = 'natural' | 'ecommerce' | 'ui';

export interface SystemInfo {
  provider: string;
  cpu: string;
  threads: number;
  gpu_name?: string;
  recommended_model: string;
}

export interface Config {
  default_model: string | null;
}

export interface InstallProgress {
  id: string;
  downloaded: number;
  total: number | null;
}

export interface Aoi {
  id: string;
  name: string;
  x: number; // percentage 0-100 or normalized 0-1 (we use percentage 0-100 for responsive canvas)
  y: number;
  width: number;
  height: number;
  color?: string;
}

export interface ScanpathPoint {
  x: number; // percentage 0-100
  y: number;
  order: number;
}

export interface AoiShare {
  id: string;
  share: number; // 0 - 100 percentage
}

export interface AgreementInfo {
  uncertainty_png_b64?: string;
  mean_cc?: number;
}

export interface Metrics {
  clarity: number; // 0 - 100
  aoi_share: AoiShare[];
  agreement?: AgreementInfo;
}

export interface AnalyzeResult {
  model: string;
  width: number;
  height: number;
  heatmap_png_b64: string;
  overlay_png_b64: string;
  fog_png_b64: string;
  squint_png_b64?: string;
  scanpath: ScanpathPoint[];
  metrics: Metrics;
}

export interface CompareDelta {
  clarity: number;
  aoi_share: { id: string; delta: number }[];
}

export interface CompareResult {
  a: AnalyzeResult;
  b: AnalyzeResult;
  delta: CompareDelta;
  cc: number;
}

export interface VideoFrameResult {
  t: number; // timestamp in seconds
  heatmap_png_b64: string;
  aoi_share: AoiShare[];
}

export interface VideoResult {
  fps: number;
  frames: VideoFrameResult[];
}
