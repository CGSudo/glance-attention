import { Transport } from './transport';
import {
  Aoi,
  AnalyzeResult,
  CompareResult,
  ModelInfo,
  ScanpathPoint,
  VideoResult,
  Config,
} from './types';
import { buildColorLookupTable } from '../utils/colorRamps';

const MOCK_MODELS: ModelInfo[] = [
  {
    id: 'sum',
    conditions: ['natural', 'ecommerce', 'ui'],
    name: 'SUM',
    tasks: ['image'],
    license: 'MIT',
    installed: true,
    size_mb: 28,
    citation: 'Hosseini et al., WACV 2025 (github Arhosseini77/SUM)',
    source: 'github.com/Arhosseini77/SUM',
    benchmark: {
      dataset: 'MIT300',
      AUC: null,
      CC: null,
      NSS: null,
      source: 'saliency.tuebingen.ai',
    },
    input: {
      w: 384,
      h: 384,
      layout: 'NCHW',
      mean: [0.485, 0.456, 0.406],
      std: [0.229, 0.224, 0.225],
    },
  },
  {
    id: 'transalnet',
    name: 'TranSalNet',
    tasks: ['image'],
    license: 'MIT',
    installed: true,
    size_mb: 42,
    citation: 'Lou et al., Neurocomputing 2022 (LJOVO/TranSalNet)',
    source: 'github.com/LJOVO/TranSalNet',
    benchmark: {
      dataset: 'MIT300',
      AUC: null,
      CC: null,
      NSS: null,
      source: 'saliency.tuebingen.ai',
    },
  },
  {
    id: 'unisal',
    name: 'UNISAL',
    tasks: ['image', 'video'],
    license: 'Apache-2.0',
    installed: true,
    size_mb: 16,
    citation: 'Droste, Jiao, Noble. Unified Image and Video Saliency Modeling. ECCV 2020. University of Oxford.',
    source: 'github.com/rdroste/unisal',
    benchmark: {
      dataset: 'MIT300',
      AUC: null,
      CC: null,
      NSS: null,
      source: 'saliency.tuebingen.ai',
    },
    input: {
      w: 384,
      h: 224,
      layout: 'NCHW',
      mean: [0.485, 0.456, 0.406],
      std: [0.229, 0.224, 0.225],
    },
  },
  {
    id: 'eyeformer',
    name: 'EyeFormer',
    tasks: ['scanpath'],
    license: 'User Import Only',
    installed: false,
    size_mb: 110,
    citation: 'Jiang et al., UIST 2024. Predicting UI Scanpaths using Transformers.',
    source: 'ACM UIST 2024',
    benchmark: {
      dataset: 'UEyes',
      AUC: null,
      CC: null,
      NSS: null,
      source: 'Paper reports sequence edit distance',
    },
  },
  {
    id: 'deepgaze-iie',
    name: 'DeepGaze IIE',
    tasks: ['image'],
    license: 'User Import Only',
    installed: false,
    size_mb: 145,
    citation: 'Linardos et al., ICCV 2021. DeepGaze IIE: Calibrated probabilistic models of human saliency.',
    source: 'bethgelab/deepgaze',
    benchmark: {
      dataset: 'Tübingen benchmark (dataset TODO-verify)',
      AUC: 0.8829,
      CC: 0.8242,
      NSS: 2.5265,
      source: 'saliency.tuebingen.ai',
    },
  },
];

let installedModelsState = [...MOCK_MODELS];

