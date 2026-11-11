import React, { useState, useEffect, useCallback } from 'react';
import { Upload, GitCompare, Flame, CloudFog, Percent } from 'lucide-react';
import { Aoi, CompareResult, ContentType } from '../api/types';
import { getTransport, pngDataUrl } from '../api';
import { MetricsInfoPopover } from '../components/MetricsInfoPopover';

interface CompareProps {
  activeModelId: string;
  contentType: ContentType;
}

export const Compare: React.FC<CompareProps> = ({ activeModelId, contentType }) => {
  const [fileA, setFileA] = useState<File | null>(null);
  const [fileB, setFileB] = useState<File | null>(null);
  const [srcA, setSrcA] = useState<string>('');
  const [srcB, setSrcB] = useState<string>('');
  const [result, setResult] = useState<CompareResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Layer toggle
  const [activeLayer, setActiveLayer] = useState<'heatmap' | 'fog' | 'original'>('heatmap');

  const runComparison = useCallback(async (fA: File, fB: File) => {
    setIsLoading(true);
    setError(null);
    try {
      const sampleAois: Aoi[] = [
        { id: 'cta-primary', name: 'Primary CTA', x: 20, y: 35, width: 25, height: 15, color: '#14b8a6' },
      ];
      const transport = getTransport();
      const res = await transport.compare(fA, fB, activeModelId, sampleAois, contentType);
      setResult(res);
    } catch (err) {
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  }, [activeModelId, contentType]);

  const handleSelectA = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setFileA(f);
      setSrcA(URL.createObjectURL(f));
      if (fileB) runComparison(f, fileB);
    }
  };

  const handleSelectB = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setFileB(f);
      setSrcB(URL.createObjectURL(f));
      if (fileA) runComparison(fileA, f);
    }
  };

  const loadPresetComparison = useCallback(async () => {
    // Generate two sample canvases with different button placements
    const createPreset = (ctaX: number, ctaColor: string, titleText: string): Promise<File> => {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 640, 480);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(60, 80, 360, 28);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(60, 130, 240, 14);
      // CTA Button
      ctx.fillStyle = ctaColor;
      ctx.fillRect(ctaX, 180, 160, 44);
      // Hero image box
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(360, 160, 220, 220);
      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          resolve(new File([blob!], `${titleText}.png`, { type: 'image/png' }));
        });
      });
    };

    const [presetA, presetB] = await Promise.all([
      createPreset(60, '#0d9488', 'variant-a'),
      createPreset(240, '#f97316', 'variant-b'),
    ]);

    setFileA(presetA);
    setFileB(presetB);
    setSrcA(URL.createObjectURL(presetA));
    setSrcB(URL.createObjectURL(presetB));
    await runComparison(presetA, presetB);
  }, [runComparison]);

  useEffect(() => {
    loadPresetComparison();
  }, [loadPresetComparison]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-6 space-y-6">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs text-teal-400 font-medium mb-1">
            <GitCompare className="h-3.5 w-3.5" />
            <span>A/B Attention Comparison</span>
          </div>
          <h1 className="text-xl font-bold text-neutral-100">
            Compare Visual Variants
          </h1>
          <p className="text-xs text-neutral-400">
            Measure attention shift between two design iterations. See exact clarity delta and correlation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadPresetComparison}
            className="rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-200 px-3 py-1.5 text-xs font-medium transition-colors"
          >
            Load Sample A/B Test
          </button>

          {/* Layer switcher */}
          <div className="flex items-center rounded-md bg-neutral-900 border border-neutral-800 p-0.5 text-xs">
            <button
              onClick={() => setActiveLayer('heatmap')}
              className={`flex items-center gap-1 rounded px-2 py-1 ${
                activeLayer === 'heatmap' ? 'bg-teal-950 text-teal-300 font-medium' : 'text-neutral-400'
              }`}
            >
              <Flame className="h-3 w-3" />
              <span>Heatmap</span>
            </button>
            <button
              onClick={() => setActiveLayer('fog')}
              className={`flex items-center gap-1 rounded px-2 py-1 ${
                activeLayer === 'fog' ? 'bg-teal-950 text-teal-300 font-medium' : 'text-neutral-400'
              }`}
            >
              <CloudFog className="h-3 w-3" />
              <span>Fog</span>
            </button>
            <button
              onClick={() => setActiveLayer('original')}
              className={`rounded px-2 py-1 ${
                activeLayer === 'original' ? 'bg-teal-950 text-teal-300 font-medium' : 'text-neutral-400'
              }`}
            >
              Original
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded bg-red-950/80 border border-red-800 p-3 text-xs text-red-200">
          {error}
        </div>
      )}

      {/* Side-by-side images comparison view */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Variant A */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="rounded bg-teal-500/10 border border-teal-500/30 px-2 py-0.5 text-xs font-bold text-teal-300">
                Variant A
              </span>
              <span className="text-xs text-neutral-400">{fileA?.name || 'No file selected'}</span>
            </div>
            {result && (
              <span className="font-mono text-xs text-teal-400 font-semibold">
                Clarity: {result.a.metrics.clarity.toFixed(1)}
              </span>
            )}
          </div>

          <div className="relative aspect-4/3 w-full rounded-lg border border-neutral-800 bg-neutral-950 overflow-hidden flex items-center justify-center">
            {srcA ? (
              <img
                src={
                  activeLayer === 'heatmap'
                    ? (result ? pngDataUrl(result.a.overlay_png_b64) : srcA)
                    : activeLayer === 'fog'
                    ? (result ? pngDataUrl(result.a.fog_png_b64) : srcA)
                    : srcA
                }
                alt="Variant A"
                className="h-full w-full object-contain"
              />
            ) : (
              <label className="flex flex-col items-center justify-center p-6 text-center cursor-pointer hover:text-teal-400">
                <Upload className="h-8 w-8 text-neutral-600 mb-2" />
                <span className="text-xs font-semibold text-neutral-300">Upload Variant A</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleSelectA} />
              </label>
            )}
          </div>
        </div>

        {/* Variant B */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="rounded bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-xs font-bold text-amber-300">
                Variant B
              </span>
              <span className="text-xs text-neutral-400">{fileB?.name || 'No file selected'}</span>
            </div>
            {result && (
              <span className="font-mono text-xs text-amber-400 font-semibold">
                Clarity: {result.b.metrics.clarity.toFixed(1)}
              </span>
            )}
          </div>

          <div className="relative aspect-4/3 w-full rounded-lg border border-neutral-800 bg-neutral-950 overflow-hidden flex items-center justify-center">
            {srcB ? (
              <img
                src={
                  activeLayer === 'heatmap'
                    ? (result ? pngDataUrl(result.b.overlay_png_b64) : srcB)
                    : activeLayer === 'fog'
                    ? (result ? pngDataUrl(result.b.fog_png_b64) : srcB)
                    : srcB
                }
                alt="Variant B"
                className="h-full w-full object-contain"
              />
            ) : (
              <label className="flex flex-col items-center justify-center p-6 text-center cursor-pointer hover:text-amber-400">
                <Upload className="h-8 w-8 text-neutral-600 mb-2" />
                <span className="text-xs font-semibold text-neutral-300">Upload Variant B</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleSelectB} />
              </label>
            )}
          </div>
        </div>
      </div>

      {/* Delta Metrics Summary */}
      {isLoading ? (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-8 text-center text-xs text-teal-400">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-teal-500 border-t-transparent mx-auto mb-2" />
          <span>Computing comparative saliency and correlation...</span>
        </div>
      ) : result ? (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/80 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
            <h3 className="font-semibold text-sm text-neutral-100">Comparison Analytics</h3>
            <span className="text-[11px] text-neutral-400 font-mono">
              Correlation Coefficient CC: {result.cc.toFixed(3)}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Clarity Delta */}
            <div className="rounded-lg bg-neutral-950 p-3 border border-neutral-800 space-y-1">
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span>Clarity Delta (A vs B)</span>
                <MetricsInfoPopover
                  title="Clarity Delta"
                  formula="Clarity(A) - Clarity(B)"
                  source="Comparative entropy analysis."
                  explanation="Positive value indicates Variant A has a more concentrated visual focus; negative value indicates Variant B is more focused."
                />
              </div>
              <div
                className={`text-xl font-bold font-mono ${
                  result.delta.clarity >= 0 ? 'text-teal-400' : 'text-amber-400'
                }`}
              >
                {result.delta.clarity >= 0 ? `+${result.delta.clarity}` : result.delta.clarity}
              </div>
              <p className="text-[10px] text-neutral-400">
                {result.delta.clarity > 0
                  ? 'Variant A has cleaner hierarchy'
                  : 'Variant B has cleaner hierarchy'}
              </p>
            </div>

            {/* Heatmap Correlation (CC) */}
            <div className="rounded-lg bg-neutral-950 p-3 border border-neutral-800 space-y-1">
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span>Attention Similarity (CC)</span>
                <MetricsInfoPopover
                  title="Heatmap Correlation"
                  formula="CC(A, B) = cov(A, B) / (std(A) * std(B))"
                  source="Bylinskii et al. (2018)."
                  explanation="Measures how similarly users view both variants. 1.0 = identical attention patterns; 0.0 = completely independent visual flow."
                />
              </div>
              <div className="text-xl font-bold font-mono text-neutral-200">
                {result.cc.toFixed(3)}
              </div>
              <p className="text-[10px] text-neutral-400">
                {result.cc > 0.8
                  ? 'Very similar attention flow'
                  : result.cc > 0.5
                  ? 'Moderate attention redistribution'
                  : 'Substantial layout divergence'}
              </p>
            </div>

            {/* Top AOI Share Shift */}
            <div className="rounded-lg bg-neutral-950 p-3 border border-neutral-800 space-y-1">
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <div className="flex items-center gap-1">
                  <Percent className="h-3 w-3 text-teal-400" />
                  <span>Primary CTA Share</span>
                </div>
              </div>
              <div className="text-xl font-bold font-mono text-neutral-200">
                {result.delta.aoi_share[0]?.delta !== undefined
                  ? `${result.delta.aoi_share[0].delta >= 0 ? '+' : ''}${result.delta.aoi_share[0].delta}%`
                  : 'N/A'}
              </div>
              <p className="text-[10px] text-neutral-400">
                Attention shift on primary action element
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-neutral-800/80 bg-neutral-900/30 p-8 text-center text-xs text-neutral-400">
          Upload both variants or click &quot;Load Sample A/B Test&quot; above to see comparative metrics.
        </div>
      )}
    </div>
  );
};
