import React, { useState, useEffect, useCallback } from 'react';
import { GitCompare, Flame, CloudFog, RefreshCw } from 'lucide-react';
import { CompareResult, ContentType } from '../api/types';
import { getTransport, pngDataUrl } from '../api';
import { MetricsInfoPopover } from '../components/MetricsInfoPopover';
import { DesignUploader } from '../components/DesignUploader';
import {
  StoredRecentImage,
  getStoredRecentImages,
  saveRecentImage,
  deleteRecentImage,
  clearAllRecentImages,
} from '../utils/recentImages';
import { createSampleImageBlob, SampleType } from '../utils/samples';
import { clarityVerdict } from '../utils/compareVerdict';
import { HeatmapImage } from '../components/HeatmapImage';
import { ColorRampType } from '../utils/colorRamps';

interface CompareProps {
  activeModelId: string;
  contentType: ContentType;
  colorRamp: ColorRampType;
}

export const Compare: React.FC<CompareProps> = ({ activeModelId, contentType, colorRamp }) => {
  const [fileA, setFileA] = useState<File | null>(null);
  const [fileB, setFileB] = useState<File | null>(null);
  const [srcA, setSrcA] = useState<string>('');
  const [srcB, setSrcB] = useState<string>('');
  const [result, setResult] = useState<CompareResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Replace modes for Variant A & B
  const [isReplacingA, setIsReplacingA] = useState(false);
  const [isReplacingB, setIsReplacingB] = useState(false);

  // Recents state
  const [recentImages, setRecentImages] = useState<StoredRecentImage[]>([]);

  // Layer toggle
  const [activeLayer, setActiveLayer] = useState<'heatmap' | 'fog' | 'original'>('heatmap');

  useEffect(() => {
    getStoredRecentImages().then(setRecentImages);
  }, []);

  const runComparison = useCallback(
    async (fA: File, fB: File) => {
      setIsLoading(true);
      setError(null);
      try {
        const transport = getTransport();
        const res = await transport.compare(fA, fB, activeModelId, [], contentType);
        setResult(res);
      } catch (err) {
        setError(String(err));
      } finally {
        setIsLoading(false);
      }
    },
    [activeModelId, contentType]
  );

  const handleSelectA = (file: File) => {
    setFileA(file);
    setSrcA(URL.createObjectURL(file));
    setIsReplacingA(false);
    saveRecentImage(file).then((saved) => {
      if (saved) setRecentImages((prev) => [saved, ...prev.filter((p) => p.id !== saved.id)].slice(0, 12));
    });
    if (fileB) runComparison(file, fileB);
  };

  const handleSelectB = (file: File) => {
    setFileB(file);
    setSrcB(URL.createObjectURL(file));
    setIsReplacingB(false);
    saveRecentImage(file).then((saved) => {
      if (saved) setRecentImages((prev) => [saved, ...prev.filter((p) => p.id !== saved.id)].slice(0, 12));
    });
    if (fileA) runComparison(fileA, file);
  };

  const handleSampleA = async (type: SampleType) => {
    const f = await createSampleImageBlob(type);
    setFileA(f);
    setSrcA(URL.createObjectURL(f));
    setIsReplacingA(false);
    if (fileB) runComparison(f, fileB);
  };

  const handleSampleB = async (type: SampleType) => {
    const f = await createSampleImageBlob(type);
    setFileB(f);
    setSrcB(URL.createObjectURL(f));
    setIsReplacingB(false);
    if (fileA) runComparison(fileA, f);
  };

  const handleSelectRecentA = (item: StoredRecentImage) => {
    const f = new File([item.blob], item.name, { type: 'image/png' });
    setFileA(f);
    setSrcA(URL.createObjectURL(f));
    setIsReplacingA(false);
    if (fileB) runComparison(f, fileB);
  };

  const handleSelectRecentB = (item: StoredRecentImage) => {
    const f = new File([item.blob], item.name, { type: 'image/png' });
    setFileB(f);
    setSrcB(URL.createObjectURL(f));
    setIsReplacingB(false);
    if (fileA) runComparison(fileA, f);
  };

  const handleDeleteRecent = async (id: string) => {
    await deleteRecentImage(id);
    setRecentImages((prev) => prev.filter((p) => p.id !== id));
  };

  const handleClearRecents = async () => {
    await clearAllRecentImages();
    setRecentImages([]);
  };

  const loadPresetComparison = useCallback(async () => {
    const [presetA, presetB] = await Promise.all([
      createSampleImageBlob('hero'),
      createSampleImageBlob('hero-variant'),
    ]);

    setFileA(presetA);
    setFileB(presetB);
    setSrcA(URL.createObjectURL(presetA));
    setSrcB(URL.createObjectURL(presetB));
    setIsReplacingA(false);
    setIsReplacingB(false);
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
              type="button"
              onClick={() => setActiveLayer('heatmap')}
              aria-label="Show Heatmap"
              className={`flex items-center gap-1 rounded px-2.5 py-1 min-h-[44px] transition-colors ${
                activeLayer === 'heatmap' ? 'bg-teal-950 text-teal-300 font-medium' : 'text-neutral-400'
              }`}
            >
              <Flame className="h-3.5 w-3.5" />
              <span>Heatmap</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveLayer('fog')}
              aria-label="Hide low attention"
              className={`flex items-center gap-1 rounded px-2.5 py-1 min-h-[44px] transition-colors ${
                activeLayer === 'fog' ? 'bg-teal-950 text-teal-300 font-medium' : 'text-neutral-400'
              }`}
            >
              <CloudFog className="h-3.5 w-3.5" />
              <span>Hide low attention</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveLayer('original')}
              aria-label="Show Original"
              className={`rounded px-2.5 py-1 min-h-[44px] transition-colors ${
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
              <span className="text-xs text-neutral-400 truncate max-w-40">
                {fileA?.name || 'No file selected'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {result && (
                <span className="font-mono text-xs text-teal-400 font-semibold mr-1">
                  Clarity: {result.a.metrics.clarity.toFixed(1)}
                </span>
              )}
              {srcA && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setIsReplacingA(!isReplacingA)}
                    aria-label="New image for Variant A"
                    className="flex items-center gap-1 text-xs text-neutral-300 hover:text-teal-300 rounded px-2 py-1 border border-neutral-700 bg-neutral-800 min-h-[44px]"
                  >
                    <RefreshCw className="h-3 w-3" />
                    <span>{isReplacingA ? 'Cancel' : 'New image'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {!srcA || isReplacingA ? (
            <div className="rounded-lg border border-neutral-800 bg-neutral-950/70 p-3">
              <DesignUploader
                compact
                label="Select Variant A"
                sublabel="Drop, browse, paste, or select recent/sample"
                onSelectImage={handleSelectA}
                onSelectSample={handleSampleA}
                recentImages={recentImages}
                onSelectRecent={handleSelectRecentA}
                onDeleteRecent={handleDeleteRecent}
                onClearRecent={handleClearRecents}
              />
            </div>
          ) : (
            <div className="relative aspect-4/3 w-full rounded-lg border border-neutral-800 bg-neutral-950 overflow-hidden flex items-center justify-center">
              <img
                src={activeLayer === 'fog' && result ? pngDataUrl(result.a.fog_png_b64) : srcA}
                alt="Variant A"
                className="h-full w-full object-contain"
                draggable={false}
                onDragStart={(e) => e.preventDefault()}
              />
              {result && activeLayer === 'heatmap' && (
                <HeatmapImage
                  png={result.a.heatmap_png_b64}
                  colorRamp={colorRamp}
                  alt="Variant A Heatmap"
                  style={{ opacity: 0.7 }}
                  className="absolute inset-0 h-full w-full object-contain pointer-events-none"
                  draggable={false}
                  onDragStart={(e) => e.preventDefault()}
                />
              )}
              <button
                type="button"
                onClick={() => {
                  setSrcA('');
                  setFileA(null);
                  setResult(null);
                  setIsReplacingA(false);
                }}
                aria-label="Remove image"
                title="Remove image"
                className="absolute right-4 top-4 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-neutral-600 bg-neutral-900/95 text-sm text-white shadow hover:bg-red-950 hover:border-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 after:absolute after:left-1/2 after:top-1/2 after:h-11 after:w-11 after:-translate-x-1/2 after:-translate-y-1/2 after:content-['']"
              >
                <span aria-hidden="true">✕</span>
              </button>
            </div>
          )}
        </div>

        {/* Variant B */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="rounded bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-xs font-bold text-amber-300">
                Variant B
              </span>
              <span className="text-xs text-neutral-400 truncate max-w-40">
                {fileB?.name || 'No file selected'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {result && (
                <span className="font-mono text-xs text-amber-400 font-semibold mr-1">
                  Clarity: {result.b.metrics.clarity.toFixed(1)}
                </span>
              )}
              {srcB && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setIsReplacingB(!isReplacingB)}
                    aria-label="New image for Variant B"
                    className="flex items-center gap-1 text-xs text-neutral-300 hover:text-amber-300 rounded px-2 py-1 border border-neutral-700 bg-neutral-800 min-h-[44px]"
                  >
                    <RefreshCw className="h-3 w-3" />
                    <span>{isReplacingB ? 'Cancel' : 'New image'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {!srcB || isReplacingB ? (
            <div className="rounded-lg border border-neutral-800 bg-neutral-950/70 p-3">
              <DesignUploader
                compact
                label="Select Variant B"
                sublabel="Drop, browse, paste, or select recent/sample"
                onSelectImage={handleSelectB}
                onSelectSample={handleSampleB}
                recentImages={recentImages}
                onSelectRecent={handleSelectRecentB}
                onDeleteRecent={handleDeleteRecent}
                onClearRecent={handleClearRecents}
              />
            </div>
          ) : (
            <div className="relative aspect-4/3 w-full rounded-lg border border-neutral-800 bg-neutral-950 overflow-hidden flex items-center justify-center">
              <img
                src={activeLayer === 'fog' && result ? pngDataUrl(result.b.fog_png_b64) : srcB}
                alt="Variant B"
                className="h-full w-full object-contain"
                draggable={false}
                onDragStart={(e) => e.preventDefault()}
              />
              {result && activeLayer === 'heatmap' && (
                <HeatmapImage
                  png={result.b.heatmap_png_b64}
                  colorRamp={colorRamp}
                  alt="Variant B Heatmap"
                  style={{ opacity: 0.7 }}
                  className="absolute inset-0 h-full w-full object-contain pointer-events-none"
                  draggable={false}
                  onDragStart={(e) => e.preventDefault()}
                />
              )}
              <button
                type="button"
                onClick={() => {
                  setSrcB('');
                  setFileB(null);
                  setResult(null);
                  setIsReplacingB(false);
                }}
                aria-label="Remove image"
                title="Remove image"
                className="absolute right-4 top-4 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-neutral-600 bg-neutral-900/95 text-sm text-white shadow hover:bg-red-950 hover:border-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 after:absolute after:left-1/2 after:top-1/2 after:h-11 after:w-11 after:-translate-x-1/2 after:-translate-y-1/2 after:content-['']"
              >
                <span aria-hidden="true">✕</span>
              </button>
            </div>
          )}
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
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Clarity Delta */}
            <div className="rounded-lg bg-neutral-950 p-3 border border-neutral-800 space-y-1">
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span>Clarity Delta (B − A)</span>
                <MetricsInfoPopover
                  title="Clarity Delta"
                  formula="Clarity(B) - Clarity(A)"
                  source="Comparative entropy analysis."
                  explanation="Positive means Variant B has more concentrated attention; negative means Variant A. Zero means equal clarity."
                />
              </div>
              <div
                className={`text-xl font-bold font-mono ${
                  result.delta.clarity > 0 ? 'text-amber-400' : result.delta.clarity < 0 ? 'text-teal-400' : 'text-neutral-200'
                }`}
              >
                {result.delta.clarity >= 0 ? '+' : ''}{result.delta.clarity.toFixed(1)} points
              </div>
              <p className="text-[10px] text-neutral-400">
                {clarityVerdict(result.delta.clarity)}
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
                {result.cc.toFixed(2)}
              </div>
              <p className="text-[10px] text-neutral-400">
                {result.cc > 0.8
                  ? 'Very similar attention flow'
                  : result.cc > 0.5
                  ? 'Moderate attention redistribution'
                  : 'Substantial layout divergence'}
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