function loadImage(file: File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

interface SaliencyData {
  width: number;
  height: number;
  gridW: number;
  gridH: number;
  density: Float32Array; // gridW * gridH
  scanpath: ScanpathPoint[];
  clarity: number;
}

function computeSaliencyOnCanvas(img: HTMLImageElement): SaliencyData {
  const width = img.naturalWidth || img.width || 800;
  const height = img.naturalHeight || img.height || 600;

  // Use a 64x64 calculation grid for speed and exact clarity formula compatibility
  const gridW = 64;
  const gridH = 64;

  const offscreen = document.createElement('canvas');
  offscreen.width = gridW;
  offscreen.height = gridH;
  const ctx = offscreen.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Canvas 2D context unavailable');
  }

  ctx.drawImage(img, 0, 0, gridW, gridH);
  const imgData = ctx.getImageData(0, 0, gridW, gridH);
  const pixels = imgData.data;

  // Compute energy map: luminance contrast + edge magnitude + center prior
  const energy = new Float32Array(gridW * gridH);

  for (let y = 1; y < gridH - 1; y++) {
    for (let x = 1; x < gridW - 1; x++) {
      const idx = (y * gridW + x) * 4;
      const lum = 0.299 * pixels[idx] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2];

      const idxL = (y * gridW + (x - 1)) * 4;
      const lumL = 0.299 * pixels[idxL] + 0.587 * pixels[idxL + 1] + 0.114 * pixels[idxL + 2];
      const idxR = (y * gridW + (x + 1)) * 4;
      const lumR = 0.299 * pixels[idxR] + 0.587 * pixels[idxR + 1] + 0.114 * pixels[idxR + 2];
      const idxU = ((y - 1) * gridW + x) * 4;
      const lumU = 0.299 * pixels[idxU] + 0.587 * pixels[idxU + 1] + 0.114 * pixels[idxU + 2];
      const idxD = ((y + 1) * gridW + x) * 4;
      const lumD = 0.299 * pixels[idxD] + 0.587 * pixels[idxD + 1] + 0.114 * pixels[idxD + 2];

      // Sobel-like edge gradient
      const gx = lumR - lumL;
      const gy = lumD - lumU;
      const grad = Math.sqrt(gx * gx + gy * gy);

      // Contrast from local background + skin tone detector (faces)
      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];
      const isSkinLike = r > 60 && g > 40 && b > 20 && r > g && r > b && (r - g) > 15;
      const faceWeight = isSkinLike ? 1.4 : 1.0;

      // Center bias prior (Gaussian around (0.5, 0.45) - typical horizon bias)
      const nx = (x / gridW) - 0.5;
      const ny = (y / gridH) - 0.45;
      const centerPrior = Math.exp(-(nx * nx * 3.5 + ny * ny * 4.5));

      energy[y * gridW + x] = (grad * faceWeight + (lum > 200 ? 40 : 0)) * (0.6 + 0.4 * centerPrior);
    }
  }

  // Smooth energy with Gaussian kernel into final density
  const density = new Float32Array(gridW * gridH);
  const sigma = 3.5;
  const radius = Math.ceil(sigma * 2);

  for (let y = 0; y < gridH; y++) {
    for (let x = 0; x < gridW; x++) {
      let sum = 0;
      let wSum = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= gridH) continue;
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx;
          if (nx < 0 || nx >= gridW) continue;
          const distSq = dx * dx + dy * dy;
          const weight = Math.exp(-distSq / (2 * sigma * sigma));
          sum += energy[ny * gridW + nx] * weight;
          wSum += weight;
        }
      }
      density[y * gridW + x] = sum / (wSum || 1);
    }
  }

  // Normalize so density sums to 1.0 (probability of fixation)
  let totalMass = 0;
  for (let i = 0; i < density.length; i++) {
    totalMass += density[i];
  }
  if (totalMass === 0) totalMass = 1;
  for (let i = 0; i < density.length; i++) {
    density[i] /= totalMass;
  }

  // Compute clarity: 1 - H(heatmap)/log(N_pixels) on 64x64 downsample
  // H(P) = - sum(p * ln(p))
  let entropy = 0;
  for (let i = 0; i < density.length; i++) {
    const p = density[i];
    if (p > 1e-9) {
      entropy -= p * Math.log(p);
    }
  }
  const maxEntropy = Math.log(gridW * gridH); // ln(4096)
  const clarity = Math.max(0, Math.min(100, (1 - entropy / maxEntropy) * 100));

  // Compute scanpath: N=7 fixations with Inhibition-of-Return (IOR)
  // Gaussian suppression sigma = 4% of image width (~2.5 grid cells)
  const scanpath: ScanpathPoint[] = [];
  const iorMap = new Float32Array(density);
  const iorSigma = 2.5;
  const iorRadius = Math.ceil(iorSigma * 3);

  for (let order = 1; order <= 7; order++) {
    let maxVal = -1;
    let bestX = Math.floor(gridW / 2);
    let bestY = Math.floor(gridH / 2);

    for (let y = 2; y < gridH - 2; y++) {
      for (let x = 2; x < gridW - 2; x++) {
        const val = iorMap[y * gridW + x];
        if (val > maxVal) {
          maxVal = val;
          bestX = x;
          bestY = y;
        }
      }
    }

    scanpath.push({
      order,
      x: (bestX / gridW) * 100,
      y: (bestY / gridH) * 100,
    });

    // Inhibit surrounding region
    for (let dy = -iorRadius; dy <= iorRadius; dy++) {
      const ny = bestY + dy;
      if (ny < 0 || ny >= gridH) continue;
      for (let dx = -iorRadius; dx <= iorRadius; dx++) {
        const nx = bestX + dx;
        if (nx < 0 || nx >= gridW) continue;
        const dSq = dx * dx + dy * dy;
        const factor = 1 - Math.exp(-dSq / (2 * iorSigma * iorSigma));
        iorMap[ny * gridW + nx] *= factor;
      }
    }
  }

  return { width, height, gridW, gridH, density, scanpath, clarity };
}

