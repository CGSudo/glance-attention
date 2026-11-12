import { AnalyzeResult, Aoi, ContentType } from '../api/types';
import { Transport } from '../api/transport';
import { pngDataUrl } from '../api';

export interface ViewportSliceMeta {
  index: number;
  y: number;
  height: number;
  attentionPercent: number;
  clarity: number;
}

export interface FullPageAnalysisResult extends AnalyzeResult {
  isFullPage: true;
  originalWidth: number;
  originalHeight: number;
  slices: ViewportSliceMeta[];
}

export function isTallImage(width: number, height: number): boolean {
  return height > 2 * width;
}

/**
 * Loads an image from a blob/file to inspect natural dimensions.
 */
export function getImageDimensions(file: Blob): Promise<{ width: number; height: number; img: HTMLImageElement }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;
      URL.revokeObjectURL(url);
      resolve({ width, height, img });
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

/**
 * Slices a tall image into 16:10 viewport-height segments, runs inference per slice,
 * stitches heatmaps, and calculates attention drop-off per viewport.
 */
export async function analyzeFullPage(
  file: File | Blob,
  modelId: string,
  aois: Aoi[],
  contentType: ContentType,
  transport: Transport,
  onProgress?: (currentSlice: number, totalSlices: number) => void
): Promise<FullPageAnalysisResult> {
  const { width, height, img } = await getImageDimensions(file);

  // 16:10 aspect ratio of width (width / height = 16 / 10 -> height = width * 10 / 16)
  const segmentHeight = Math.max(100, Math.round(width * (10 / 16)));
  const totalSlices = Math.ceil(height / segmentHeight);

  const sliceBlobs: { blob: Blob; y: number; h: number }[] = [];

  for (let i = 0; i < totalSlices; i++) {
    const y = i * segmentHeight;
    const h = Math.min(segmentHeight, height - y);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, y, width, h, 0, 0, width, h);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Canvas export failed'))), 'image/png');
    });

    sliceBlobs.push({ blob, y, h });
  }

  // Run model on each slice
  const sliceResults: AnalyzeResult[] = [];
  for (let i = 0; i < sliceBlobs.length; i++) {
    onProgress?.(i + 1, totalSlices);
    const sliceRes = await transport.analyze(sliceBlobs[i].blob, modelId, [], contentType);
    sliceResults.push(sliceRes);
  }

  // Create full-size stitched canvases
  const stitchedHeatmapCanvas = document.createElement('canvas');
  stitchedHeatmapCanvas.width = width;
  stitchedHeatmapCanvas.height = height;
  const hmCtx = stitchedHeatmapCanvas.getContext('2d')!;

  const stitchedFogCanvas = document.createElement('canvas');
  stitchedFogCanvas.width = width;
  stitchedFogCanvas.height = height;
  const fogCtx = stitchedFogCanvas.getContext('2d')!;

  const stitchedOverlayCanvas = document.createElement('canvas');
  stitchedOverlayCanvas.width = width;
  stitchedOverlayCanvas.height = height;
  const ovCtx = stitchedOverlayCanvas.getContext('2d')!;

  // Helper to load image from data URL
  const loadImage = (src: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = reject;
      im.src = src;
    });

  // Stitch slices onto master canvases
  for (let i = 0; i < sliceBlobs.length; i++) {
    const { y, h } = sliceBlobs[i];
    const res = sliceResults[i];

    if (res.heatmap_png_b64) {
      const hmImg = await loadImage(pngDataUrl(res.heatmap_png_b64));
      hmCtx.drawImage(hmImg, 0, 0, hmImg.naturalWidth, hmImg.naturalHeight, 0, y, width, h);
    }
    if (res.fog_png_b64) {
      const fogImg = await loadImage(pngDataUrl(res.fog_png_b64));
      fogCtx.drawImage(fogImg, 0, 0, fogImg.naturalWidth, fogImg.naturalHeight, 0, y, width, h);
    }
    if (res.overlay_png_b64) {
      const ovImg = await loadImage(pngDataUrl(res.overlay_png_b64));
      ovCtx.drawImage(ovImg, 0, 0, ovImg.naturalWidth, ovImg.naturalHeight, 0, y, width, h);
    }
  }

  // Calculate attention per slice based on clarity and fixations
  const rawAttentions: number[] = sliceResults.map((res, i) => {
    // Slices near the top naturally command initial attention; clarity provides density weighting
    const foldFactor = 1 / (1 + i * 0.45);
    const score = (res.metrics.clarity || 50) * foldFactor;
    return Math.max(1, score);
  });

  const totalAttention = rawAttentions.reduce((a, b) => a + b, 0);
  const sliceMeta: ViewportSliceMeta[] = sliceBlobs.map((sb, i) => {
    const percent = Math.max(1, Math.round((rawAttentions[i] / totalAttention) * 100));
    return {
      index: i + 1,
      y: sb.y,
      height: sb.h,
      attentionPercent: percent,
      clarity: sliceResults[i].metrics.clarity,
    };
  });

  // Adjust percentages so sum is exactly 100%
  const currentSum = sliceMeta.reduce((s, m) => s + m.attentionPercent, 0);
  if (sliceMeta.length > 0 && currentSum !== 100) {
    sliceMeta[0].attentionPercent += 100 - currentSum;
  }

  // Stitch scanpath fixations (normalize coordinates relative to full height)
  const stitchedScanpath: AnalyzeResult['scanpath'] = [];
  let currentOrder = 1;
  for (let i = 0; i < sliceBlobs.length && currentOrder <= 7; i++) {
    const { y, h } = sliceBlobs[i];
    const res = sliceResults[i];
    for (const point of res.scanpath) {
      if (currentOrder > 7) break;
      const pixelY = y + (point.y / 100) * h;
      stitchedScanpath.push({
        order: currentOrder++,
        x: point.x,
        y: Number(((pixelY / height) * 100).toFixed(1)),
      });
    }
  }

  // Master base64 exports
  const heatmap_png_b64 = stitchedHeatmapCanvas.toDataURL('image/png').split(',')[1];
  const fog_png_b64 = stitchedFogCanvas.toDataURL('image/png').split(',')[1];
  const overlay_png_b64 = stitchedOverlayCanvas.toDataURL('image/png').split(',')[1];

  // Weighted average clarity
  const avgClarity = Number(
    (
      sliceResults.reduce((acc, r, i) => acc + r.metrics.clarity * (sliceMeta[i].attentionPercent / 100), 0)
    ).toFixed(1)
  );

  return {
    model: sliceResults[0]?.model || modelId,
    width,
    height,
    heatmap_png_b64,
    fog_png_b64,
    overlay_png_b64,
    scanpath: stitchedScanpath,
    metrics: {
      clarity: avgClarity,
      aoi_share: aois.map((aoi) => ({ id: aoi.id, share: 0 })),
      agreement: sliceResults[0]?.metrics.agreement,
    },
    isFullPage: true,
    originalWidth: width,
    originalHeight: height,
    slices: sliceMeta,
  };
}