function renderOutputs(
  img: HTMLImageElement,
  saliency: SaliencyData,
  aois: Aoi[] = []
): {
  heatmap_png_b64: string;
  overlay_png_b64: string;
  fog_png_b64: string;
  aoi_shares: { id: string; share: number }[];
  uncertainty_png_b64: string;
} {
  const { width, height, gridW, gridH, density } = saliency;

  // Find max density value for color mapping
  let maxDensity = 0;
  for (let i = 0; i < density.length; i++) {
    if (density[i] > maxDensity) maxDensity = density[i];
  }
  if (maxDensity === 0) maxDensity = 1;

  // Heatmap rendering canvas (scaled to max 960px for performance and crispness)
  const renderW = Math.min(width, 960);
  const renderH = Math.round((renderW / width) * height);

  const canvas = document.createElement('canvas');
  canvas.width = renderW;
  canvas.height = renderH;
  const ctx = canvas.getContext('2d')!;

  // 1. Draw smooth heatmap
  const gridCanvas = document.createElement('canvas');
  gridCanvas.width = gridW;
  gridCanvas.height = gridH;
  const gridCtx = gridCanvas.getContext('2d')!;
  const gridImgData = gridCtx.createImageData(gridW, gridH);
  const lut = buildColorLookupTable('inferno');

  for (let i = 0; i < density.length; i++) {
    const norm = Math.min(1, density[i] / maxDensity);
    const lutIdx = Math.floor(norm * 255);
    gridImgData.data[i * 4] = lut[lutIdx * 4];
    gridImgData.data[i * 4 + 1] = lut[lutIdx * 4 + 1];
    gridImgData.data[i * 4 + 2] = lut[lutIdx * 4 + 2];
    gridImgData.data[i * 4 + 3] = lut[lutIdx * 4 + 3];
  }
  gridCtx.putImageData(gridImgData, 0, 0);

  // Smooth upsample onto render canvas
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(gridCanvas, 0, 0, renderW, renderH);
  const heatmap_png_b64 = canvas.toDataURL('image/png');

  // 2. Draw overlay (image + heatmap blended)
  const overlayCanvas = document.createElement('canvas');
  overlayCanvas.width = renderW;
  overlayCanvas.height = renderH;
  const overlayCtx = overlayCanvas.getContext('2d')!;
  overlayCtx.drawImage(img, 0, 0, renderW, renderH);
  overlayCtx.globalAlpha = 0.72;
  overlayCtx.drawImage(canvas, 0, 0, renderW, renderH);
  overlayCtx.globalAlpha = 1.0;
  const overlay_png_b64 = overlayCanvas.toDataURL('image/png');

  // 3. Draw fog: image dimmed where heatmap < 25th percentile mass
  // Calculate P25 threshold
  const sorted = Array.from(density).sort((a, b) => a - b);
  const p25Val = sorted[Math.floor(sorted.length * 0.25)];

  const fogCanvas = document.createElement('canvas');
  fogCanvas.width = renderW;
  fogCanvas.height = renderH;
  const fogCtx = fogCanvas.getContext('2d')!;
  fogCtx.drawImage(img, 0, 0, renderW, renderH);

  // Create fog mask
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = gridW;
  maskCanvas.height = gridH;
  const maskCtx = maskCanvas.getContext('2d')!;
  const maskData = maskCtx.createImageData(gridW, gridH);

  for (let i = 0; i < density.length; i++) {
    const isFog = density[i] < p25Val;
    maskData.data[i * 4] = 0;
    maskData.data[i * 4 + 1] = 0;
    maskData.data[i * 4 + 2] = 0;
    maskData.data[i * 4 + 3] = isFog ? 200 : 0; // dim by ~80%
  }
  maskCtx.putImageData(maskData, 0, 0);

  fogCtx.imageSmoothingEnabled = true;
  fogCtx.drawImage(maskCanvas, 0, 0, renderW, renderH);
  const fog_png_b64 = fogCanvas.toDataURL('image/png');

  // 4. Uncertainty map (agreement std across models)
  const uncCanvas = document.createElement('canvas');
  uncCanvas.width = renderW;
  uncCanvas.height = renderH;
  const uncCtx = uncCanvas.getContext('2d')!;
  const uncGrid = document.createElement('canvas');
  uncGrid.width = gridW;
  uncGrid.height = gridH;
  const uncGridCtx = uncGrid.getContext('2d')!;
  const uncData = uncGridCtx.createImageData(gridW, gridH);

  for (let i = 0; i < density.length; i++) {
    // Model variance is highest along attention boundaries
    const val = density[i] / maxDensity;
    const boundaryVariance = Math.sin(val * Math.PI) * 0.45;
    const bByte = Math.round(boundaryVariance * 255);
    uncData.data[i * 4] = 40;
    uncData.data[i * 4 + 1] = 160;
    uncData.data[i * 4 + 2] = 160;
    uncData.data[i * 4 + 3] = bByte;
  }
  uncGridCtx.putImageData(uncData, 0, 0);
  uncCtx.drawImage(uncGrid, 0, 0, renderW, renderH);
  const uncertainty_png_b64 = uncCanvas.toDataURL('image/png');

  // 5. Calculate AOI shares
  // AOI coordinates are percentages (0-100)
  const aoi_shares = aois.map((aoi) => {
    const startX = Math.max(0, Math.floor((aoi.x / 100) * gridW));
    const endX = Math.min(gridW, Math.ceil(((aoi.x + aoi.width) / 100) * gridW));
    const startY = Math.max(0, Math.floor((aoi.y / 100) * gridH));
    const endY = Math.min(gridH, Math.ceil(((aoi.y + aoi.height) / 100) * gridH));

    let aoiMass = 0;
    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        aoiMass += density[y * gridW + x];
      }
    }
    const share = Math.round(aoiMass * 1000) / 10; // e.g. 24.8%
    return { id: aoi.id, share };
  });

  return {
    heatmap_png_b64,
    overlay_png_b64,
    fog_png_b64,
    aoi_shares,
    uncertainty_png_b64,
  };
}

export class MockTransport implements Transport {
  private config: Config = { default_model: null };

  async getSystemInfo() {
    return { provider: 'demo', cpu: 'Demo', threads: 1, recommended_model: 'unisal' };
  }

  async getConfig() { return this.config; }
  async setConfig(config: Config) { this.config = config; return config; }

  async getModels(): Promise<ModelInfo[]> {
    return Promise.resolve(installedModelsState);
  }

  async installModel(id: string): Promise<{ ok: boolean }> {
    installedModelsState = installedModelsState.map((m) =>
      m.id === id ? { ...m, installed: true } : m
    );
    return Promise.resolve({ ok: true });
  }

  async analyze(file: File | Blob, model = 'sum', aois: Aoi[] = []): Promise<AnalyzeResult> {
    const img = await loadImage(file);
    const saliency = computeSaliencyOnCanvas(img);
    const rendered = renderOutputs(img, saliency, aois);

    return {
      model,
      width: saliency.width,
      height: saliency.height,
      heatmap_png_b64: rendered.heatmap_png_b64,
      overlay_png_b64: rendered.overlay_png_b64,
      fog_png_b64: rendered.fog_png_b64,
      scanpath: saliency.scanpath,
      metrics: {
        clarity: Math.round(saliency.clarity * 10) / 10,
        aoi_share: rendered.aoi_shares,
        agreement: {
          uncertainty_png_b64: rendered.uncertainty_png_b64,
          mean_cc: 0.842,
        },
      },
    };
  }

  async compare(
    fileA: File | Blob,
    fileB: File | Blob,
    model = 'sum',
    aois: Aoi[] = []
  ): Promise<CompareResult> {
    const [resA, resB] = await Promise.all([
      this.analyze(fileA, model, aois),
      this.analyze(fileB, model, aois),
    ]);

    const clarityDelta = Math.round((resA.metrics.clarity - resB.metrics.clarity) * 10) / 10;
    const aoiDeltas = (aois || []).map((aoi) => {
      const shareA = resA.metrics.aoi_share.find((s) => s.id === aoi.id)?.share ?? 0;
      const shareB = resB.metrics.aoi_share.find((s) => s.id === aoi.id)?.share ?? 0;
      return {
        id: aoi.id,
        delta: Math.round((shareA - shareB) * 10) / 10,
      };
    });

    return {
      a: resA,
      b: resB,
      delta: {
        clarity: clarityDelta,
        aoi_share: aoiDeltas,
      },
      cc: 0.768, // sample realistic correlation coefficient
    };
  }

  async analyzeVideo(
    file: File | Blob,
    aois: Aoi[] = [],
    onProgress?: (pct: number) => void
  ): Promise<VideoResult> {
    const fps = 5;
    const frameCount = 15; // 3 seconds sample at 5 fps
    const frames = [];

    // Create a mock frame from file or canvas
    let img: HTMLImageElement;
    try {
      img = await loadImage(file);
    } catch {
      // If video file can't be loaded as image, create a dummy canvas image
      const dummyCanvas = document.createElement('canvas');
      dummyCanvas.width = 640;
      dummyCanvas.height = 360;
      const dCtx = dummyCanvas.getContext('2d')!;
      dCtx.fillStyle = '#1e293b';
      dCtx.fillRect(0, 0, 640, 360);
      dCtx.fillStyle = '#38bdf8';
      dCtx.fillRect(160, 90, 320, 180);
      const dataUrl = dummyCanvas.toDataURL('image/png');
      img = new Image();
      img.src = dataUrl;
      await new Promise((res) => { img.onload = res; });
    }

    const baseSaliency = computeSaliencyOnCanvas(img);

    for (let i = 0; i < frameCount; i++) {
      const t = Math.round((i / fps) * 100) / 100;
      if (onProgress) {
        onProgress(Math.round(((i + 1) / frameCount) * 100));
      }

      // Slightly perturb density for temporal video variation
      const temporalSaliency: SaliencyData = {
        ...baseSaliency,
        density: new Float32Array(baseSaliency.density),
      };
      const shift = Math.sin((i / frameCount) * Math.PI * 2) * 2;
      for (let y = 0; y < 64; y++) {
        for (let x = 0; x < 64; x++) {
          const origIdx = y * 64 + x;
          const targetX = Math.max(0, Math.min(63, Math.round(x + shift)));
          temporalSaliency.density[y * 64 + targetX] = baseSaliency.density[origIdx];
        }
      }

      const rendered = renderOutputs(img, temporalSaliency, aois);
      frames.push({
        t,
        heatmap_png_b64: rendered.heatmap_png_b64,
        aoi_share: rendered.aoi_shares,
      });
    }

    return { fps, frames };
  }
}
